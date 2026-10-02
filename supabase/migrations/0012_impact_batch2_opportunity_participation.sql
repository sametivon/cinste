-- CINSTE Impact Batch 2: opportunity and participation lifecycle.
-- Contribution verification, reciprocity settlement, and Core claim
-- integration remain intentionally out of scope.

drop policy if exists opportunities_public_read on public.impact_opportunities;
create policy opportunities_public_read on public.impact_opportunities
for select using (
  status = 'published'
  and exists (select 1 from public.organizations o where o.id = organization_id and o.status = 'active')
  and exists (select 1 from public.student_profiles s where s.user_id = auth.uid() and s.verification_status = 'verified')
);

create or replace function public.expire_impact_participations()
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_count integer := 0;
  v_participation_id uuid;
  v_organization_id uuid;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED'; end if;

  for v_participation_id in
    update public.impact_participations p
       set status = 'expired_incomplete',
           resolved_at = now(),
           resolution_actor_id = v_actor,
           resolution_reason = 'Flexible opportunity passed due_at without completion',
           updated_at = now()
      from public.impact_opportunities o
     where o.id = p.opportunity_id
       and o.mode = 'flexible_remote'
       and p.status = 'joined'
       and o.due_at <= now()
    returning p.id
  loop
    v_count := v_count + 1;
    select o.organization_id into v_organization_id
      from public.impact_participations p
      join public.impact_opportunities o on o.id = p.opportunity_id
     where p.id = v_participation_id;
    insert into public.impact_audit_events(actor_id, target_type, target_id, organization_id, action, reason, snapshot)
    values (v_actor, 'participation', v_participation_id, v_organization_id, 'expired_incomplete', 'Flexible opportunity passed due_at without completion', '{}'::jsonb);
  end loop;

  for v_participation_id in
    update public.impact_participations p
       set status = 'overdue',
           updated_at = now()
      from public.impact_opportunities o
     where o.id = p.opportunity_id
       and o.mode = 'scheduled'
       and p.status = 'joined'
       and o.ends_at + interval '72 hours' <= now()
    returning p.id
  loop
    v_count := v_count + 1;
    select o.organization_id into v_organization_id
      from public.impact_participations p
      join public.impact_opportunities o on o.id = p.opportunity_id
     where p.id = v_participation_id;
    insert into public.impact_audit_events(actor_id, target_type, target_id, organization_id, action, reason, snapshot)
    values (v_actor, 'participation', v_participation_id, v_organization_id, 'overdue', 'Scheduled participation was unresolved after 72 hours', '{}'::jsonb);
  end loop;

  return v_count;
end;
$$;

