-- CINSTE Impact Batch 1: additive backend foundation.
-- This migration defines the data and authorization boundary only. Student
-- joins, opportunity lifecycle actions, contribution verification, reciprocity
-- settlement, and Core claim integration belong to later batches.

create type public.organization_status as enum ('pending_review', 'active', 'suspended');
create type public.impact_opportunity_mode as enum ('scheduled', 'flexible_remote');
create type public.impact_opportunity_category as enum ('community', 'education', 'environment', 'animals', 'events', 'skills', 'other');
create type public.impact_opportunity_status as enum ('draft', 'published', 'cancelled', 'closed');
create type public.impact_participation_status as enum ('joined', 'cancelled', 'cancelled_by_organization', 'late_cancelled', 'completed', 'no_show', 'excused', 'expired_incomplete', 'disputed', 'overdue');
create type public.impact_reciprocity_status as enum ('open', 'give_back_due');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 2 and 200),
  description text,
  contact_email text,
  phone text,
  website text,
  city text,
  status public.organization_status not null default 'pending_review',
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  review_reason text,
  deactivated_by uuid references public.profiles(id),
  deactivated_at timestamptz,
  deactivation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'pending_review' and reviewed_at is null) or status <> 'pending_review'),
  check ((status = 'suspended' and deactivated_at is not null and deactivation_reason is not null) or status <> 'suspended')
);

-- This is the live assignment table. Revocations remove the live row; the
-- append-only access event table below preserves the assignment history.
create table public.organization_users (
  organization_id uuid not null references public.organizations(id),
  user_id uuid not null references public.profiles(id),
  assigned_by uuid not null references public.profiles(id),
  assigned_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.organization_user_access_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  user_id uuid not null references public.profiles(id),
  actor_id uuid not null references public.profiles(id),
  action text not null check (action in ('assigned', 'revoked')),
  created_at timestamptz not null default now()
);

create table public.impact_opportunities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  title text not null check (length(btrim(title)) between 2 and 200),
  description text not null,
  category public.impact_opportunity_category not null,
  mode public.impact_opportunity_mode not null,
  city text,
  starts_at timestamptz,
  ends_at timestamptz,
  due_at timestamptz not null,
  expected_eligible_minutes integer not null check (expected_eligible_minutes > 0 and expected_eligible_minutes <= 1440),
  capacity integer not null check (capacity > 0 and capacity <= 100000),
  status public.impact_opportunity_status not null default 'draft',
  published_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (mode = 'scheduled' and starts_at is not null and ends_at is not null and ends_at > starts_at and due_at >= ends_at)
    or
    (mode = 'flexible_remote' and starts_at is null and ends_at is null)
  ),
  check ((status = 'published' and published_at is not null) or status <> 'published'),
  check ((status = 'cancelled' and cancelled_at is not null and cancellation_reason is not null) or status <> 'cancelled')
);

create table public.impact_participations (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.impact_opportunities(id),
  student_id uuid not null references public.student_profiles(user_id),
  status public.impact_participation_status not null default 'joined',
  joined_at timestamptz not null default now(),
  cancelled_at timestamptz,
  resolved_at timestamptz,
  resolution_actor_id uuid references public.profiles(id),
  resolution_reason text,
  disputed_at timestamptz,
  dispute_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status in ('joined', 'overdue') or resolved_at is not null or disputed_at is not null),
  check ((status in ('cancelled', 'late_cancelled', 'cancelled_by_organization') and cancelled_at is not null) or status not in ('cancelled', 'late_cancelled', 'cancelled_by_organization')),
  check ((status = 'disputed' and disputed_at is not null) or status <> 'disputed')
);

create unique index impact_participations_one_active
  on public.impact_participations(student_id, opportunity_id)
  where status = 'joined';
create index impact_participations_opportunity_status
  on public.impact_participations(opportunity_id, status);
create index impact_participations_student_created
  on public.impact_participations(student_id, created_at desc);

