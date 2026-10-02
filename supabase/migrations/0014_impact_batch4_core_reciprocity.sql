-- CINSTE Impact Batch 4: Core claim/redemption integration and policy cutover.
-- Apply after 0011, 0012 and 0013. This is intentionally additive: 0013 is
-- retained as the historical Batch 3 migration.

create type public.impact_campaign_reciprocity_type as enum ('COMMUNITY', 'OPEN');

alter table public.campaigns
  add column reciprocity_type public.impact_campaign_reciprocity_type not null default 'COMMUNITY';

-- A UUID singleton keeps this policy auditable through the existing UUID-based
-- Impact audit log. The migration creates it inactive; activation is explicit.
create table public.impact_reciprocity_policy (
  id uuid primary key default gen_random_uuid(),
  singleton boolean not null default true unique check (singleton),
  activated_at timestamptz,
  policy_version text,
  activated_by uuid references public.profiles(id),
  created_at timestamptz not null default clock_timestamp(),
  check ((activated_at is null and policy_version is null and activated_by is null)
      or (activated_at is not null and policy_version is not null and activated_by is not null))
);
insert into public.impact_reciprocity_policy(singleton) values (true);
alter table public.impact_reciprocity_policy enable row level security;

create table public.impact_reciprocity_redemptions (
  id uuid primary key default gen_random_uuid(),
  redemption_event_id uuid not null references public.redemption_events(id),
  claim_id uuid not null references public.claims(id),
  student_id uuid not null references public.student_profiles(user_id),
  effective_reciprocity_type public.impact_campaign_reciprocity_type not null,
  cycle_number integer,
  count_before integer,
  count_after integer,
  outcome text not null check (outcome in ('counted', 'give_back_due', 'due_capped', 'open_excluded')),
  created_at timestamptz not null default clock_timestamp(),
  unique (redemption_event_id),
  unique (claim_id),
  check ((effective_reciprocity_type = 'OPEN' and outcome = 'open_excluded' and cycle_number is null and count_before is null and count_after is null)
      or (effective_reciprocity_type = 'COMMUNITY' and outcome <> 'open_excluded' and cycle_number is not null and count_before between 0 and 3 and count_after between 0 and 3))
);
create index impact_reciprocity_redemptions_student_created
  on public.impact_reciprocity_redemptions(student_id, created_at desc);

alter table public.impact_reciprocity_redemptions enable row level security;
create policy reciprocity_redemptions_student_admin_read on public.impact_reciprocity_redemptions
  for select using (student_id = auth.uid() or public.is_admin());

create or replace function public.prevent_impact_redemption_history_mutation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  raise exception 'IMPACT_REDEMPTION_HISTORY_IMMUTABLE';
end;
$$;
create trigger prevent_impact_redemption_history_mutation
before update or delete on public.impact_reciprocity_redemptions
for each row execute function public.prevent_impact_redemption_history_mutation();

-- Private snapshot helper. It intentionally ignores user-caused join limits,
-- cooldowns and schedule conflicts, and takes no locks on opportunity rows.
create or replace function public._impact_has_reasonable_supply(p_student_id uuid, p_at timestamptz)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
      from public.impact_opportunities o
      join public.organizations org on org.id = o.organization_id
     where org.status = 'active'
       and o.status = 'published'
       and (
         (o.mode = 'scheduled'
           and o.starts_at > p_at
           and o.starts_at <= p_at + interval '14 days'
           and o.ends_at > o.starts_at
           and o.due_at >= o.ends_at
           and lower(btrim(coalesce(o.city, ''))) in ('bucuresti', 'bucurești', 'bucureşti', 'bucharest'))
         or
         (o.mode = 'flexible_remote' and o.due_at > p_at)
       )
       and (select count(*) from public.impact_participations ip where ip.opportunity_id = o.id and ip.status = 'joined') < o.capacity
       and not exists (
         select 1 from public.impact_contributions c
          where c.student_id = p_student_id and c.opportunity_id = o.id and c.revoked_at is null
       )
  );
$$;

create or replace function public.admin_activate_impact_reciprocity_policy()
returns timestamptz
language plpgsql security definer set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_policy public.impact_reciprocity_policy%rowtype;
  v_transition_at timestamptz;