create or replace function public.organization_create_impact_opportunity(
  p_organization_id uuid,
  p_title text,
  p_description text,
  p_category public.impact_opportunity_category,
  p_mode public.impact_opportunity_mode,
  p_city text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_due_at timestamptz,
  p_expected_eligible_minutes integer,
  p_capacity integer
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_id uuid;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED'; end if;
  if coalesce(length(btrim(p_title)), 0) < 2 or length(p_title) > 200 then raise exception 'INVALID_OPPORTUNITY_TITLE'; end if;
  if coalesce(length(btrim(p_description)), 0) < 1 then raise exception 'INVALID_OPPORTUNITY_DESCRIPTION'; end if;
  if p_category is null or p_mode is null then raise exception 'INVALID_OPPORTUNITY_TYPE'; end if;
  if p_due_at is null or p_due_at <= now() then raise exception 'INVALID_OPPORTUNITY_DUE_AT'; end if;
  if p_expected_eligible_minutes is null or p_expected_eligible_minutes < 1 or p_expected_eligible_minutes > 1440 then raise exception 'INVALID_ELIGIBLE_MINUTES'; end if;
  if p_capacity is null or p_capacity < 1 or p_capacity > 100000 then raise exception 'INVALID_CAPACITY'; end if;
  if p_mode = 'scheduled' then
    if p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at or p_due_at < p_ends_at then raise exception 'INVALID_SCHEDULED_WINDOW'; end if;
  elsif p_starts_at is not null or p_ends_at is not null then
    raise exception 'FLEXIBLE_OPPORTUNITY_CANNOT_HAVE_SCHEDULE';
  end if;

  if p_organization_id is null or not public.is_organization_operator_for(p_organization_id) then raise exception 'ORGANIZATION_ACCESS_REQUIRED'; end if;

  insert into public.impact_opportunities(
    organization_id, title, description, category, mode, city,
    starts_at, ends_at, due_at, expected_eligible_minutes, capacity
  ) values (
    p_organization_id, btrim(p_title), btrim(p_description), p_category, p_mode,
    nullif(btrim(coalesce(p_city, '')), ''), p_starts_at, p_ends_at, p_due_at,
    p_expected_eligible_minutes, p_capacity
  ) returning id into v_id;

  insert into public.impact_audit_events(actor_id, target_type, target_id, organization_id, action, snapshot)
  values (v_actor, 'opportunity', v_id, p_organization_id, 'created', jsonb_build_object('status', 'draft'));
  return v_id;
end;
$$;

create or replace function public.organization_update_impact_opportunity(
  p_opportunity_id uuid,
  p_title text,
  p_description text,
  p_category public.impact_opportunity_category,
  p_mode public.impact_opportunity_mode,
  p_city text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_due_at timestamptz,
  p_expected_eligible_minutes integer,
  p_capacity integer
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_opportunity public.impact_opportunities%rowtype;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED'; end if;
  if coalesce(length(btrim(p_title)), 0) < 2 or length(p_title) > 200 then raise exception 'INVALID_OPPORTUNITY_TITLE'; end if;
  if coalesce(length(btrim(p_description)), 0) < 1 then raise exception 'INVALID_OPPORTUNITY_DESCRIPTION'; end if;
  if p_category is null or p_mode is null then raise exception 'INVALID_OPPORTUNITY_TYPE'; end if;
  if p_due_at is null or p_expected_eligible_minutes is null or p_expected_eligible_minutes < 1 or p_expected_eligible_minutes > 1440 then raise exception 'INVALID_OPPORTUNITY_TIMING'; end if;
  if p_capacity is null or p_capacity < 1 or p_capacity > 100000 then raise exception 'INVALID_CAPACITY'; end if;
  if p_mode = 'scheduled' then
    if p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at or p_due_at < p_ends_at then raise exception 'INVALID_SCHEDULED_WINDOW'; end if;
  elsif p_starts_at is not null or p_ends_at is not null then
    raise exception 'FLEXIBLE_OPPORTUNITY_CANNOT_HAVE_SCHEDULE';
  end if;

  select * into v_opportunity from public.impact_opportunities where id = p_opportunity_id for update;
  if not found then raise exception 'OPPORTUNITY_NOT_FOUND'; end if;
  if not public.is_organization_operator_for(v_opportunity.organization_id) then raise exception 'ORGANIZATION_ACCESS_REQUIRED'; end if;
  if v_opportunity.status <> 'draft' then raise exception 'ONLY_DRAFT_OPPORTUNITY_EDITABLE'; end if;

  update public.impact_opportunities set
    title = btrim(p_title), description = btrim(p_description), category = p_category,
    mode = p_mode, city = nullif(btrim(coalesce(p_city, '')), ''), starts_at = p_starts_at,
    ends_at = p_ends_at, due_at = p_due_at, expected_eligible_minutes = p_expected_eligible_minutes,
    capacity = p_capacity, updated_at = now()
  where id = p_opportunity_id;

  insert into public.impact_audit_events(actor_id, target_type, target_id, organization_id, action, snapshot)
  values (v_actor, 'opportunity', p_opportunity_id, v_opportunity.organization_id, 'updated', jsonb_build_object('status', 'draft'));
end;
$$;

create or replace function public.organization_publish_impact_opportunity(p_opportunity_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_opportunity public.impact_opportunities%rowtype;
  v_organization_status public.organization_status;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_opportunity from public.impact_opportunities where id = p_opportunity_id for update;
  if not found then raise exception 'OPPORTUNITY_NOT_FOUND'; end if;
  if not public.is_organization_operator_for(v_opportunity.organization_id) then raise exception 'ORGANIZATION_ACCESS_REQUIRED'; end if;
  if v_opportunity.status <> 'draft' then raise exception 'ONLY_DRAFT_OPPORTUNITY_PUBLISHABLE'; end if;
  select status into v_organization_status from public.organizations where id = v_opportunity.organization_id for key share;
  if v_organization_status <> 'active' then raise exception 'ORGANIZATION_NOT_ACTIVE'; end if;
  if v_opportunity.due_at <= now() then raise exception 'OPPORTUNITY_ALREADY_DUE'; end if;
  if v_opportunity.mode = 'scheduled' and v_opportunity.starts_at <= now() then raise exception 'SCHEDULED_OPPORTUNITY_ALREADY_STARTED'; end if;

  update public.impact_opportunities set status = 'published', published_at = now(), updated_at = now() where id = p_opportunity_id;
  insert into public.impact_audit_events(actor_id, target_type, target_id, organization_id, action, snapshot)
  values (v_actor, 'opportunity', p_opportunity_id, v_opportunity.organization_id, 'published', jsonb_build_object('status', 'published'));
end;
$$;

create or replace function public.organization_cancel_impact_opportunity(p_opportunity_id uuid, p_reason text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_opportunity public.impact_opportunities%rowtype;
  v_participation_id uuid;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED'; end if;
  if coalesce(length(btrim(p_reason)), 0) < 3 then raise exception 'REASON_REQUIRED'; end if;
  select * into v_opportunity from public.impact_opportunities where id = p_opportunity_id for update;
  if not found then raise exception 'OPPORTUNITY_NOT_FOUND'; end if;
  if not public.is_organization_operator_for(v_opportunity.organization_id) then raise exception 'ORGANIZATION_ACCESS_REQUIRED'; end if;
  if v_opportunity.status not in ('draft', 'published') then raise exception 'OPPORTUNITY_NOT_CANCELLABLE'; end if;
  if v_opportunity.mode = 'flexible_remote' and v_opportunity.due_at <= now() then raise exception 'OPPORTUNITY_ALREADY_DUE'; end if;
  if v_opportunity.mode = 'scheduled' and v_opportunity.starts_at <= now() then raise exception 'OPPORTUNITY_ALREADY_STARTED'; end if;

  update public.impact_opportunities set status = 'cancelled', cancelled_at = now(), cancellation_reason = btrim(p_reason), updated_at = now() where id = p_opportunity_id;
  for v_participation_id in
    update public.impact_participations
       set status = 'cancelled_by_organization', cancelled_at = now(), resolved_at = now(),
           resolution_actor_id = v_actor, resolution_reason = btrim(p_reason), updated_at = now()
     where opportunity_id = p_opportunity_id and status = 'joined'
    returning id
  loop
    insert into public.impact_audit_events(actor_id, target_type, target_id, organization_id, action, reason, snapshot)
    values (v_actor, 'participation', v_participation_id, v_opportunity.organization_id, 'cancelled_by_organization', btrim(p_reason), '{}'::jsonb);
  end loop;
  insert into public.impact_audit_events(actor_id, target_type, target_id, organization_id, action, reason, snapshot)
  values (v_actor, 'opportunity', p_opportunity_id, v_opportunity.organization_id, 'cancelled', btrim(p_reason), jsonb_build_object('status', 'cancelled'));
end;
$$;

create or replace function public.list_impact_opportunities(
  p_category public.impact_opportunity_category default null,
  p_city text default null
)
returns table(
  id uuid,
  organization_id uuid,
  organization_name text,
  title text,
  description text,
  category public.impact_opportunity_category,
  mode public.impact_opportunity_mode,
  city text,
  starts_at timestamptz,
  ends_at timestamptz,
  due_at timestamptz,
  expected_eligible_minutes integer,
  capacity integer,
  remaining_capacity integer
)
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (select 1 from public.student_profiles where user_id = auth.uid() and verification_status = 'verified') then raise exception 'STUDENT_NOT_VERIFIED'; end if;
  return query
  select o.id, o.organization_id, org.name, o.title, o.description, o.category, o.mode, o.city,
         o.starts_at, o.ends_at, o.due_at, o.expected_eligible_minutes, o.capacity,
         greatest(o.capacity - (select count(*)::integer from public.impact_participations p where p.opportunity_id = o.id and p.status = 'joined'), 0)
    from public.impact_opportunities o
    join public.organizations org on org.id = o.organization_id
   where o.status = 'published'
     and org.status = 'active'
     and o.due_at > now()
     and (p_category is null or o.category = p_category)
     and (p_city is null or o.city = p_city or (o.mode = 'flexible_remote' and o.city is null))
   order by o.due_at, o.starts_at nulls last, o.created_at;
end;
$$;

create or replace function public.student_join_impact_opportunity(p_opportunity_id uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_student uuid := auth.uid();
  v_opportunity public.impact_opportunities%rowtype;
  v_active_count integer;
  v_taken_count integer;
  v_participation_id uuid;
begin
  if v_student is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (select 1 from public.student_profiles where user_id = v_student and verification_status = 'verified') then raise exception 'STUDENT_NOT_VERIFIED'; end if;
  perform public.expire_impact_participations();
  perform pg_advisory_xact_lock(hashtext(v_student::text));
  select * into v_opportunity from public.impact_opportunities where id = p_opportunity_id for update;
  if not found or v_opportunity.status <> 'published' then raise exception 'OPPORTUNITY_UNAVAILABLE'; end if;
  if not exists (select 1 from public.organizations where id = v_opportunity.organization_id and status = 'active') then raise exception 'ORGANIZATION_NOT_ACTIVE'; end if;
  if v_opportunity.due_at <= now() then raise exception 'OPPORTUNITY_EXPIRED'; end if;
  if v_opportunity.mode = 'scheduled' and v_opportunity.starts_at <= now() then raise exception 'OPPORTUNITY_ALREADY_STARTED'; end if;

  select count(*) into v_active_count from public.impact_participations where student_id = v_student and status in ('joined', 'overdue');
  if v_active_count >= 2 then raise exception 'ACTIVE_PARTICIPATION_LIMIT_REACHED'; end if;
  select count(*) into v_taken_count from public.impact_participations where opportunity_id = p_opportunity_id and status = 'joined';
  if v_taken_count >= v_opportunity.capacity then raise exception 'OPPORTUNITY_FULL'; end if;
  if v_opportunity.mode = 'scheduled' and exists (
    select 1
      from public.impact_participations p
      join public.impact_opportunities existing on existing.id = p.opportunity_id
     where p.student_id = v_student
       and p.status in ('joined', 'overdue')
       and existing.mode = 'scheduled'
       and v_opportunity.starts_at < existing.ends_at
       and existing.starts_at < v_opportunity.ends_at
  ) then raise exception 'SCHEDULE_OVERLAP'; end if;

  insert into public.impact_participations(opportunity_id, student_id) values (p_opportunity_id, v_student) returning id into v_participation_id;
  insert into public.impact_audit_events(actor_id, target_type, target_id, organization_id, action, snapshot)
  values (v_student, 'participation', v_participation_id, v_opportunity.organization_id, 'joined', jsonb_build_object('opportunity_id', p_opportunity_id));
  return v_participation_id;
end;
$$;

create or replace function public.student_cancel_impact_participation(p_participation_id uuid)
returns public.impact_participation_status
language plpgsql security definer set search_path = public
as $$
declare
  v_student uuid := auth.uid();
  v_participation public.impact_participations%rowtype;
  v_opportunity public.impact_opportunities%rowtype;
  v_status public.impact_participation_status;
begin
  if v_student is null then raise exception 'AUTH_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtext(v_student::text));
  select * into v_participation from public.impact_participations where id = p_participation_id and student_id = v_student for update;
  if not found then raise exception 'PARTICIPATION_NOT_FOUND'; end if;
  if v_participation.status <> 'joined' then raise exception 'PARTICIPATION_NOT_CANCELLABLE'; end if;
  select * into v_opportunity from public.impact_opportunities where id = v_participation.opportunity_id for key share;
  if not found then raise exception 'OPPORTUNITY_NOT_FOUND'; end if;
  if v_opportunity.mode = 'flexible_remote' then
    if v_opportunity.due_at <= now() then raise exception 'OPPORTUNITY_ALREADY_DUE'; end if;
    v_status := 'cancelled';
  else
    if v_opportunity.starts_at <= now() then raise exception 'CANCELLATION_WINDOW_CLOSED'; end if;
    v_status := case when now() <= v_opportunity.starts_at - interval '4 hours' then 'cancelled' else 'late_cancelled' end;
  end if;
  update public.impact_participations set status = v_status, cancelled_at = now(), resolved_at = now(), resolution_actor_id = v_student, resolution_reason = 'Student cancellation', updated_at = now() where id = p_participation_id;
  insert into public.impact_audit_events(actor_id, target_type, target_id, organization_id, action, reason, snapshot)
  values (v_student, 'participation', p_participation_id, v_opportunity.organization_id, v_status::text, 'Student cancellation', '{}'::jsonb);
  return v_status;
end;
$$;

create or replace function public.organization_resolve_impact_participation(
  p_participation_id uuid,
  p_outcome public.impact_participation_status,
  p_reason text default null
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_participation public.impact_participations%rowtype;
  v_opportunity public.impact_opportunities%rowtype;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_outcome not in ('completed', 'no_show', 'excused') then raise exception 'INVALID_OPERATIONAL_OUTCOME'; end if;
  if p_outcome in ('no_show', 'excused') and coalesce(length(btrim(p_reason)), 0) < 3 then raise exception 'REASON_REQUIRED'; end if;
  select * into v_participation from public.impact_participations where id = p_participation_id for update;
  if not found then raise exception 'PARTICIPATION_NOT_FOUND'; end if;
  select * into v_opportunity from public.impact_opportunities where id = v_participation.opportunity_id for key share;
  if not found then raise exception 'OPPORTUNITY_NOT_FOUND'; end if;
  if not public.is_organization_operator_for(v_opportunity.organization_id) then raise exception 'ORGANIZATION_ACCESS_REQUIRED'; end if;
  perform public.expire_impact_participations();
  select * into v_participation from public.impact_participations where id = p_participation_id for update;
  if not found then raise exception 'PARTICIPATION_NOT_FOUND'; end if;
  if v_participation.status <> 'joined' then raise exception 'PARTICIPATION_NOT_RESOLVABLE'; end if;
  if v_opportunity.mode = 'flexible_remote' and p_outcome = 'no_show' then raise exception 'NO_SHOW_NOT_ALLOWED_FOR_FLEXIBLE'; end if;
  if v_opportunity.mode = 'scheduled' and now() < v_opportunity.ends_at then raise exception 'OPPORTUNITY_NOT_FINISHED'; end if;
  if v_opportunity.mode = 'flexible_remote' and v_opportunity.due_at <= now() then raise exception 'OPPORTUNITY_EXPIRED_INCOMPLETE'; end if;

  update public.impact_participations set status = p_outcome, resolved_at = now(), resolution_actor_id = v_actor, resolution_reason = nullif(btrim(coalesce(p_reason, '')), ''), updated_at = now() where id = p_participation_id;
  insert into public.impact_audit_events(actor_id, target_type, target_id, organization_id, action, reason, snapshot)
  values (v_actor, 'participation', p_participation_id, v_opportunity.organization_id, p_outcome::text, nullif(btrim(coalesce(p_reason, '')), ''), '{}'::jsonb);
end;
$$;

create or replace function public.student_dispute_impact_participation(p_participation_id uuid, p_reason text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_student uuid := auth.uid();
  v_participation public.impact_participations%rowtype;
  v_organization_id uuid;
begin
  if v_student is null then raise exception 'AUTH_REQUIRED'; end if;
  if coalesce(length(btrim(p_reason)), 0) < 3 then raise exception 'REASON_REQUIRED'; end if;
  select * into v_participation from public.impact_participations where id = p_participation_id and student_id = v_student for update;
  if not found then raise exception 'PARTICIPATION_NOT_FOUND'; end if;
  if v_participation.status not in ('no_show', 'late_cancelled', 'cancelled_by_organization', 'completed', 'excused') then raise exception 'PARTICIPATION_NOT_DISPUTABLE'; end if;
  select organization_id into v_organization_id from public.impact_opportunities where id = v_participation.opportunity_id;
  update public.impact_participations set status = 'disputed', disputed_at = now(), dispute_reason = btrim(p_reason), updated_at = now() where id = p_participation_id;
  insert into public.impact_audit_events(actor_id, target_type, target_id, organization_id, action, reason, snapshot)
  values (v_student, 'participation', p_participation_id, v_organization_id, 'disputed', btrim(p_reason), jsonb_build_object('previous_status', v_participation.status));
end;
$$;

revoke execute on function public.expire_impact_participations() from public, anon;
revoke execute on function public.organization_create_impact_opportunity(uuid, text, text, public.impact_opportunity_category, public.impact_opportunity_mode, text, timestamptz, timestamptz, timestamptz, integer, integer) from public, anon;
revoke execute on function public.organization_update_impact_opportunity(uuid, text, text, public.impact_opportunity_category, public.impact_opportunity_mode, text, timestamptz, timestamptz, timestamptz, integer, integer) from public, anon;
revoke execute on function public.organization_publish_impact_opportunity(uuid) from public, anon;
revoke execute on function public.organization_cancel_impact_opportunity(uuid, text) from public, anon;
revoke execute on function public.list_impact_opportunities(public.impact_opportunity_category, text) from public, anon;
revoke execute on function public.student_join_impact_opportunity(uuid) from public, anon;
revoke execute on function public.student_cancel_impact_participation(uuid) from public, anon;
revoke execute on function public.organization_resolve_impact_participation(uuid, public.impact_participation_status, text) from public, anon;
revoke execute on function public.student_dispute_impact_participation(uuid, text) from public, anon;
grant execute on function public.expire_impact_participations() to authenticated;
grant execute on function public.organization_create_impact_opportunity(uuid, text, text, public.impact_opportunity_category, public.impact_opportunity_mode, text, timestamptz, timestamptz, timestamptz, integer, integer) to authenticated;
grant execute on function public.organization_update_impact_opportunity(uuid, text, text, public.impact_opportunity_category, public.impact_opportunity_mode, text, timestamptz, timestamptz, timestamptz, integer, integer) to authenticated;
grant execute on function public.organization_publish_impact_opportunity(uuid) to authenticated;
grant execute on function public.organization_cancel_impact_opportunity(uuid, text) to authenticated;
grant execute on function public.list_impact_opportunities(public.impact_opportunity_category, text) to authenticated;
grant execute on function public.student_join_impact_opportunity(uuid) to authenticated;
grant execute on function public.student_cancel_impact_participation(uuid) to authenticated;
grant execute on function public.organization_resolve_impact_participation(uuid, public.impact_participation_status, text) to authenticated;
grant execute on function public.student_dispute_impact_participation(uuid, text) to authenticated;
