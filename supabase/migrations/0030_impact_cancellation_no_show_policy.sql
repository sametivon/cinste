-- Impact V1: protect limited capacity with a 12-hour cancellation window and
-- rolling no-show joining restrictions. Organization-caused cancellations are
-- stored separately and never enter this count.

create or replace function public.student_join_impact_opportunity(p_opportunity_id uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_student uuid := auth.uid();
  v_opportunity public.impact_opportunities%rowtype;
  v_active_count integer;
  v_taken_count integer;
  v_no_show_count integer;
  v_last_no_show timestamptz;
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

  select count(*)::integer, max(resolved_at)
    into v_no_show_count, v_last_no_show
    from public.impact_participations
   where student_id = v_student
     and status = 'no_show'
     and resolved_at >= now() - interval '90 days';
  if v_no_show_count >= 2 and now() < v_last_no_show + (case when v_no_show_count >= 3 then interval '7 days' else interval '48 hours' end) then
    raise exception 'IMPACT_JOINING_RESTRICTED';
  end if;

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
    v_status := case when now() <= v_opportunity.starts_at - interval '12 hours' then 'cancelled' else 'late_cancelled' end;
  end if;
  update public.impact_participations set status = v_status, cancelled_at = now(), resolved_at = now(), resolution_actor_id = v_student, resolution_reason = 'Student cancellation', updated_at = now() where id = p_participation_id;
  insert into public.impact_audit_events(actor_id, target_type, target_id, organization_id, action, reason, snapshot)
  values (v_student, 'participation', p_participation_id, v_opportunity.organization_id, v_status::text, 'Student cancellation', '{}'::jsonb);
  return v_status;
end;
$$;

revoke execute on function public.student_join_impact_opportunity(uuid) from public, anon;
revoke execute on function public.student_cancel_impact_participation(uuid) from public, anon;
grant execute on function public.student_join_impact_opportunity(uuid) to authenticated;
grant execute on function public.student_cancel_impact_participation(uuid) to authenticated;
