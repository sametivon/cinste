-- Impact V1: make the reciprocity ratio an Admin-configurable policy while
-- snapshotting the ratio used by each cycle and redemption history row.

alter table public.impact_reciprocity_policy
  add column if not exists required_experiences integer not null default 3,
  add column if not exists policy_revision integer not null default 1,
  add column if not exists updated_at timestamptz not null default clock_timestamp(),
  add column if not exists updated_by uuid references public.profiles(id);

alter table public.impact_reciprocity_policy
  drop constraint if exists impact_reciprocity_policy_required_experiences_check;
alter table public.impact_reciprocity_policy
  add constraint impact_reciprocity_policy_required_experiences_check check (required_experiences > 0);

alter table public.impact_reciprocity_state
  add column if not exists required_experiences integer not null default 3,
  add column if not exists policy_version text not null default 'impact-reciprocity-v1';
alter table public.impact_reciprocity_state
  drop constraint if exists impact_reciprocity_state_community_redemption_count_check,
  drop constraint if exists impact_reciprocity_state_check;
alter table public.impact_reciprocity_state
  add constraint impact_reciprocity_state_community_redemption_count_check check (community_redemption_count >= 0),
  add constraint impact_reciprocity_state_cycle_status_check check (
    (status = 'open' and community_redemption_count < required_experiences and due_at is null)
    or (status = 'give_back_due' and community_redemption_count = required_experiences and due_at is not null)
  ),
  add constraint impact_reciprocity_state_required_experiences_check check (required_experiences > 0);

alter table public.impact_reciprocity_redemptions
  add column if not exists required_experiences integer,
  add column if not exists policy_version text;
alter table public.impact_reciprocity_redemptions
  drop constraint if exists impact_reciprocity_redemptions_check;
alter table public.impact_reciprocity_redemptions
  add constraint impact_reciprocity_redemptions_snapshot_check check (
    (required_experiences is null and policy_version is null)
    or (required_experiences > 0 and policy_version is not null)
  ),
  add constraint impact_reciprocity_redemptions_counts_check check (
    (count_before is null or count_before >= 0) and (count_after is null or count_after >= 0)
  );

create or replace function public._impact_current_reciprocity_policy()
returns table(policy_version text, required_experiences integer)
language sql stable security definer set search_path = public
as $$
  select coalesce(p.policy_version, 'impact-reciprocity-v1'), p.required_experiences
    from public.impact_reciprocity_policy p
   where p.singleton;
$$;

create or replace function public.snapshot_impact_reciprocity_policy()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_policy record;
begin
  if tg_op = 'INSERT' or (old.status = 'give_back_due' and new.status = 'open' and new.community_redemption_count = 0) then
    select * into v_policy from public._impact_current_reciprocity_policy();
    if found then
      new.required_experiences := v_policy.required_experiences;
      new.policy_version := v_policy.policy_version;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists snapshot_impact_reciprocity_policy on public.impact_reciprocity_state;
create trigger snapshot_impact_reciprocity_policy
before insert or update on public.impact_reciprocity_state
for each row execute function public.snapshot_impact_reciprocity_policy();

create or replace function public.admin_update_impact_reciprocity_policy(
  p_required_experiences integer,
  p_reason text
)
returns public.impact_reciprocity_policy
language plpgsql security definer set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_policy public.impact_reciprocity_policy%rowtype;
  v_previous integer;
  v_version text;
