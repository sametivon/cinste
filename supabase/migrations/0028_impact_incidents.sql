-- Impact V1: simple participation incident reporting and Admin review.

create type public.impact_incident_severity as enum ('low', 'medium', 'serious');
create type public.impact_incident_status as enum ('open', 'reviewing', 'resolved', 'dismissed');

create table public.impact_incidents (
  id uuid primary key default gen_random_uuid(),
  participation_id uuid not null references public.impact_participations(id),
  opportunity_id uuid not null references public.impact_opportunities(id),
  reporter_id uuid not null references public.profiles(id),
  category text not null check (category in ('safety_concern', 'harassment', 'inappropriate_behavior', 'injury', 'organization_issue', 'student_issue', 'other')),
  severity public.impact_incident_severity not null default 'medium',
  description text not null check (length(btrim(description)) between 3 and 4000),
  status public.impact_incident_status not null default 'open',
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index impact_incidents_participation_created on public.impact_incidents(participation_id, created_at desc);
create index impact_incidents_status_created on public.impact_incidents(status, created_at desc);

alter table public.impact_audit_events
  drop constraint if exists impact_audit_events_target_type_check;
alter table public.impact_audit_events
  add constraint impact_audit_events_target_type_check
  check (target_type in ('organization', 'organization_user', 'opportunity', 'participation', 'contribution', 'reciprocity_state', 'incident'));

alter table public.impact_incidents enable row level security;
create policy impact_incidents_student_read on public.impact_incidents for select using (exists (select 1 from public.impact_participations p where p.id = participation_id and p.student_id = auth.uid()));
create policy impact_incidents_operator_read on public.impact_incidents for select using (public.is_organization_operator_for((select o.organization_id from public.impact_opportunities o where o.id = opportunity_id)));
create policy impact_incidents_admin_read on public.impact_incidents for select using (public.is_admin());
revoke all on public.impact_incidents from anon, authenticated;
grant select on public.impact_incidents to authenticated;

create or replace function public.report_impact_incident(
  p_participation_id uuid,
  p_category text,
  p_severity public.impact_incident_severity,
  p_description text
)
returns uuid language plpgsql security definer set search_path = public
as $$
declare v_actor uuid := auth.uid(); v_participation public.impact_participations%rowtype; v_opportunity public.impact_opportunities%rowtype; v_id uuid;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_participation from public.impact_participations where id = p_participation_id;
  if not found then raise exception 'PARTICIPATION_NOT_FOUND'; end if;
  select * into v_opportunity from public.impact_opportunities where id = v_participation.opportunity_id;
  if not found then raise exception 'OPPORTUNITY_NOT_FOUND'; end if;
  if v_actor <> v_participation.student_id and not public.is_organization_operator_for(v_opportunity.organization_id) then raise exception 'IMPACT_INCIDENT_ACCESS_REQUIRED'; end if;
  insert into public.impact_incidents(participation_id, opportunity_id, reporter_id, category, severity, description)
  values (p_participation_id, v_opportunity.id, v_actor, p_category, p_severity, btrim(p_description)) returning id into v_id;
  insert into public.impact_audit_events(actor_id, target_type, target_id, organization_id, action, snapshot)
  values (v_actor, 'incident', v_id, v_opportunity.organization_id, 'reported', jsonb_build_object('participation_id', p_participation_id, 'category', p_category, 'severity', p_severity::text));
  return v_id;
end;
$$;

create or replace function public.admin_review_impact_incident(
  p_incident_id uuid,
  p_status public.impact_incident_status,
  p_resolution_note text default null
)
returns void language plpgsql security definer set search_path = public
as $$
declare v_actor uuid := auth.uid(); v_incident public.impact_incidents%rowtype; v_note text := nullif(btrim(coalesce(p_resolution_note, '')), ''); v_org uuid;
begin
  if v_actor is null or not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if p_status in ('resolved', 'dismissed') and coalesce(length(v_note), 0) < 3 then raise exception 'REASON_REQUIRED'; end if;
  select * into v_incident from public.impact_incidents where id = p_incident_id for update;
  if not found then raise exception 'IMPACT_INCIDENT_NOT_FOUND'; end if;
  select organization_id into v_org from public.impact_opportunities where id = v_incident.opportunity_id;
  update public.impact_incidents set status = p_status, reviewed_by = v_actor, reviewed_at = now(), resolution_note = v_note, updated_at = now() where id = p_incident_id;
  insert into public.impact_audit_events(actor_id, target_type, target_id, organization_id, action, reason, snapshot)
  values (v_actor, 'incident', p_incident_id, v_org, p_status::text, v_note, jsonb_build_object('status', p_status::text));
end;
$$;

revoke execute on function public.report_impact_incident(uuid, text, public.impact_incident_severity, text), public.admin_review_impact_incident(uuid, public.impact_incident_status, text) from public, anon;
grant execute on function public.report_impact_incident(uuid, text, public.impact_incident_severity, text), public.admin_review_impact_incident(uuid, public.impact_incident_status, text) to authenticated;
