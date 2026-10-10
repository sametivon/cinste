-- Impact V1: separate organization-authoritative attendance from completion.
-- Completion remains the existing contribution-verification path.

create type public.impact_attendance_status as enum ('pending', 'attended', 'no_show', 'excused');

alter table public.impact_participations
  add column attendance_status public.impact_attendance_status not null default 'pending',
  add column attendance_at timestamptz,
  add column attendance_actor_id uuid references public.profiles(id),
  add column attendance_reason text;

update public.impact_participations
   set attendance_status = case status
     when 'completed' then 'attended'::public.impact_attendance_status
     when 'no_show' then 'no_show'::public.impact_attendance_status
     when 'excused' then 'excused'::public.impact_attendance_status
     else 'pending'::public.impact_attendance_status
   end,
   attendance_at = case when status in ('completed', 'no_show', 'excused') then coalesce(resolved_at, completed_at) end,
   attendance_actor_id = case when status in ('completed', 'no_show', 'excused') then resolution_actor_id end,
   attendance_reason = case when status in ('completed', 'no_show', 'excused') then resolution_reason end
 where attendance_status = 'pending';

create index impact_participations_opportunity_attendance
  on public.impact_participations(opportunity_id, attendance_status);

create or replace function public.prevent_impact_participation_provenance_mutation()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if (new.completed_at is distinct from old.completed_at
      or new.completion_due_cycle_number is distinct from old.completion_due_cycle_number)
     and current_setting('cinste.impact_trusted_completion', true) <> 'on' then
    raise exception 'COMPLETION_PROVENANCE_IMMUTABLE';
  end if;
  if (new.attendance_status is distinct from old.attendance_status
      or new.attendance_at is distinct from old.attendance_at
      or new.attendance_actor_id is distinct from old.attendance_actor_id
      or new.attendance_reason is distinct from old.attendance_reason)
     and current_setting('cinste.impact_trusted_attendance', true) <> 'on' then
    raise exception 'ATTENDANCE_PROVENANCE_IMMUTABLE';
  end if;
  return new;
end;
$$;

create or replace function public.organization_mark_impact_attendance(
  p_participation_id uuid,
  p_attendance public.impact_attendance_status,
  p_reason text default null
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_participation public.impact_participations%rowtype;
  v_opportunity public.impact_opportunities%rowtype;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_attendance = 'pending' then raise exception 'INVALID_ATTENDANCE_STATUS'; end if;
  if p_attendance in ('no_show', 'excused') and coalesce(length(v_reason), 0) < 3 then raise exception 'REASON_REQUIRED'; end if;

  select * into v_participation from public.impact_participations where id = p_participation_id for update;
  if not found then raise exception 'PARTICIPATION_NOT_FOUND'; end if;
  select * into v_opportunity from public.impact_opportunities where id = v_participation.opportunity_id for key share;
  if not found then raise exception 'OPPORTUNITY_NOT_FOUND'; end if;
  if not public.is_organization_operator_for(v_opportunity.organization_id) then raise exception 'ORGANIZATION_ACCESS_REQUIRED'; end if;

  perform public.expire_impact_participations();
  select * into v_participation from public.impact_participations where id = p_participation_id for update;
  select * into v_opportunity from public.impact_opportunities where id = v_participation.opportunity_id for key share;
  if v_participation.status <> 'joined' then raise exception 'PARTICIPATION_NOT_ATTENDANCE_MARKABLE'; end if;
  if v_participation.attendance_status <> 'pending' then raise exception 'ATTENDANCE_ALREADY_RECORDED'; end if;
  if v_opportunity.mode = 'scheduled' and (v_opportunity.ends_at is null or v_opportunity.ends_at > now()) then raise exception 'OPPORTUNITY_NOT_FINISHED'; end if;
  if v_opportunity.mode = 'flexible_remote' and p_attendance = 'no_show' then raise exception 'NO_SHOW_NOT_ALLOWED_FOR_FLEXIBLE'; end if;
  if v_opportunity.mode = 'flexible_remote' and p_attendance in ('attended', 'excused') and v_opportunity.due_at <= now() then raise exception 'OPPORTUNITY_EXPIRED_INCOMPLETE'; end if;

  perform set_config('cinste.impact_trusted_attendance', 'on', true);
  update public.impact_participations
     set attendance_status = p_attendance,
         attendance_at = now(),
         attendance_actor_id = v_actor,
         attendance_reason = v_reason,
         status = case when p_attendance = 'attended' then status else p_attendance::text::public.impact_participation_status end,
         resolved_at = case when p_attendance = 'attended' then resolved_at else now() end,
         resolution_actor_id = case when p_attendance = 'attended' then resolution_actor_id else v_actor end,
         resolution_reason = case when p_attendance = 'attended' then resolution_reason else v_reason end,
         updated_at = now()
   where id = p_participation_id;

  insert into public.impact_audit_events(actor_id, target_type, target_id, organization_id, action, reason, snapshot)
  values (v_actor, 'participation', p_participation_id, v_opportunity.organization_id,
          case when p_attendance = 'attended' then 'attended' else p_attendance::text end,
          v_reason,
          jsonb_build_object('attendance_status', p_attendance::text));
end;
$$;

create or replace function public.organization_verify_impact_participation(p_participation_id uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_attendance public.impact_attendance_status;
  v_status public.impact_participation_status;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED'; end if;
  select p.attendance_status, p.status into v_attendance, v_status
    from public.impact_participations p
    join public.impact_opportunities o on o.id = p.opportunity_id
   where p.id = p_participation_id
     and public.is_organization_operator_for(o.organization_id);
  if not found then raise exception 'ORGANIZATION_ACCESS_REQUIRED'; end if;
  if v_attendance = 'pending' and v_status = 'joined' then
    perform public.organization_mark_impact_attendance(p_participation_id, 'attended', 'Trusted completion verification');
  elsif v_attendance = 'pending' and v_status = 'completed' then
    perform set_config('cinste.impact_trusted_attendance', 'on', true);
    update public.impact_participations
       set attendance_status = 'attended', attendance_at = coalesce(completed_at, now()),
           attendance_actor_id = v_actor, attendance_reason = 'Trusted completion verification', updated_at = now()
     where id = p_participation_id;
    insert into public.impact_audit_events(actor_id, target_type, target_id, organization_id, action, reason, snapshot)
    select v_actor, 'participation', p.id, o.organization_id, 'attended', 'Trusted completion verification',
           jsonb_build_object('attendance_status', 'attended')
      from public.impact_participations p join public.impact_opportunities o on o.id = p.opportunity_id
     where p.id = p_participation_id;
  elsif v_attendance in ('no_show', 'excused') then
    raise exception 'PARTICIPATION_NOT_VERIFIABLE';
  end if;
  return public._impact_verify_participation(p_participation_id, v_actor);
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
begin
  if p_outcome = 'completed' then
    perform public.organization_verify_impact_participation(p_participation_id);
    return;
  end if;
  if p_outcome not in ('no_show', 'excused') then raise exception 'INVALID_OPERATIONAL_OUTCOME'; end if;
  perform public.organization_mark_impact_attendance(p_participation_id, p_outcome::text::public.impact_attendance_status, p_reason);
end;
$$;

revoke execute on function public.organization_mark_impact_attendance(uuid, public.impact_attendance_status, text) from public, anon;
grant execute on function public.organization_mark_impact_attendance(uuid, public.impact_attendance_status, text) to authenticated;