begin
  if v_actor is null or not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  select * into v_policy from public.impact_reciprocity_policy where singleton for update;
  if v_policy.activated_at is not null then raise exception 'IMPACT_POLICY_ALREADY_ACTIVATED'; end if;
  v_transition_at := clock_timestamp();
  update public.impact_reciprocity_policy
     set activated_at = v_transition_at, policy_version = 'impact-reciprocity-v1', activated_by = v_actor
   where id = v_policy.id;
  insert into public.impact_audit_events(actor_id, target_type, target_id, action, snapshot)
  values (v_actor, 'reciprocity_state', v_policy.id, 'reciprocity_policy_activated', jsonb_build_object('policy_version', 'impact-reciprocity-v1', 'activated_at', v_transition_at));
  return v_transition_at;
end;
$$;

-- Fix Batch 3 no-banking semantics. Completion provenance must be at or after
-- the current due transition, regardless of when verification is performed.
create or replace function public._impact_settle_reciprocity(
  p_student_id uuid, p_contribution_id uuid, p_actor_id uuid,
  p_completion_at timestamptz, p_reason text default null
) returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_state public.impact_reciprocity_state%rowtype;
  v_cycle integer;
  v_transition_at timestamptz;
begin
  select * into v_state from public.impact_reciprocity_state where student_id = p_student_id for update;
  v_transition_at := clock_timestamp();
  if not found or v_state.status <> 'give_back_due' or v_state.due_at is null then return false; end if;
  if p_completion_at < v_state.due_at then return false; end if;
  if exists (select 1 from public.impact_reciprocity_settlements where student_id = p_student_id and cycle_number = v_state.cycle_number) then return false; end if;
  v_cycle := v_state.cycle_number;
  insert into public.impact_reciprocity_settlements(student_id, cycle_number, settlement_type, contribution_id, actor_id, settled_at)
  values (p_student_id, v_cycle, 'contribution', p_contribution_id, p_actor_id, v_transition_at);
  update public.impact_participations p set completion_due_cycle_number = v_cycle
    from public.impact_contributions c where c.id = p_contribution_id and p.id = c.participation_id;
  update public.impact_reciprocity_state set cycle_number = v_cycle + 1, community_redemption_count = 0,
    status = 'open', due_at = null, waived_until = null, waiver_reason = null,
    cycle_started_at = v_transition_at, last_settled_at = v_transition_at,
    last_settled_contribution_id = p_contribution_id, updated_at = v_transition_at
    where student_id = p_student_id;
  insert into public.impact_audit_events(actor_id, target_type, target_id, action, snapshot)
  values (p_actor_id, 'reciprocity_state', p_student_id, 'contribution_settled', jsonb_build_object('cycle_number', v_cycle, 'contribution_id', p_contribution_id, 'settled_at', v_transition_at));
  return true;
end;
$$;

