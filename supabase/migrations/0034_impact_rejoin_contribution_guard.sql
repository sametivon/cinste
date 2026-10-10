-- Impact V1: preserve the existing one-contribution-per-opportunity guard
-- after the cancellation/no-show join RPC replacement.

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
  if v_opportunity.mode = 'scheduled' and exists (
    select 1 from public.impact_participations p
    join public.impact_opportunities existing on existing.id = p.opportunity_id
    where p.student_id = v_student and p.status in ('joined', 'overdue')
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

revoke execute on function public.student_join_impact_opportunity(uuid) from public, anon;
grant execute on function public.student_join_impact_opportunity(uuid) to authenticated;
