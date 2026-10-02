-- CINSTE Impact Batch 3: trusted contribution verification and reciprocity.
-- This migration is additive. Migrations 0011 and 0012 are already hosted
-- history and must not be rewritten.

alter table public.impact_participations
  add column if not exists completed_at timestamptz,
  add column if not exists completion_due_cycle_number integer;

alter table public.impact_participations
  drop constraint if exists impact_participations_completion_cycle_check;
alter table public.impact_participations
  add constraint impact_participations_completion_cycle_check
  check (completion_due_cycle_number is null or completion_due_cycle_number > 0);

alter table public.impact_contributions
  add column if not exists opportunity_id uuid;

update public.impact_contributions c
   set opportunity_id = p.opportunity_id
  from public.impact_participations p
 where p.id = c.participation_id
   and c.opportunity_id is null;

alter table public.impact_contributions
  alter column opportunity_id set not null;

alter table public.impact_contributions
  drop constraint if exists impact_contributions_opportunity_id_fkey;
alter table public.impact_contributions
  add constraint impact_contributions_opportunity_id_fkey
  foreign key (opportunity_id) references public.impact_opportunities(id);

alter table public.impact_contributions
  drop constraint if exists impact_contributions_verifier_not_student;
alter table public.impact_contributions
  add constraint impact_contributions_verifier_not_student
  check (verifier_id <> student_id);

create unique index if not exists impact_contributions_one_student_opportunity
  on public.impact_contributions(student_id, opportunity_id);

create table if not exists public.impact_reciprocity_settlements (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.student_profiles(user_id),
  cycle_number integer not null check (cycle_number > 0),
  settlement_type text not null check (settlement_type in ('contribution', 'admin_waiver')),
  contribution_id uuid references public.impact_contributions(id),
  actor_id uuid not null references public.profiles(id),
  reason text,
  settled_at timestamptz not null default now(),
  check (
    (settlement_type = 'contribution' and contribution_id is not null and reason is null)
    or
    (settlement_type = 'admin_waiver' and contribution_id is null and length(btrim(coalesce(reason, ''))) >= 3)
  )
);

create unique index if not exists impact_reciprocity_settlements_student_cycle
  on public.impact_reciprocity_settlements(student_id, cycle_number);
create unique index if not exists impact_reciprocity_settlements_contribution
  on public.impact_reciprocity_settlements(contribution_id)
 where contribution_id is not null;
create index if not exists impact_reciprocity_settlements_student_created
  on public.impact_reciprocity_settlements(student_id, settled_at desc);

create or replace function public.validate_impact_settlement()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.settlement_type = 'contribution' and not exists (
    select 1 from public.impact_contributions c
    where c.id = new.contribution_id and c.student_id = new.student_id and c.revoked_at is null
  ) then
    raise exception 'SETTLEMENT_CONTRIBUTION_SCOPE_MISMATCH';
  end if;
  return new;
end;
$$;

create trigger validate_impact_settlement_before_insert
before insert on public.impact_reciprocity_settlements
for each row execute function public.validate_impact_settlement();

alter table public.impact_reciprocity_settlements enable row level security;
create policy reciprocity_settlements_student_read on public.impact_reciprocity_settlements
for select using (student_id = auth.uid() or public.is_admin());

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
  return new;
end;
$$;

drop trigger if exists prevent_impact_participation_provenance_mutation on public.impact_participations;
create trigger prevent_impact_participation_provenance_mutation
before update on public.impact_participations
for each row execute function public.prevent_impact_participation_provenance_mutation();

create or replace function public.validate_impact_contribution()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_participation public.impact_participations%rowtype;
  v_opportunity public.impact_opportunities%rowtype;
