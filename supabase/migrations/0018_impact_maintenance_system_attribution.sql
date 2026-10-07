-- Automated maintenance has an explicit system actor, never an invented user.
-- Existing audit rows and all existing human writers retain human attribution.
alter table public.impact_audit_events
  add column actor_kind text not null default 'human',
  alter column actor_id drop not null,
  add constraint impact_audit_actor_identity check (
    (actor_kind = 'human' and actor_id is not null)
    or (actor_kind = 'system' and actor_id is null
      and target_type = 'participation'
      and action in ('expired_incomplete', 'overdue'))
  );

create or replace function public.expire_impact_participations()
returns integer
language plpgsql security definer set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_kind text := case when v_actor is null then 'system' else 'human' end;
  v_count integer := 0;
  v_participation_id uuid;
  v_organization_id uuid;
begin
  -- EXECUTE privileges are the unattended boundary. Trusted owner-executed
  -- RPCs may still invoke this function with the original auth.uid().
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
    insert into public.impact_audit_events(actor_id, actor_kind, target_type, target_id, organization_id, action, reason, snapshot)
    values (v_actor, v_actor_kind, 'participation', v_participation_id, v_organization_id, 'expired_incomplete', 'Flexible opportunity passed due_at without completion', '{}'::jsonb);
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
    insert into public.impact_audit_events(actor_id, actor_kind, target_type, target_id, organization_id, action, reason, snapshot)
    values (v_actor, v_actor_kind, 'participation', v_participation_id, v_organization_id, 'overdue', 'Scheduled participation was unresolved after 72 hours', '{}'::jsonb);
  end loop;

  return v_count;
end;
$$;

alter function public.expire_impact_participations() owner to postgres;
revoke all on function public.expire_impact_participations() from public, anon, authenticated, service_role;
-- postgres owns both this function and the trusted nested callers.
-- No client or service-role grant is needed for database-local maintenance.