create or replace function public.admin_waive_impact_reciprocity(p_student_id uuid, p_expected_cycle_number integer, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare v_actor uuid := auth.uid(); v_state public.impact_reciprocity_state%rowtype; v_transition_at timestamptz;
begin
  if v_actor is null or not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if p_expected_cycle_number is null or p_expected_cycle_number < 1 then raise exception 'INVALID_EXPECTED_CYCLE'; end if;
  if coalesce(length(btrim(p_reason)), 0) < 3 then raise exception 'REASON_REQUIRED'; end if;
  select * into v_state from public.impact_reciprocity_state where student_id = p_student_id for update;
  v_transition_at := clock_timestamp();
  if not found then raise exception 'RECIPROCITY_STATE_NOT_FOUND'; end if;
  if v_state.cycle_number <> p_expected_cycle_number or v_state.status <> 'give_back_due' then raise exception 'STALE_RECIPROCITY_CYCLE'; end if;
  if exists (select 1 from public.impact_reciprocity_settlements where student_id = p_student_id and cycle_number = v_state.cycle_number) then raise exception 'RECIPROCITY_CYCLE_ALREADY_SETTLED'; end if;
  insert into public.impact_reciprocity_settlements(student_id, cycle_number, settlement_type, actor_id, reason, settled_at)
  values (p_student_id, v_state.cycle_number, 'admin_waiver', v_actor, btrim(p_reason), v_transition_at);
  update public.impact_reciprocity_state set cycle_number = cycle_number + 1, community_redemption_count = 0, status = 'open', due_at = null,
    waived_until = null, waiver_reason = null, cycle_started_at = v_transition_at, last_settled_at = v_transition_at,
    last_settled_contribution_id = null, updated_at = v_transition_at where student_id = p_student_id;
  insert into public.impact_audit_events(actor_id, target_type, target_id, action, reason, snapshot)
  values (v_actor, 'reciprocity_state', p_student_id, 'reciprocity_waived', btrim(p_reason), jsonb_build_object('cycle_number', p_expected_cycle_number, 'settled_at', v_transition_at));
end;
$$;

-- Correct aggregate restoration when many expired reservations share a campaign.
create or replace function public.expire_stale_claims()
returns integer language plpgsql security definer set search_path = public as $$
declare expired_count integer;
begin
  with expired_claim_rows as (
    update public.claims cl set status = 'expired'
      from public.campaigns c join public.offers o on o.id = c.offer_id
     where cl.campaign_id = c.id and cl.status = 'active'
       and ((cl.expires_at is not null and cl.expires_at <= clock_timestamp()) or c.ends_at <= clock_timestamp()
         or (o.fulfillment_type = 'scheduled_event' and (c.event_ends_at is null or c.event_ends_at <= clock_timestamp())))
     returning cl.id, cl.campaign_id, cl.expires_at
  ), restorable as (
    select campaign_id, count(*)::integer as restore_count
      from expired_claim_rows where expires_at is not null and expires_at <= clock_timestamp()
     group by campaign_id
  ), restored_campaigns as (
    update public.campaigns c set quantity_available = least(c.quantity_total, c.quantity_available + r.restore_count)
      from restorable r where c.id = r.campaign_id and public.campaign_is_claimable(c.id)
     returning c.id
  ), marked as (
    update public.claims cl set expired_inventory_restored_at = clock_timestamp()
      from expired_claim_rows e join restored_campaigns rc on rc.id = e.campaign_id
     where cl.id = e.id and cl.expired_inventory_restored_at is null
     returning cl.id
  ) select count(*) into expired_count from expired_claim_rows;
  return expired_count;
end;
$$;

-- New signatures preserve existing RPC calls through defaults. The old exact
-- signatures are dropped after replacement so PostgREST cannot choose an
-- unsafe overload.
create or replace function public.admin_create_campaign(
  p_offer_id uuid, p_name text, p_quantity integer, p_starts_at timestamptz, p_ends_at timestamptz,
  p_claim_expiration_minutes integer, p_sponsor_type text, p_sponsor_display_name text,
  p_event_starts_at timestamptz default null, p_event_ends_at timestamptz default null,
  p_status public.campaign_status default 'active', p_reciprocity_type public.impact_campaign_reciprocity_type default 'COMMUNITY'
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_offer record; v_campaign_id uuid;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if p_reciprocity_type is null then raise exception 'INVALID_RECIPROCITY_TYPE'; end if;
  if coalesce(length(btrim(p_name)), 0) < 2 or length(p_name) > 160 then raise exception 'INVALID_CAMPAIGN_NAME'; end if;
  if p_quantity is null or p_quantity < 1 or p_quantity > 10000 then raise exception 'INVALID_QUANTITY'; end if;
  if p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at then raise exception 'INVALID_CAMPAIGN_WINDOW'; end if;
  if p_claim_expiration_minutes is not null and (p_claim_expiration_minutes < 1 or p_claim_expiration_minutes > 10080) then raise exception 'INVALID_CLAIM_EXPIRATION'; end if;
  if p_sponsor_type not in ('individual','company','creator','cinste','partner') then raise exception 'INVALID_SPONSOR_TYPE'; end if;
  if p_status not in ('draft','active','paused') then raise exception 'INVALID_CAMPAIGN_STATUS'; end if;
  select o.fulfillment_type into v_offer from public.offers o join public.partners partner on partner.id=o.partner_id join public.categories category on category.id=o.category_id
   where o.id=p_offer_id and o.active and partner.active and category.active for key share of o, partner, category;
  if not found then raise exception 'OFFER_NOT_OPERATIONAL'; end if;
  if v_offer.fulfillment_type = 'scheduled_event' then
    if p_event_starts_at is null or p_event_ends_at is null or p_event_ends_at <= p_event_starts_at then raise exception 'INVALID_EVENT_WINDOW'; end if;
    if p_event_starts_at < p_starts_at or p_event_ends_at > p_ends_at then raise exception 'EVENT_OUTSIDE_CAMPAIGN_WINDOW'; end if;
  elsif p_event_starts_at is not null or p_event_ends_at is not null then raise exception 'EVENT_WINDOW_NOT_ALLOWED'; end if;
  insert into public.campaigns(offer_id,name,sponsor_type,sponsor_display_name,funding_source,quantity_total,quantity_available,starts_at,ends_at,claim_expiration_minutes,event_starts_at,event_ends_at,status,reciprocity_type)
  values(p_offer_id,btrim(p_name),p_sponsor_type,nullif(btrim(coalesce(p_sponsor_display_name,'')),''),'admin',p_quantity,p_quantity,p_starts_at,p_ends_at,p_claim_expiration_minutes,p_event_starts_at,p_event_ends_at,p_status,p_reciprocity_type) returning id into v_campaign_id;
  return v_campaign_id;
end;
$$;

create or replace function public.admin_update_campaign(
  p_campaign_id uuid, p_name text, p_starts_at timestamptz, p_ends_at timestamptz, p_claim_expiration_minutes integer,
  p_event_starts_at timestamptz default null, p_event_ends_at timestamptz default null, p_status public.campaign_status default 'active',
  p_reciprocity_type public.impact_campaign_reciprocity_type default null
) returns void language plpgsql security definer set search_path = public as $$
declare v_campaign record;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  select c.id,c.status,c.reciprocity_type,o.fulfillment_type,o.active as offer_active,partner.active as partner_active,category.active as category_active into v_campaign
    from public.campaigns c join public.offers o on o.id=c.offer_id join public.partners partner on partner.id=o.partner_id join public.categories category on category.id=o.category_id where c.id=p_campaign_id for update of c;
  if not found then raise exception 'CAMPAIGN_NOT_FOUND'; end if;
  if v_campaign.status='ended' then raise exception 'CAMPAIGN_ENDED_IMMUTABLE'; end if;
  if exists(select 1 from public.claims where campaign_id=p_campaign_id) then
    if p_reciprocity_type is not null and p_reciprocity_type <> v_campaign.reciprocity_type then raise exception 'CAMPAIGN_RECIPROCITY_TYPE_FROZEN'; end if;
    raise exception 'CAMPAIGN_HAS_CLAIMS';
  end if;
  if coalesce(length(btrim(p_name)),0)<2 or length(p_name)>160 then raise exception 'INVALID_CAMPAIGN_NAME'; end if;
  if p_starts_at is null or p_ends_at is null or p_ends_at<=p_starts_at then raise exception 'INVALID_CAMPAIGN_WINDOW'; end if;
  if p_claim_expiration_minutes is not null and (p_claim_expiration_minutes<1 or p_claim_expiration_minutes>10080) then raise exception 'INVALID_CLAIM_EXPIRATION'; end if;
  if p_status not in ('draft','active','paused') then raise exception 'INVALID_CAMPAIGN_STATUS'; end if;
  if p_status='active' and (not v_campaign.offer_active or not v_campaign.partner_active or not v_campaign.category_active) then raise exception 'OFFER_NOT_OPERATIONAL'; end if;
  if v_campaign.fulfillment_type='scheduled_event' then
    if p_event_starts_at is null or p_event_ends_at is null or p_event_ends_at<=p_event_starts_at then raise exception 'INVALID_EVENT_WINDOW'; end if;
    if p_event_starts_at<p_starts_at or p_event_ends_at>p_ends_at then raise exception 'EVENT_OUTSIDE_CAMPAIGN_WINDOW'; end if;
  elsif p_event_starts_at is not null or p_event_ends_at is not null then raise exception 'EVENT_WINDOW_NOT_ALLOWED'; end if;
  update public.campaigns set name=btrim(p_name),starts_at=p_starts_at,ends_at=p_ends_at,claim_expiration_minutes=p_claim_expiration_minutes,event_starts_at=p_event_starts_at,event_ends_at=p_event_ends_at,status=p_status,reciprocity_type=coalesce(p_reciprocity_type,reciprocity_type) where id=p_campaign_id;
end;
$$;

create or replace function public.claim_campaign(p_campaign_id uuid)
returns table(claim_id uuid, redemption_token text, expires_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare v_student uuid:=auth.uid(); v_campaign public.campaigns%rowtype; v_state public.impact_reciprocity_state%rowtype; v_token text:=encode(extensions.gen_random_bytes(32),'hex'); v_exp timestamptz; v_policy_active boolean; v_policy_version text; v_now timestamptz; v_supply boolean;
begin
  if v_student is null then raise exception 'AUTH_REQUIRED'; end if;
  perform public.expire_stale_claims();
  perform pg_advisory_xact_lock(hashtext(v_student::text));
  if not exists(select 1 from public.student_profiles where user_id=v_student and verification_status='verified') then raise exception 'STUDENT_NOT_VERIFIED'; end if;
  if exists(select 1 from public.claims where student_id=v_student and status in ('active','redeemed') and claimed_at > now()-interval '24 hours') then raise exception 'CLAIM_LIMIT_REACHED'; end if;
  select c.* into v_campaign from public.campaigns c join public.offers o on o.id=c.offer_id join public.partners p on p.id=o.partner_id join public.categories category on category.id=o.category_id
    where c.id=p_campaign_id and c.status='active' and c.starts_at<=now() and c.ends_at>now() and o.active and p.active and category.active and (o.fulfillment_type<>'scheduled_event' or (c.event_starts_at is not null and c.event_ends_at is not null and c.event_ends_at>now())) for update of c;
  if not found then raise exception 'CAMPAIGN_UNAVAILABLE'; end if;
  if v_campaign.quantity_available<1 then raise exception 'SOLD_OUT'; end if;
  select activated_at is not null, policy_version into v_policy_active,v_policy_version from public.impact_reciprocity_policy where singleton;
  if v_policy_active and v_campaign.reciprocity_type='COMMUNITY' then
    insert into public.impact_reciprocity_state(student_id,cycle_started_at,updated_at) values(v_student,clock_timestamp(),clock_timestamp()) on conflict(student_id) do nothing;
    select * into v_state from public.impact_reciprocity_state where student_id=v_student for update;
    if v_state.status='give_back_due' then
      v_now:=clock_timestamp(); v_supply:=public._impact_has_reasonable_supply(v_student,v_now);
      if v_supply then raise exception 'GIVE_BACK_DUE'; end if;
    end if;
  end if;
  update public.campaigns set quantity_available=quantity_available-1 where id=p_campaign_id and quantity_available>0 returning * into v_campaign;
  if not found then raise exception 'SOLD_OUT'; end if;
  v_exp:=case when v_campaign.claim_expiration_minutes is null then null else clock_timestamp()+make_interval(mins=>v_campaign.claim_expiration_minutes) end;
  insert into public.claims(campaign_id,student_id,token_hash,token_hint,expires_at) values(p_campaign_id,v_student,encode(extensions.digest(v_token,'sha256'),'hex'),right(v_token,6),v_exp) returning id into claim_id;
  insert into public.claim_secrets(claim_id,student_id,redemption_token) values(claim_id,v_student,v_token);
  if v_policy_active and v_campaign.reciprocity_type='COMMUNITY' and v_state.status='give_back_due' and not v_supply then
    insert into public.impact_audit_events(actor_id,target_type,target_id,action,snapshot) values(v_student,'reciprocity_state',v_student,'reciprocity_supply_exception_claim',jsonb_build_object('claim_id',claim_id,'cycle_number',v_state.cycle_number,'evaluated_at',v_now,'policy_version',v_policy_version,'reason','no_reasonable_supply'));
  end if;
  redemption_token:=v_token; expires_at:=v_exp;
  insert into public.analytics_events(actor_id,event_name,entity_type,entity_id) values(v_student,'claim_completed','campaign',p_campaign_id);
  return next;
end;
$$;

create or replace function public.redeem_claim(p_token text)
returns text language plpgsql security definer set search_path = public as $$
declare v_claim public.claims%rowtype; v_campaign public.campaigns%rowtype; v_offer public.offers%rowtype; v_partner public.partners%rowtype; v_category public.categories%rowtype; v_validity text; v_event_id uuid; v_state public.impact_reciprocity_state%rowtype; v_policy_active boolean; v_transition_at timestamptz; v_before integer; v_after integer; v_outcome text;
begin
  perform public.expire_stale_claims();
  select * into v_claim from public.claims where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') for update;
  if not found then return 'INVALID CODE'; end if;
  select * into v_campaign from public.campaigns where id=v_claim.campaign_id for update;
  select * into v_offer from public.offers where id=v_campaign.offer_id for key share;
  select * into v_partner from public.partners where id=v_offer.partner_id for key share;
  select * into v_category from public.categories where id=v_offer.category_id for key share;
  if not public.is_partner_for(v_partner.id) then return 'NOT VALID AT THIS PARTNER'; end if;
  if v_claim.status='redeemed' then return 'ALREADY REDEEMED'; end if;
  if v_claim.status='expired' then return 'EXPIRED'; end if;
  if v_claim.status<>'active' then return 'INVALID CODE'; end if;
  v_validity:=public.claim_redeemability(v_claim.id);
  if v_validity='not_yet_valid' then return 'NOT YET VALID'; end if;
  if v_validity<>'valid' then return 'EXPIRED'; end if;
  update public.claims set status='redeemed',redeemed_at=clock_timestamp() where id=v_claim.id;
  insert into public.redemption_events(claim_id,partner_id,partner_user_id) values(v_claim.id,v_partner.id,auth.uid()) returning id into v_event_id;
  select activated_at is not null into v_policy_active from public.impact_reciprocity_policy where singleton;
  if v_policy_active then
    if v_campaign.reciprocity_type='OPEN' then
      insert into public.impact_reciprocity_redemptions(redemption_event_id,claim_id,student_id,effective_reciprocity_type,outcome) values(v_event_id,v_claim.id,v_claim.student_id,'OPEN','open_excluded');
    else
      insert into public.impact_reciprocity_state(student_id,cycle_started_at,updated_at) values(v_claim.student_id,clock_timestamp(),clock_timestamp()) on conflict(student_id) do nothing;
      select * into v_state from public.impact_reciprocity_state where student_id=v_claim.student_id for update;
      v_transition_at:=clock_timestamp(); v_before:=v_state.community_redemption_count;
      if v_state.status='give_back_due' then v_after:=3; v_outcome:='due_capped';
      elsif v_before=2 then v_after:=3; v_outcome:='give_back_due';
      else v_after:=v_before+1; v_outcome:='counted'; end if;
      update public.impact_reciprocity_state set community_redemption_count=v_after,status=case when v_after=3 then 'give_back_due'::public.impact_reciprocity_status else 'open'::public.impact_reciprocity_status end,due_at=case when v_after=3 then coalesce(due_at,v_transition_at) else null end,updated_at=v_transition_at where student_id=v_claim.student_id;
      insert into public.impact_reciprocity_redemptions(redemption_event_id,claim_id,student_id,effective_reciprocity_type,cycle_number,count_before,count_after,outcome) values(v_event_id,v_claim.id,v_claim.student_id,'COMMUNITY',v_state.cycle_number,v_before,v_after,v_outcome);
    end if;
  end if;
  insert into public.analytics_events(actor_id,event_name,entity_type,entity_id) values(auth.uid(),'redemption_completed','claim',v_claim.id);
  return 'REDEEMED';
end;
$$;

-- Remove the old campaign operation signatures and make privileges explicit.
drop function public.admin_create_campaign(uuid,text,integer,timestamptz,timestamptz,integer,text,text,timestamptz,timestamptz,public.campaign_status);
drop function public.admin_update_campaign(uuid,text,timestamptz,timestamptz,integer,timestamptz,timestamptz,public.campaign_status);
revoke all on table public.impact_reciprocity_policy, public.impact_reciprocity_redemptions from anon, authenticated;
grant select on public.impact_reciprocity_redemptions to authenticated;
revoke execute on function public._impact_has_reasonable_supply(uuid,timestamptz), public.prevent_impact_redemption_history_mutation() from public, anon, authenticated;
revoke execute on function public.admin_activate_impact_reciprocity_policy() from public, anon;
revoke execute on function public.admin_create_campaign(uuid,text,integer,timestamptz,timestamptz,integer,text,text,timestamptz,timestamptz,public.campaign_status,public.impact_campaign_reciprocity_type) from public, anon;
revoke execute on function public.admin_update_campaign(uuid,text,timestamptz,timestamptz,integer,timestamptz,timestamptz,public.campaign_status,public.impact_campaign_reciprocity_type) from public, anon;
grant execute on function public.admin_activate_impact_reciprocity_policy(), public.admin_create_campaign(uuid,text,integer,timestamptz,timestamptz,integer,text,text,timestamptz,timestamptz,public.campaign_status,public.impact_campaign_reciprocity_type), public.admin_update_campaign(uuid,text,timestamptz,timestamptz,integer,timestamptz,timestamptz,public.campaign_status,public.impact_campaign_reciprocity_type) to authenticated;