begin
  if tg_op = 'UPDATE' then
    if old.participation_id is distinct from new.participation_id
       or old.student_id is distinct from new.student_id
       or old.organization_id is distinct from new.organization_id
       or old.opportunity_id is distinct from new.opportunity_id
       or old.verified_minutes is distinct from new.verified_minutes
       or old.verified_at is distinct from new.verified_at
       or old.verifier_id is distinct from new.verifier_id
       or old.created_at is distinct from new.created_at then
      raise exception 'CONTRIBUTION_IDENTITY_IMMUTABLE';
    end if;
    if old.revoked_at is not null then
      raise exception 'CONTRIBUTION_ALREADY_REVOKED';
    end if;
    if new.revoked_at is null
       or new.revoked_by is null
       or coalesce(length(btrim(new.revocation_reason)), 0) < 3
       or new.revoked_at < old.verified_at then
      raise exception 'INVALID_CONTRIBUTION_REVOCATION';
    end if;
    return new;
  end if;

  select * into v_participation
    from public.impact_participations
   where id = new.participation_id;
  if not found or v_participation.status <> 'completed' or v_participation.completed_at is null then
    raise exception 'PARTICIPATION_NOT_TRUSTED_COMPLETED';
  end if;
  select * into v_opportunity
    from public.impact_opportunities
   where id = v_participation.opportunity_id;
  if not found then raise exception 'OPPORTUNITY_NOT_FOUND'; end if;
  if new.opportunity_id is distinct from v_opportunity.id
     or new.student_id is distinct from v_participation.student_id
     or new.organization_id is distinct from v_opportunity.organization_id then
    raise exception 'CONTRIBUTION_SCOPE_MISMATCH';
  end if;
  if new.verifier_id = new.student_id then raise exception 'SELF_VERIFICATION_FORBIDDEN'; end if;
  if new.verified_minutes <> v_opportunity.expected_eligible_minutes then
    raise exception 'EXPECTED_MINUTES_REQUIRED';
  end if;
  if new.revoked_at is not null or new.revoked_by is not null or new.revocation_reason is not null then
    raise exception 'CONTRIBUTION_CANNOT_START_REVOKED';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_impact_contribution_before_write on public.impact_contributions;
create trigger validate_impact_contribution_before_write
before insert or update on public.impact_contributions
for each row execute function public.validate_impact_contribution();

create or replace function public.prevent_impact_settlement_history_mutation()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  raise exception 'IMPACT_SETTLEMENT_HISTORY_IMMUTABLE';
end;
$$;

drop trigger if exists prevent_impact_settlement_history_mutation on public.impact_reciprocity_settlements;
create trigger prevent_impact_settlement_history_mutation
before update or delete on public.impact_reciprocity_settlements
for each row execute function public.prevent_impact_settlement_history_mutation();

create or replace function public.prevent_impact_audit_mutation()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  raise exception 'IMPACT_AUDIT_HISTORY_IMMUTABLE';
end;
$$;

drop trigger if exists prevent_impact_audit_mutation on public.impact_audit_events;
create trigger prevent_impact_audit_mutation
before update or delete on public.impact_audit_events
for each row execute function public.prevent_impact_audit_mutation();