begin
  if v_actor is null or not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if p_required_experiences is null or p_required_experiences < 1 then raise exception 'INVALID_RECIPROCITY_RATIO'; end if;
  if coalesce(length(btrim(p_reason)), 0) < 3 then raise exception 'REASON_REQUIRED'; end if;
  select * into v_policy from public.impact_reciprocity_policy where singleton for update;
  if not found then raise exception 'RECIPROCITY_POLICY_NOT_FOUND'; end if;
  v_previous := v_policy.required_experiences;
  if v_previous = p_required_experiences then raise exception 'RECIPROCITY_POLICY_UNCHANGED'; end if;
  v_version := case when v_policy.activated_at is null then null else 'impact-reciprocity-v' || (v_policy.policy_revision + 1)::text end;
  update public.impact_reciprocity_policy
     set required_experiences = p_required_experiences,
         policy_revision = policy_revision + 1,
         policy_version = v_version,
         updated_at = clock_timestamp(),
         updated_by = v_actor
   where id = v_policy.id
   returning * into v_policy;
  insert into public.impact_audit_events(actor_id, target_type, target_id, action, reason, snapshot)
  values (v_actor, 'reciprocity_state', v_policy.id, 'reciprocity_policy_updated', btrim(p_reason),
          jsonb_build_object('previous_required_experiences', v_previous,
            'required_experiences', v_policy.required_experiences,
            'policy_version', v_policy.policy_version,
            'policy_revision', v_policy.policy_revision));
  return v_policy;
end;
$$;

create or replace function public.redeem_claim(p_token text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_claim public.claims%rowtype;
  v_campaign public.campaigns%rowtype;
  v_offer public.offers%rowtype;
  v_partner public.partners%rowtype;
  v_category public.categories%rowtype;
  v_validity text;
  v_event_id uuid;
  v_state public.impact_reciprocity_state%rowtype;
  v_policy_active boolean;
  v_transition_at timestamptz;
  v_before integer;
  v_after integer;
  v_outcome text;
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
      insert into public.impact_reciprocity_redemptions(redemption_event_id,claim_id,student_id,effective_reciprocity_type,outcome)
      values(v_event_id,v_claim.id,v_claim.student_id,'OPEN','open_excluded');
    else
      insert into public.impact_reciprocity_state(student_id,cycle_started_at,updated_at)
      values(v_claim.student_id,clock_timestamp(),clock_timestamp()) on conflict(student_id) do nothing;
      select * into v_state from public.impact_reciprocity_state where student_id=v_claim.student_id for update;
      v_transition_at:=clock_timestamp();
      v_before:=v_state.community_redemption_count;
      if v_state.status='give_back_due' then
        v_after:=v_state.required_experiences;
        v_outcome:='due_capped';
      elsif v_before + 1 >= v_state.required_experiences then
        v_after:=v_state.required_experiences;
        v_outcome:='give_back_due';
      else
        v_after:=v_before+1;
        v_outcome:='counted';
      end if;
      update public.impact_reciprocity_state
         set community_redemption_count=v_after,
             status=case when v_after=v_state.required_experiences then 'give_back_due'::public.impact_reciprocity_status else 'open'::public.impact_reciprocity_status end,
             due_at=case when v_after=v_state.required_experiences then coalesce(due_at,v_transition_at) else null end,
             updated_at=v_transition_at
       where student_id=v_claim.student_id;
      insert into public.impact_reciprocity_redemptions(
        redemption_event_id,claim_id,student_id,effective_reciprocity_type,cycle_number,
        count_before,count_after,required_experiences,policy_version,outcome)
      values(v_event_id,v_claim.id,v_claim.student_id,'COMMUNITY',v_state.cycle_number,
        v_before,v_after,v_state.required_experiences,v_state.policy_version,v_outcome);
    end if;
  end if;
  insert into public.analytics_events(actor_id,event_name,entity_type,entity_id) values(auth.uid(),'redemption_completed','claim',v_claim.id);
  return 'REDEEMED';
end;
$$;

revoke execute on function public._impact_current_reciprocity_policy() from public, anon, authenticated;
revoke execute on function public.snapshot_impact_reciprocity_policy() from public, anon, authenticated;
revoke execute on function public.admin_update_impact_reciprocity_policy(integer, text) from public, anon;
grant execute on function public.admin_update_impact_reciprocity_policy(integer, text) to authenticated;
