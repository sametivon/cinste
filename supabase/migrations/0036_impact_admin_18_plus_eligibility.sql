-- Impact V1: Admin-controlled 18+ eligibility. The evidence remains private
-- to CINSTE; Organizations receive only the minimized eligibility label.

alter table public.student_profiles
  add column if not exists impact_18_plus_verified boolean not null default false,
  add column if not exists impact_18_plus_verified_at timestamptz,
  add column if not exists impact_18_plus_verified_by uuid references public.profiles(id);

alter table public.impact_audit_events
  drop constraint if exists impact_audit_events_target_type_check;
alter table public.impact_audit_events
  add constraint impact_audit_events_target_type_check check (
    target_type in ('organization', 'organization_user', 'opportunity', 'participation', 'contribution', 'reciprocity_state', 'incident', 'student_profile')
  );

create or replace function public.admin_set_student_impact_eligibility(
  p_student_id uuid,
  p_eligible boolean,
  p_reason text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null or not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if p_eligible is null then raise exception 'INVALID_ELIGIBILITY'; end if;
  if p_student_id is null or not exists (select 1 from public.student_profiles where user_id = p_student_id) then raise exception 'STUDENT_NOT_FOUND'; end if;
  if coalesce(length(btrim(p_reason)), 0) < 3 then raise exception 'REASON_REQUIRED'; end if;
  if p_eligible and not exists (select 1 from public.student_profiles where user_id = p_student_id and verification_status = 'verified') then raise exception 'STUDENT_NOT_VERIFIED'; end if;

  update public.student_profiles
     set impact_18_plus_verified = p_eligible,
         impact_18_plus_verified_at = case when p_eligible then now() else null end,
         impact_18_plus_verified_by = case when p_eligible then v_actor else null end,
         updated_at = now()
   where user_id = p_student_id;

  insert into public.impact_audit_events(actor_id, target_type, target_id, action, reason, snapshot)
  values (v_actor, 'student_profile', p_student_id,
          case when p_eligible then 'impact_18_plus_verified' else 'impact_18_plus_revoked' end,
          btrim(p_reason),
          jsonb_build_object('impact_18_plus_verified', p_eligible));
  return p_eligible;
end;
$$;

create or replace function public.list_organization_impact_participants(p_opportunity_ids uuid[])
returns table(
  participation_id uuid,
  opportunity_id uuid,
  participant_id uuid,
  participant_display_name text,
  eligibility_status text,
  participation_status public.impact_participation_status,
  attendance_status public.impact_attendance_status,
  joined_at timestamptz,
  resolved_at timestamptz,
  completed_at timestamptz,
  disputed_at timestamptz
)
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  return query
  select p.id, p.opportunity_id, p.student_id,
         case
           when strpos(trim(sp.full_name), ' ') > 0 then
             split_part(trim(sp.full_name), ' ', 1) || ' ' ||
             upper(left(regexp_replace(trim(sp.full_name), '^.*\s', ''), 1)) || '.'
           else trim(sp.full_name)
         end,
         case
           when sp.verification_status = 'verified' and sp.impact_18_plus_verified then 'verified_18_plus'
           when sp.verification_status = 'verified' then 'verified_student'
           else sp.verification_status::text
         end,
         p.status, p.attendance_status, p.joined_at, p.resolved_at, p.completed_at, p.disputed_at
    from public.impact_participations p
    join public.impact_opportunities o on o.id = p.opportunity_id
    join public.student_profiles sp on sp.user_id = p.student_id
   where p.opportunity_id = any(coalesce(p_opportunity_ids, '{}'::uuid[]))
     and public.is_organization_operator_for(o.organization_id)
   order by p.joined_at desc;
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
  v_no_show_count integer;
  v_last_no_show timestamptz;
  v_participation_id uuid;
begin
  if v_student is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (select 1 from public.student_profiles where user_id = v_student and verification_status = 'verified') then raise exception 'STUDENT_NOT_VERIFIED'; end if;
  if not exists (select 1 from public.student_profiles where user_id = v_student and impact_18_plus_verified) then raise exception 'STUDENT_IMPACT_18_PLUS_REQUIRED'; end if;
  perform public.expire_impact_participations();
  perform pg_advisory_xact_lock(hashtext(v_student::text));
  select * into v_opportunity from public.impact_opportunities where id = p_opportunity_id for update;
  if not found or v_opportunity.status <> 'published' then raise exception 'OPPORTUNITY_UNAVAILABLE'; end if;
  if exists (select 1 from public.impact_contributions where student_id = v_student and opportunity_id = p_opportunity_id) then raise exception 'OPPORTUNITY_CONTRIBUTION_ALREADY_EARNED'; end if;
  if not exists (select 1 from public.organizations where id = v_opportunity.organization_id and status = 'active') then raise exception 'ORGANIZATION_NOT_ACTIVE'; end if;
  if v_opportunity.due_at <= now() then raise exception 'OPPORTUNITY_EXPIRED'; end if;
  if v_opportunity.mode = 'scheduled' and v_opportunity.starts_at <= now() then raise exception 'OPPORTUNITY_ALREADY_STARTED'; end if;
  select count(*)::integer, max(resolved_at) into v_no_show_count, v_last_no_show
    from public.impact_participations
   where student_id = v_student and status = 'no_show' and resolved_at >= now() - interval '90 days';
  if v_no_show_count >= 2 and now() < v_last_no_show + (case when v_no_show_count >= 3 then interval '7 days' else interval '48 hours' end) then raise exception 'IMPACT_JOINING_RESTRICTED'; end if;
  select count(*) into v_active_count from public.impact_participations where student_id = v_student and status in ('joined', 'overdue');
  if v_active_count >= 2 then raise exception 'ACTIVE_PARTICIPATION_LIMIT_REACHED'; end if;
  select count(*) into v_taken_count from public.impact_participations where opportunity_id = p_opportunity_id and status = 'joined';
  if v_taken_count >= v_opportunity.capacity then raise exception 'OPPORTUNITY_FULL'; end if;
  if v_opportunity.mode = 'scheduled' and exists (select 1 from public.impact_participations p join public.impact_opportunities o on o.id = p.opportunity_id where p.student_id = v_student and p.status = 'joined' and o.mode = 'scheduled' and o.starts_at < v_opportunity.ends_at and o.ends_at > v_opportunity.starts_at) then raise exception 'SCHEDULE_CONFLICT'; end if;
  insert into public.impact_participations(opportunity_id, student_id) values (p_opportunity_id, v_student) returning id into v_participation_id;
  insert into public.impact_audit_events(actor_id, target_type, target_id, organization_id, action, snapshot) values (v_student, 'participation', v_participation_id, v_opportunity.organization_id, 'joined', jsonb_build_object('opportunity_id', p_opportunity_id));
  return v_participation_id;
end;
$$;

revoke execute on function public.admin_set_student_impact_eligibility(uuid, boolean, text) from public, anon;
grant execute on function public.admin_set_student_impact_eligibility(uuid, boolean, text) to authenticated;
revoke execute on function public.student_join_impact_opportunity(uuid) from public, anon;
grant execute on function public.student_join_impact_opportunity(uuid) to authenticated;