create or replace function public._impact_lock_organization_context(p_organization_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  perform 1 from public.organizations where id = p_organization_id for update;
  if not found then raise exception 'ORGANIZATION_NOT_FOUND'; end if;
  perform 1 from public.organization_users where organization_id = p_organization_id for update;
end;
$$;

create or replace function public._impact_settle_reciprocity(
  p_student_id uuid,
  p_contribution_id uuid,
  p_actor_id uuid,
  p_completion_at timestamptz,
  p_reason text default null
)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_state public.impact_reciprocity_state%rowtype;
  v_cycle integer;
begin
  select * into v_state
    from public.impact_reciprocity_state
   where student_id = p_student_id
   for update;
  if not found or v_state.status <> 'give_back_due' then return false; end if;
  if p_completion_at < v_state.cycle_started_at then return false; end if;
  if exists (select 1 from public.impact_reciprocity_settlements where student_id = p_student_id and cycle_number = v_state.cycle_number) then return false; end if;
  v_cycle := v_state.cycle_number;
  insert into public.impact_reciprocity_settlements(student_id, cycle_number, settlement_type, contribution_id, actor_id)
  values (p_student_id, v_cycle, 'contribution', p_contribution_id, p_actor_id);
  update public.impact_participations p
     set completion_due_cycle_number = v_cycle
    from public.impact_contributions c
   where c.id = p_contribution_id and p.id = c.participation_id;
  update public.impact_reciprocity_state
     set cycle_number = v_cycle + 1,
         community_redemption_count = 0,
         status = 'open',
         due_at = null,
         waived_until = null,
         waiver_reason = null,
         cycle_started_at = now(),
         last_settled_at = now(),
         last_settled_contribution_id = p_contribution_id,
         updated_at = now()
   where student_id = p_student_id;
  insert into public.impact_audit_events(actor_id, target_type, target_id, action, snapshot)
  values (p_actor_id, 'reciprocity_state', p_student_id, 'contribution_settled', jsonb_build_object('cycle_number', v_cycle, 'contribution_id', p_contribution_id));
  return true;
end;
$$;

create or replace function public._impact_verify_participation(
  p_participation_id uuid,
  p_actor_id uuid,
  p_admin_reason text default null
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_participation public.impact_participations%rowtype;
  v_opportunity public.impact_opportunities%rowtype;
  v_contribution public.impact_contributions%rowtype;
  v_organization_id uuid;
  v_completion_at timestamptz;
  v_settled boolean;
  v_has_contribution boolean;
begin
  if p_actor_id is null then raise exception 'AUTH_REQUIRED'; end if;
  select o.organization_id into v_organization_id
    from public.impact_participations p
    join public.impact_opportunities o on o.id = p.opportunity_id
   where p.id = p_participation_id;
  if v_organization_id is null then raise exception 'PARTICIPATION_NOT_FOUND'; end if;

  perform public._impact_lock_organization_context(v_organization_id);
  select * into v_opportunity from public.impact_opportunities where id = (select opportunity_id from public.impact_participations where id = p_participation_id) for update;
  select * into v_participation from public.impact_participations where id = p_participation_id for update;
  if not found then raise exception 'PARTICIPATION_NOT_FOUND'; end if;
  select * into v_contribution from public.impact_contributions where participation_id = p_participation_id for update;
  v_has_contribution := found;
  if not public.is_admin() and not exists (
    select 1 from public.organization_users ou
    where ou.organization_id = v_opportunity.organization_id and ou.user_id = p_actor_id
  ) then raise exception 'ORGANIZATION_ACCESS_REQUIRED'; end if;
  if p_actor_id = v_participation.student_id then raise exception 'SELF_VERIFICATION_FORBIDDEN'; end if;

  if v_has_contribution then
    if v_contribution.revoked_at is not null then raise exception 'CONTRIBUTION_REVOKED'; end if;
    return v_contribution.id;
  end if;

  if v_participation.status not in ('joined', 'completed')
     and not (v_participation.status = 'overdue' and public.is_admin() and p_admin_reason is not null) then
    raise exception 'PARTICIPATION_NOT_VERIFIABLE';
  end if;
  if v_opportunity.mode = 'scheduled' then
    if v_opportunity.ends_at > now() then raise exception 'OPPORTUNITY_NOT_FINISHED'; end if;
    v_completion_at := v_opportunity.ends_at;
  else
    if v_opportunity.due_at <= now() then raise exception 'OPPORTUNITY_EXPIRED_INCOMPLETE'; end if;
    v_completion_at := now();
  end if;

  perform set_config('cinste.impact_trusted_completion', 'on', true);
  if v_participation.status in ('joined', 'overdue') then
    update public.impact_participations
       set status = 'completed', resolved_at = now(), resolution_actor_id = p_actor_id,
           resolution_reason = case when p_admin_reason is null then 'Trusted completion verification' else btrim(p_admin_reason) end,
           completed_at = v_completion_at, completion_due_cycle_number = null, updated_at = now()
     where id = p_participation_id;
  elsif v_participation.completed_at is null then
    update public.impact_participations
       set resolved_at = coalesce(resolved_at, now()), resolution_actor_id = p_actor_id,
           resolution_reason = case when p_admin_reason is null then coalesce(resolution_reason, 'Trusted completion verification') else btrim(p_admin_reason) end,
           completed_at = v_completion_at, completion_due_cycle_number = null, updated_at = now()
     where id = p_participation_id;
  end if;
  insert into public.impact_contributions(participation_id, opportunity_id, student_id, organization_id, verified_minutes, verifier_id)
  values (p_participation_id, v_opportunity.id, v_participation.student_id, v_opportunity.organization_id, v_opportunity.expected_eligible_minutes, p_actor_id)
  returning * into v_contribution;
  v_settled := public._impact_settle_reciprocity(v_participation.student_id, v_contribution.id, p_actor_id, v_completion_at);
  insert into public.impact_audit_events(actor_id, target_type, target_id, organization_id, action, reason, snapshot)
  values (p_actor_id, 'contribution', v_contribution.id, v_opportunity.organization_id, 'verified', p_admin_reason, jsonb_build_object('participation_id', p_participation_id, 'verified_minutes', v_contribution.verified_minutes, 'completion_at', v_completion_at, 'settled', v_settled));
  return v_contribution.id;
end;
$$;

create or replace function public.organization_verify_impact_participation(p_participation_id uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_actor uuid := auth.uid(); v_org uuid; v_opp uuid;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED'; end if;
  select o.organization_id, o.id into v_org, v_opp
    from public.impact_participations p join public.impact_opportunities o on o.id = p.opportunity_id
   where p.id = p_participation_id;
  if v_org is null or not public.is_organization_operator_for(v_org) then raise exception 'ORGANIZATION_ACCESS_REQUIRED'; end if;
  return public._impact_verify_participation(p_participation_id, v_actor);
end;
$$;

create or replace function public.admin_verify_impact_participation(p_participation_id uuid, p_reason text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_actor uuid := auth.uid();
begin
  if v_actor is null or not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if coalesce(length(btrim(p_reason)), 0) < 3 then raise exception 'REASON_REQUIRED'; end if;
  return public._impact_verify_participation(p_participation_id, v_actor, btrim(p_reason));
end;
$$;

create or replace function public.admin_revoke_impact_contribution(p_contribution_id uuid, p_reason text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_contribution public.impact_contributions%rowtype;
  v_opportunity public.impact_opportunities%rowtype;
  v_participation public.impact_participations%rowtype;
  v_state public.impact_reciprocity_state%rowtype;
begin
  if v_actor is null or not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if coalesce(length(btrim(p_reason)), 0) < 3 then raise exception 'REASON_REQUIRED'; end if;
  select c.* into v_contribution
    from public.impact_contributions c
   where c.id = p_contribution_id;
  if not found then raise exception 'CONTRIBUTION_NOT_FOUND'; end if;
  perform public._impact_lock_organization_context((select organization_id from public.impact_opportunities where id = v_contribution.opportunity_id));
  select * into v_opportunity from public.impact_opportunities where id = v_contribution.opportunity_id for update;
  select * into v_participation from public.impact_participations where id = v_contribution.participation_id for update;
  select * into v_contribution from public.impact_contributions where id = p_contribution_id for update;
  select * into v_state from public.impact_reciprocity_state where student_id = v_contribution.student_id for update;
  if not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if v_contribution.revoked_at is not null then raise exception 'CONTRIBUTION_ALREADY_REVOKED'; end if;
  update public.impact_contributions
     set revoked_at = now(), revoked_by = v_actor, revocation_reason = btrim(p_reason)
   where id = p_contribution_id;
  insert into public.impact_audit_events(actor_id, target_type, target_id, organization_id, action, reason, snapshot)
  values (v_actor, 'contribution', p_contribution_id, v_opportunity.organization_id, 'revoked', btrim(p_reason), jsonb_build_object('student_id', v_contribution.student_id, 'participation_id', v_contribution.participation_id));
end;
$$;

create or replace function public.admin_waive_impact_reciprocity(p_student_id uuid, p_expected_cycle_number integer, p_reason text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_state public.impact_reciprocity_state%rowtype;
begin
  if v_actor is null or not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if p_expected_cycle_number is null or p_expected_cycle_number < 1 then raise exception 'INVALID_EXPECTED_CYCLE'; end if;
  if coalesce(length(btrim(p_reason)), 0) < 3 then raise exception 'REASON_REQUIRED'; end if;
  select * into v_state from public.impact_reciprocity_state where student_id = p_student_id for update;
  if not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if not found then raise exception 'RECIPROCITY_STATE_NOT_FOUND'; end if;
  if v_state.cycle_number <> p_expected_cycle_number or v_state.status <> 'give_back_due' then raise exception 'STALE_RECIPROCITY_CYCLE'; end if;
  if exists (select 1 from public.impact_reciprocity_settlements where student_id = p_student_id and cycle_number = v_state.cycle_number) then raise exception 'RECIPROCITY_CYCLE_ALREADY_SETTLED'; end if;
  insert into public.impact_reciprocity_settlements(student_id, cycle_number, settlement_type, actor_id, reason)
  values (p_student_id, v_state.cycle_number, 'admin_waiver', v_actor, btrim(p_reason));
  update public.impact_reciprocity_state
     set cycle_number = cycle_number + 1, community_redemption_count = 0, status = 'open', due_at = null,
         waived_until = null, waiver_reason = null, cycle_started_at = now(), last_settled_at = now(),
         last_settled_contribution_id = null, updated_at = now()
   where student_id = p_student_id;
  insert into public.impact_audit_events(actor_id, target_type, target_id, action, reason, snapshot)
  values (v_actor, 'reciprocity_state', p_student_id, 'reciprocity_waived', btrim(p_reason), jsonb_build_object('cycle_number', p_expected_cycle_number));
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
  if p_outcome = 'completed' then
    perform public.organization_verify_impact_participation(p_participation_id);
    return;
  end if;
  if p_outcome not in ('no_show', 'excused') then raise exception 'INVALID_OPERATIONAL_OUTCOME'; end if;
  if p_outcome = 'excused' and coalesce(length(btrim(p_reason)), 0) < 3 then raise exception 'REASON_REQUIRED'; end if;
  select o.* into v_opportunity
    from public.impact_participations p join public.impact_opportunities o on o.id = p.opportunity_id
   where p.id = p_participation_id;
  if v_opportunity.id is null then raise exception 'PARTICIPATION_NOT_FOUND'; end if;
  perform public._impact_lock_organization_context(v_opportunity.organization_id);
  select * into v_opportunity from public.impact_opportunities where id = v_opportunity.id for update;
  select * into v_participation from public.impact_participations where id = p_participation_id for update;
  if not public.is_organization_operator_for(v_opportunity.organization_id) then raise exception 'ORGANIZATION_ACCESS_REQUIRED'; end if;
  if v_participation.status <> 'joined' then raise exception 'PARTICIPATION_NOT_RESOLVABLE'; end if;
  if v_opportunity.mode = 'flexible_remote' or v_opportunity.ends_at > now() then raise exception 'OPPORTUNITY_NOT_FINISHED'; end if;
  update public.impact_participations set status = p_outcome, resolved_at = now(), resolution_actor_id = v_actor, resolution_reason = nullif(btrim(coalesce(p_reason, '')), ''), updated_at = now() where id = p_participation_id;
  insert into public.impact_audit_events(actor_id, target_type, target_id, organization_id, action, reason, snapshot)
  values (v_actor, 'participation', p_participation_id, v_opportunity.organization_id, p_outcome::text, nullif(btrim(coalesce(p_reason, '')), ''), '{}'::jsonb);
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
  if exists (select 1 from public.impact_contributions where student_id = v_student and opportunity_id = p_opportunity_id) then raise exception 'OPPORTUNITY_CONTRIBUTION_ALREADY_EARNED'; end if;
  if not exists (select 1 from public.organizations where id = v_opportunity.organization_id and status = 'active') then raise exception 'ORGANIZATION_NOT_ACTIVE'; end if;
  if v_opportunity.due_at <= now() then raise exception 'OPPORTUNITY_EXPIRED'; end if;
  if v_opportunity.mode = 'scheduled' and v_opportunity.starts_at <= now() then raise exception 'OPPORTUNITY_ALREADY_STARTED'; end if;
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

revoke all on table public.impact_reciprocity_settlements from anon, authenticated;
grant select on public.impact_reciprocity_settlements to authenticated;
revoke insert, update, delete on table public.impact_contributions, public.impact_participations, public.impact_reciprocity_state, public.impact_audit_events, public.impact_reciprocity_settlements from anon, authenticated;

revoke execute on function public._impact_lock_organization_context(uuid) from public, anon, authenticated;
revoke execute on function public._impact_settle_reciprocity(uuid, uuid, uuid, timestamptz, text) from public, anon, authenticated;
revoke execute on function public._impact_verify_participation(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.prevent_impact_participation_provenance_mutation() from public, anon, authenticated;
revoke execute on function public.validate_impact_contribution() from public, anon, authenticated;
revoke execute on function public.prevent_impact_settlement_history_mutation() from public, anon, authenticated;
revoke execute on function public.prevent_impact_audit_mutation() from public, anon, authenticated;
revoke execute on function public.validate_impact_settlement() from public, anon, authenticated;
revoke execute on function public.organization_verify_impact_participation(uuid) from public, anon;
revoke execute on function public.admin_verify_impact_participation(uuid, text) from public, anon;
revoke execute on function public.admin_revoke_impact_contribution(uuid, text) from public, anon;
revoke execute on function public.admin_waive_impact_reciprocity(uuid, integer, text) from public, anon;
revoke execute on function public.organization_resolve_impact_participation(uuid, public.impact_participation_status, text) from public, anon;
revoke execute on function public.student_join_impact_opportunity(uuid) from public, anon;
grant execute on function public.organization_verify_impact_participation(uuid), public.organization_resolve_impact_participation(uuid, public.impact_participation_status, text) to authenticated;
grant execute on function public.admin_verify_impact_participation(uuid, text), public.admin_revoke_impact_contribution(uuid, text), public.admin_waive_impact_reciprocity(uuid, integer, text) to authenticated;
grant execute on function public.student_join_impact_opportunity(uuid) to authenticated;
