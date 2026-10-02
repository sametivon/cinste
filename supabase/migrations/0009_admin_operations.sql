-- Backend completion batch 3: operator-safe campaign and partner-user actions.
-- Apply after 0008.

create or replace function public.admin_assign_partner_user(p_partner_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if not exists (select 1 from public.partners where id = p_partner_id) then raise exception 'PARTNER_NOT_FOUND'; end if;
  if not exists (select 1 from public.profiles where id = p_user_id and role = 'partner') then raise exception 'PARTNER_USER_INELIGIBLE'; end if;
  if exists (select 1 from public.partner_users where partner_id = p_partner_id and user_id = p_user_id) then raise exception 'PARTNER_USER_ALREADY_ASSIGNED'; end if;
  insert into public.partner_users(partner_id, user_id) values (p_partner_id, p_user_id);
end;
$$;

create or replace function public.admin_revoke_partner_user(p_partner_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  delete from public.partner_users where partner_id = p_partner_id and user_id = p_user_id;
  if not found then raise exception 'PARTNER_USER_ASSIGNMENT_NOT_FOUND'; end if;
end;
$$;

create or replace function public.admin_create_campaign(
  p_offer_id uuid,
  p_name text,
  p_quantity integer,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_claim_expiration_minutes integer,
  p_sponsor_type text,
  p_sponsor_display_name text,
  p_event_starts_at timestamptz default null,
  p_event_ends_at timestamptz default null,
  p_status public.campaign_status default 'active'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_offer record;
  v_campaign_id uuid;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if coalesce(length(btrim(p_name)), 0) < 2 or length(p_name) > 160 then raise exception 'INVALID_CAMPAIGN_NAME'; end if;
  if p_quantity is null or p_quantity < 1 or p_quantity > 10000 then raise exception 'INVALID_QUANTITY'; end if;
  if p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at then raise exception 'INVALID_CAMPAIGN_WINDOW'; end if;
  if p_claim_expiration_minutes is not null and (p_claim_expiration_minutes < 1 or p_claim_expiration_minutes > 10080) then raise exception 'INVALID_CLAIM_EXPIRATION'; end if;
  if p_sponsor_type not in ('individual', 'company', 'creator', 'cinste', 'partner') then raise exception 'INVALID_SPONSOR_TYPE'; end if;
  if p_status not in ('draft', 'active', 'paused') then raise exception 'INVALID_CAMPAIGN_STATUS'; end if;

  select o.fulfillment_type into v_offer
    from public.offers o
    join public.partners partner on partner.id = o.partner_id
    join public.categories category on category.id = o.category_id
   where o.id = p_offer_id and o.active and partner.active and category.active
   for key share of o, partner, category;
  if not found then raise exception 'OFFER_NOT_OPERATIONAL'; end if;

  if v_offer.fulfillment_type = 'scheduled_event' then
    if p_event_starts_at is null or p_event_ends_at is null or p_event_ends_at <= p_event_starts_at then raise exception 'INVALID_EVENT_WINDOW'; end if;
    if p_event_starts_at < p_starts_at or p_event_ends_at > p_ends_at then raise exception 'EVENT_OUTSIDE_CAMPAIGN_WINDOW'; end if;
  elsif p_event_starts_at is not null or p_event_ends_at is not null then
    raise exception 'EVENT_WINDOW_NOT_ALLOWED';
  end if;

  insert into public.campaigns(
    offer_id, name, sponsor_type, sponsor_display_name, funding_source,
    quantity_total, quantity_available, starts_at, ends_at,
    claim_expiration_minutes, event_starts_at, event_ends_at, status
  ) values (
    p_offer_id, btrim(p_name), p_sponsor_type, nullif(btrim(coalesce(p_sponsor_display_name, '')), ''), 'admin',
    p_quantity, p_quantity, p_starts_at, p_ends_at,
    p_claim_expiration_minutes, p_event_starts_at, p_event_ends_at, p_status
  ) returning id into v_campaign_id;
  return v_campaign_id;
end;
$$;

-- Scheduling and status can change only before the campaign has produced a
-- claim. Inventory totals and availability are deliberately not parameters.
create or replace function public.admin_update_campaign(
  p_campaign_id uuid,
  p_name text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_claim_expiration_minutes integer,
  p_event_starts_at timestamptz default null,
  p_event_ends_at timestamptz default null,
  p_status public.campaign_status default 'active'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign record;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  select c.id, c.offer_id, c.status, o.fulfillment_type, o.active as offer_active, partner.active as partner_active, category.active as category_active into v_campaign
    from public.campaigns c join public.offers o on o.id = c.offer_id
    join public.partners partner on partner.id = o.partner_id
    join public.categories category on category.id = o.category_id
   where c.id = p_campaign_id for update of c;
  if not found then raise exception 'CAMPAIGN_NOT_FOUND'; end if;
  if v_campaign.status = 'ended' then raise exception 'CAMPAIGN_ENDED_IMMUTABLE'; end if;
  if exists (select 1 from public.claims where campaign_id = p_campaign_id) then raise exception 'CAMPAIGN_HAS_CLAIMS'; end if;
  if coalesce(length(btrim(p_name)), 0) < 2 or length(p_name) > 160 then raise exception 'INVALID_CAMPAIGN_NAME'; end if;
  if p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at then raise exception 'INVALID_CAMPAIGN_WINDOW'; end if;
  if p_claim_expiration_minutes is not null and (p_claim_expiration_minutes < 1 or p_claim_expiration_minutes > 10080) then raise exception 'INVALID_CLAIM_EXPIRATION'; end if;
  if p_status not in ('draft', 'active', 'paused') then raise exception 'INVALID_CAMPAIGN_STATUS'; end if;
  if p_status = 'active' and (not v_campaign.offer_active or not v_campaign.partner_active or not v_campaign.category_active) then raise exception 'OFFER_NOT_OPERATIONAL'; end if;
  if v_campaign.fulfillment_type = 'scheduled_event' then
    if p_event_starts_at is null or p_event_ends_at is null or p_event_ends_at <= p_event_starts_at then raise exception 'INVALID_EVENT_WINDOW'; end if;
    if p_event_starts_at < p_starts_at or p_event_ends_at > p_ends_at then raise exception 'EVENT_OUTSIDE_CAMPAIGN_WINDOW'; end if;
  elsif p_event_starts_at is not null or p_event_ends_at is not null then
    raise exception 'EVENT_WINDOW_NOT_ALLOWED';
  end if;
  update public.campaigns set
    name = btrim(p_name), starts_at = p_starts_at, ends_at = p_ends_at,
    claim_expiration_minutes = p_claim_expiration_minutes,
    event_starts_at = p_event_starts_at, event_ends_at = p_event_ends_at,
    status = p_status
  where id = p_campaign_id;
end;
$$;

revoke execute on function public.admin_assign_partner_user(uuid, uuid) from public, anon;
revoke execute on function public.admin_revoke_partner_user(uuid, uuid) from public, anon;
revoke execute on function public.admin_create_campaign(uuid, text, integer, timestamptz, timestamptz, integer, text, text, timestamptz, timestamptz, public.campaign_status) from public, anon;
revoke execute on function public.admin_update_campaign(uuid, text, timestamptz, timestamptz, integer, timestamptz, timestamptz, public.campaign_status) from public, anon;
grant execute on function public.admin_assign_partner_user(uuid, uuid), public.admin_revoke_partner_user(uuid, uuid) to authenticated;
grant execute on function public.admin_create_campaign(uuid, text, integer, timestamptz, timestamptz, integer, text, text, timestamptz, timestamptz, public.campaign_status) to authenticated;
grant execute on function public.admin_update_campaign(uuid, text, timestamptz, timestamptz, integer, timestamptz, timestamptz, public.campaign_status) to authenticated;