create table public.impact_contributions (
  id uuid primary key default gen_random_uuid(),
  participation_id uuid not null unique references public.impact_participations(id),
  student_id uuid not null references public.student_profiles(user_id),
  organization_id uuid not null references public.organizations(id),
  verified_minutes integer not null check (verified_minutes > 0 and verified_minutes <= 1440),
  verified_at timestamptz not null default now(),
  verifier_id uuid not null references public.profiles(id),
  revoked_at timestamptz,
  revoked_by uuid references public.profiles(id),
  revocation_reason text,
  created_at timestamptz not null default now(),
  check ((revoked_at is null and revoked_by is null and revocation_reason is null) or (revoked_at is not null and revoked_by is not null and revocation_reason is not null))
);
create index impact_contributions_student_verified
  on public.impact_contributions(student_id, verified_at desc);
create index impact_contributions_organization_verified
  on public.impact_contributions(organization_id, verified_at desc);

create or replace function public.validate_impact_contribution()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare v_participation public.impact_participations%rowtype; v_organization_id uuid;
begin
  select p, o.organization_id into v_participation, v_organization_id
    from public.impact_participations p
    join public.impact_opportunities o on o.id = p.opportunity_id
   where p.id = new.participation_id;
  if not found or v_participation.status <> 'completed' then raise exception 'PARTICIPATION_NOT_COMPLETED'; end if;
  if new.student_id is distinct from v_participation.student_id or new.organization_id is distinct from v_organization_id then raise exception 'CONTRIBUTION_SCOPE_MISMATCH'; end if;
  return new;
end;
$$;
create trigger validate_impact_contribution_before_write
before insert or update on public.impact_contributions
for each row execute function public.validate_impact_contribution();

create table public.impact_reciprocity_state (
  student_id uuid primary key references public.student_profiles(user_id),
  cycle_number integer not null default 1 check (cycle_number > 0),
  community_redemption_count integer not null default 0 check (community_redemption_count between 0 and 3),
  status public.impact_reciprocity_status not null default 'open',
  cycle_started_at timestamptz not null default now(),
  due_at timestamptz,
  waived_until timestamptz,
  waiver_reason text,
  last_settled_at timestamptz,
  last_settled_contribution_id uuid references public.impact_contributions(id),
  updated_at timestamptz not null default now(),
  check ((status = 'open' and community_redemption_count < 3) or (status = 'give_back_due' and community_redemption_count = 3)),
  check ((waived_until is null and waiver_reason is null) or (waived_until is not null and waiver_reason is not null))
);

create table public.impact_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id),
  target_type text not null check (target_type in ('organization', 'organization_user', 'opportunity', 'participation', 'contribution', 'reciprocity_state')),
  target_id uuid not null,
  organization_id uuid references public.organizations(id),
  action text not null,
  reason text,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index impact_audit_events_target_created on public.impact_audit_events(target_type, target_id, created_at desc);
create index impact_audit_events_organization_created on public.impact_audit_events(organization_id, created_at desc);

create index organization_users_user on public.organization_users(user_id);
create index organization_user_access_events_org_created on public.organization_user_access_events(organization_id, created_at desc);
create index impact_opportunities_org_status on public.impact_opportunities(organization_id, status);
create index impact_opportunities_published on public.impact_opportunities(status, due_at) where status = 'published';

create or replace function public.is_organization_operator_for(p_organization_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
      from public.organization_users ou
      join public.organizations o on o.id = ou.organization_id
     where ou.organization_id = p_organization_id
       and ou.user_id = auth.uid()
       and o.status = 'active'
  )
$$;

create or replace function public.audit_organization_user_access()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.organization_user_access_events(organization_id, user_id, actor_id, action)
    values (new.organization_id, new.user_id, coalesce(auth.uid(), new.assigned_by), 'assigned');
    return new;
  end if;
  insert into public.organization_user_access_events(organization_id, user_id, actor_id, action)
  values (old.organization_id, old.user_id, coalesce(auth.uid(), old.assigned_by), 'revoked');
  return old;
end;
$$;
create trigger organization_user_access_audit
after insert or delete on public.organization_users
for each row execute function public.audit_organization_user_access();

create or replace function public.admin_create_organization(
  p_name text,
  p_description text default null,
  p_contact_email text default null,
  p_phone text default null,
  p_website text default null,
  p_city text default null
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_id uuid;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if coalesce(length(btrim(p_name)), 0) < 2 or length(p_name) > 200 then raise exception 'INVALID_ORGANIZATION_NAME'; end if;
  insert into public.organizations(name, description, contact_email, phone, website, city)
  values (btrim(p_name), nullif(btrim(coalesce(p_description, '')), ''), nullif(btrim(coalesce(p_contact_email, '')), ''), nullif(btrim(coalesce(p_phone, '')), ''), nullif(btrim(coalesce(p_website, '')), ''), nullif(btrim(coalesce(p_city, '')), ''))
  returning id into v_id;
  insert into public.impact_audit_events(actor_id, target_type, target_id, action, snapshot)
  values (auth.uid(), 'organization', v_id, 'created', jsonb_build_object('status', 'pending_review'));
  return v_id;
end;
$$;

create or replace function public.admin_activate_organization(p_organization_id uuid, p_reason text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_org public.organizations%rowtype;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  select * into v_org from public.organizations where id = p_organization_id for update;
  if not found then raise exception 'ORGANIZATION_NOT_FOUND'; end if;
  update public.organizations set status = 'active', reviewed_by = auth.uid(), reviewed_at = now(), review_reason = nullif(btrim(coalesce(p_reason, '')), ''), deactivated_by = null, deactivated_at = null, deactivation_reason = null, updated_at = now() where id = v_org.id;
  insert into public.impact_audit_events(actor_id, target_type, target_id, action, reason, snapshot)
  values (auth.uid(), 'organization', v_org.id, 'activated', nullif(btrim(coalesce(p_reason, '')), ''), jsonb_build_object('previous_status', v_org.status, 'status', 'active'));
end;
$$;

create or replace function public.admin_deactivate_organization(p_organization_id uuid, p_reason text)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_org public.organizations%rowtype; v_count integer;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if coalesce(length(btrim(p_reason)), 0) < 3 then raise exception 'REASON_REQUIRED'; end if;
  select * into v_org from public.organizations where id = p_organization_id for update;
  if not found then raise exception 'ORGANIZATION_NOT_FOUND'; end if;
  update public.organizations set status = 'suspended', deactivated_by = auth.uid(), deactivated_at = now(), deactivation_reason = btrim(p_reason), updated_at = now() where id = v_org.id;
  update public.impact_participations p set status = 'cancelled_by_organization', cancelled_at = now(), resolved_at = now(), resolution_actor_id = auth.uid(), resolution_reason = btrim(p_reason), updated_at = now()
    from public.impact_opportunities o where o.id = p.opportunity_id and o.organization_id = v_org.id and p.status = 'joined';
  update public.impact_opportunities set status = 'cancelled', cancelled_at = now(), cancellation_reason = btrim(p_reason), updated_at = now()
    where organization_id = v_org.id and status in ('draft', 'published');
  get diagnostics v_count = row_count;
  insert into public.impact_audit_events(actor_id, target_type, target_id, action, reason, snapshot)
  values (auth.uid(), 'organization', v_org.id, 'deactivated', btrim(p_reason), jsonb_build_object('previous_status', v_org.status, 'status', 'suspended', 'cancelled_opportunities', v_count));
end;
$$;

create or replace function public.admin_assign_organization_user(p_organization_id uuid, p_user_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_org public.organizations%rowtype;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  select * into v_org from public.organizations where id = p_organization_id for update;
  if not found then raise exception 'ORGANIZATION_NOT_FOUND'; end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then raise exception 'USER_NOT_FOUND'; end if;
  if exists (select 1 from public.organization_users where organization_id = p_organization_id and user_id = p_user_id) then raise exception 'ORGANIZATION_USER_ALREADY_ASSIGNED'; end if;
  insert into public.organization_users(organization_id, user_id, assigned_by) values (p_organization_id, p_user_id, auth.uid());
  insert into public.impact_audit_events(actor_id, target_type, target_id, organization_id, action, snapshot)
  values (auth.uid(), 'organization_user', p_user_id, p_organization_id, 'user_assigned', jsonb_build_object('user_id', p_user_id));
end;
$$;

create or replace function public.admin_revoke_organization_user(p_organization_id uuid, p_user_id uuid, p_reason text)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_assignment public.organization_users%rowtype;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if coalesce(length(btrim(p_reason)), 0) < 3 then raise exception 'REASON_REQUIRED'; end if;
  select * into v_assignment from public.organization_users where organization_id = p_organization_id and user_id = p_user_id for update;
  if not found then raise exception 'ORGANIZATION_USER_ASSIGNMENT_NOT_FOUND'; end if;
  delete from public.organization_users where organization_id = p_organization_id and user_id = p_user_id;
  insert into public.impact_audit_events(actor_id, target_type, target_id, organization_id, action, reason, snapshot)
  values (auth.uid(), 'organization_user', p_user_id, p_organization_id, 'user_revoked', btrim(p_reason), jsonb_build_object('user_id', p_user_id));
end;
$$;

alter table public.organizations enable row level security;
alter table public.organization_users enable row level security;
alter table public.organization_user_access_events enable row level security;
alter table public.impact_opportunities enable row level security;
alter table public.impact_participations enable row level security;
alter table public.impact_contributions enable row level security;
alter table public.impact_reciprocity_state enable row level security;
alter table public.impact_audit_events enable row level security;

create policy organizations_admin_read on public.organizations for select using (public.is_admin());
create policy organizations_operator_read on public.organizations for select using (public.is_organization_operator_for(id));
create policy organization_users_admin_read on public.organization_users for select using (public.is_admin());
create policy organization_access_events_admin_read on public.organization_user_access_events for select using (public.is_admin());
create policy opportunities_public_read on public.impact_opportunities for select using (status = 'published' and exists (select 1 from public.organizations o where o.id = organization_id and o.status = 'active'));
create policy opportunities_operator_read on public.impact_opportunities for select using (public.is_organization_operator_for(organization_id));
create policy opportunities_admin_read on public.impact_opportunities for select using (public.is_admin());
create policy participations_student_read on public.impact_participations for select using (student_id = auth.uid());
create policy participations_operator_read on public.impact_participations for select using (exists (select 1 from public.impact_opportunities o where o.id = opportunity_id and public.is_organization_operator_for(o.organization_id)));
create policy participations_admin_read on public.impact_participations for select using (public.is_admin());
create policy contributions_student_read on public.impact_contributions for select using (student_id = auth.uid());
create policy contributions_operator_read on public.impact_contributions for select using (public.is_organization_operator_for(organization_id));
create policy contributions_admin_read on public.impact_contributions for select using (public.is_admin());
create policy reciprocity_student_read on public.impact_reciprocity_state for select using (student_id = auth.uid());
create policy reciprocity_admin_read on public.impact_reciprocity_state for select using (public.is_admin());
create policy impact_audit_admin_read on public.impact_audit_events for select using (public.is_admin());

revoke all on table public.organizations, public.organization_users, public.organization_user_access_events, public.impact_opportunities, public.impact_participations, public.impact_contributions, public.impact_reciprocity_state, public.impact_audit_events from anon, authenticated;
grant select on public.organizations, public.organization_users, public.organization_user_access_events, public.impact_opportunities, public.impact_participations, public.impact_contributions, public.impact_reciprocity_state, public.impact_audit_events to authenticated;
grant execute on function public.is_organization_operator_for(uuid) to authenticated;
revoke execute on function public.validate_impact_contribution() from public, anon, authenticated;
revoke execute on function public.audit_organization_user_access() from public, anon, authenticated;
revoke execute on function public.admin_create_organization(text, text, text, text, text, text) from public, anon;
revoke execute on function public.admin_activate_organization(uuid, text) from public, anon;
revoke execute on function public.admin_deactivate_organization(uuid, text) from public, anon;
revoke execute on function public.admin_assign_organization_user(uuid, uuid) from public, anon;
revoke execute on function public.admin_revoke_organization_user(uuid, uuid, text) from public, anon;
grant execute on function public.admin_create_organization(text, text, text, text, text, text), public.admin_activate_organization(uuid, text), public.admin_deactivate_organization(uuid, text), public.admin_assign_organization_user(uuid, uuid), public.admin_revoke_organization_user(uuid, uuid, text) to authenticated;
