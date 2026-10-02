-- Backend completion batch 1: trusted mock funding, effective claim validity,
-- and scheduler-ready stale-claim maintenance. Apply after 0004.

-- Orders and line items are now created only through the server-only checkout
-- function below. This removes the client-side path that could manufacture a
-- pending order for later funding.
drop policy if exists order_create on public.giver_orders;
drop policy if exists item_create on public.giver_order_items;

-- A campaign can accept a new claim only while its selling and fulfillment
-- configuration is operational. Scheduled events may be claimed before the
-- event starts, but require a bounded event window.
create or replace function public.campaign_is_claimable(p_campaign_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.campaigns c
    join public.offers o on o.id = c.offer_id
    join public.partners p on p.id = o.partner_id
    join public.categories category on category.id = o.category_id
    where c.id = p_campaign_id
      and c.status = 'active'
      and c.starts_at <= now()
      and c.ends_at > now()
      and o.active
      and p.active
      and category.active
      and (
        o.fulfillment_type <> 'scheduled_event'
        or (
          c.event_starts_at is not null
          and c.event_ends_at is not null
          and c.event_ends_at > now()
        )
      )
  );
$$;

-- This is the single redemption-time validity definition. It deliberately
-- separates a future scheduled event (not yet redeemable) from a permanently
-- invalid claim (expired). Both inspect and redeem use it.
create or replace function public.claim_redeemability(p_claim_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  claim_row record;
begin
  select cl.status, cl.expires_at, c.status as campaign_status, c.starts_at,
         c.ends_at, c.event_starts_at, c.event_ends_at, o.fulfillment_type,
         o.active as offer_active, p.active as partner_active,
         category.active as category_active
    into claim_row
    from public.claims cl
    join public.campaigns c on c.id = cl.campaign_id
    join public.offers o on o.id = c.offer_id
    join public.partners p on p.id = o.partner_id
    join public.categories category on category.id = o.category_id
   where cl.id = p_claim_id;

  if not found or claim_row.status <> 'active' then
    return 'expired';
  end if;

  if (claim_row.expires_at is not null and claim_row.expires_at <= now())
     or claim_row.campaign_status <> 'active'
     or claim_row.ends_at <= now()
     or not claim_row.offer_active
     or not claim_row.partner_active
     or not claim_row.category_active then
    return 'expired';
  end if;

  if claim_row.fulfillment_type = 'scheduled_event' then
    if claim_row.event_starts_at is null
       or claim_row.event_ends_at is null
       or claim_row.event_ends_at <= now() then
      return 'expired';
    end if;
    if claim_row.event_starts_at > now() then
      return 'not_yet_valid';
    end if;
  end if;

  if claim_row.starts_at > now() then
    return 'not_yet_valid';
  end if;

  return 'valid';
end;
$$;

-- Expire every claim that has become permanently invalid. Inventory is restored
-- only for an elapsed claim reservation and only while the campaign remains
-- claimable; a finished campaign/event never receives unusable inventory.
create or replace function public.expire_stale_claims()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  expired_count integer;
begin
  with expired_claim_rows as (
    update public.claims cl
       set status = 'expired'
     where cl.status = 'active'
       and public.claim_redeemability(cl.id) = 'expired'
     returning cl.id, cl.campaign_id, cl.expires_at
  ), restored_rows as (
    update public.campaigns c
       set quantity_available = c.quantity_available + 1
      from expired_claim_rows expired
     where c.id = expired.campaign_id
       and expired.expires_at is not null
       and expired.expires_at <= now()
       and public.campaign_is_claimable(c.id)
       and c.quantity_available < c.quantity_total
     returning expired.id
  )
  update public.claims cl
     set expired_inventory_restored_at = now()
   where cl.id in (select id from restored_rows)
     and cl.expired_inventory_restored_at is null;

  get diagnostics expired_count = row_count;
  return expired_count;
end;
$$;

-- Service-only checkout creation. Price, order total, and pending mock payment
-- are derived from the currently active offer and partner in one transaction.
create or replace function public.create_mock_checkout(
  p_giver_id uuid,
  p_offer_id uuid,
  p_quantity integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  trusted_price integer;
  order_id uuid;
begin
  if p_giver_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if p_quantity is null or p_quantity < 1 or p_quantity > 100 then
    raise exception 'INVALID_QUANTITY';
  end if;

  select o.giver_price_bani
    into trusted_price
    from public.offers o
    join public.partners p on p.id = o.partner_id
   where o.id = p_offer_id
     and o.active
     and p.active
   for update of o, p;

  if not found then
    raise exception 'OFFER_NOT_FUNDABLE';
  end if;

  insert into public.giver_orders(giver_id, total_bani)
  values (p_giver_id, trusted_price * p_quantity)
  returning id into order_id;

  insert into public.giver_order_items(order_id, offer_id, quantity, unit_price_bani)
  values (order_id, p_offer_id, p_quantity, trusted_price);

  insert into public.payments(order_id, provider, provider_reference, status, amount_bani)
  values (order_id, 'mock', 'mock_' || gen_random_uuid()::text, 'pending', trusted_price * p_quantity);

  return order_id;
end;
$$;

-- This function is deliberately callable only by the trusted application or a
-- future provider webhook using the service role. It validates every stored
-- payment/order/item relationship again before inventory is funded.
create or replace function public.confirm_mock_payment(p_order_id uuid, p_success boolean)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  order_row public.giver_orders%rowtype;
  payment_row public.payments%rowtype;
  item_row record;
  trusted_total bigint := 0;
  item_count integer := 0;
begin
  select * into order_row from public.giver_orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  if order_row.status <> 'pending' then
    return order_row.status::text;
  end if;

  select * into payment_row from public.payments where order_id = order_row.id for update;
  if not found
     or payment_row.provider <> 'mock'
     or payment_row.status <> 'pending' then
    raise exception 'PAYMENT_INVALID';
  end if;

  -- A failure never creates inventory. It is safe to record even when an
  -- offer was deactivated after checkout, so a pending mock payment cannot
  -- become stranded solely because its catalog item changed state.
  if not p_success then
    update public.giver_orders set status = 'failed' where id = order_row.id;
    update public.payments set status = 'failed', confirmed_at = now() where id = payment_row.id;
    return 'failed';
  end if;

  for item_row in
    select oi.offer_id, oi.quantity, oi.unit_price_bani, o.giver_price_bani,
           o.active as offer_active, p.active as partner_active
      from public.giver_order_items oi
      join public.offers o on o.id = oi.offer_id
      join public.partners p on p.id = o.partner_id
     where oi.order_id = order_row.id
     for update of oi, o, p
  loop
    item_count := item_count + 1;
    if item_row.quantity < 1 or item_row.quantity > 100 then
      raise exception 'INVALID_QUANTITY';
    end if;
    if not item_row.offer_active or not item_row.partner_active then
      raise exception 'OFFER_NOT_FUNDABLE';
    end if;
    if item_row.unit_price_bani <> item_row.giver_price_bani then
      raise exception 'ORDER_PRICE_MISMATCH';
    end if;
    trusted_total := trusted_total + (item_row.quantity::bigint * item_row.giver_price_bani::bigint);
  end loop;

  if item_count = 0 or trusted_total <> order_row.total_bani::bigint then
    raise exception 'ORDER_TOTAL_MISMATCH';
  end if;
  if payment_row.amount_bani::bigint <> trusted_total then
    raise exception 'PAYMENT_AMOUNT_MISMATCH';
  end if;

  update public.giver_orders set status = 'paid', paid_at = now() where id = order_row.id;
  update public.payments set status = 'succeeded', confirmed_at = now() where id = payment_row.id;

  for item_row in
    select offer_id, quantity from public.giver_order_items where order_id = order_row.id
  loop
    insert into public.campaigns(
      offer_id, giver_order_id, name, sponsor_type, funding_source,
      quantity_total, quantity_available, starts_at, ends_at,
      claim_expiration_minutes, status
    ) values (
      item_row.offer_id, order_row.id, 'Cinste din comunitate', 'individual', 'mock_payment',
      item_row.quantity, item_row.quantity, now(), now() + interval '30 days', 60, 'active'
    );
  end loop;

  insert into public.analytics_events(actor_id, event_name, entity_type, entity_id)
  values (order_row.giver_id, 'mock_payment_completed', 'order', order_row.id);
  return 'paid';
end;
$$;

-- Claim creation reclaims expired reservations before checking inventory.
create or replace function public.claim_campaign(p_campaign_id uuid)
returns table(claim_id uuid, redemption_token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student uuid := auth.uid();
  v_campaign public.campaigns%rowtype;
  v_token text := encode(extensions.gen_random_bytes(32), 'hex');
  v_exp timestamptz;
begin
  if v_student is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  perform public.expire_stale_claims();
  perform pg_advisory_xact_lock(hashtext(v_student::text));
  if not exists (select 1 from public.student_profiles where user_id = v_student and verification_status = 'verified') then
    raise exception 'STUDENT_NOT_VERIFIED';
  end if;
  if exists (select 1 from public.claims where student_id = v_student and status in ('active', 'redeemed') and claimed_at > now() - interval '24 hours') then
    raise exception 'CLAIM_LIMIT_REACHED';
  end if;
  select c.* into v_campaign
    from public.campaigns c
    join public.offers o on o.id = c.offer_id
    join public.partners p on p.id = o.partner_id
    join public.categories category on category.id = o.category_id
   where c.id = p_campaign_id and c.status = 'active' and c.starts_at <= now() and c.ends_at > now()
     and o.active and p.active and category.active
     and (o.fulfillment_type <> 'scheduled_event' or (c.event_starts_at is not null and c.event_ends_at is not null and c.event_ends_at > now()))
   for update of c;
  if not found then raise exception 'CAMPAIGN_UNAVAILABLE'; end if;
  if v_campaign.quantity_available < 1 then raise exception 'SOLD_OUT'; end if;
  update public.campaigns set quantity_available = quantity_available - 1 where id = p_campaign_id and quantity_available > 0 returning * into v_campaign;
  if not found then raise exception 'SOLD_OUT'; end if;
  v_exp := case when v_campaign.claim_expiration_minutes is null then null else now() + make_interval(mins => v_campaign.claim_expiration_minutes) end;
  insert into public.claims(campaign_id, student_id, token_hash, token_hint, expires_at)
  values (p_campaign_id, v_student, encode(extensions.digest(v_token, 'sha256'), 'hex'), right(v_token, 6), v_exp) returning id into claim_id;
  insert into public.claim_secrets(claim_id, student_id, redemption_token) values (claim_id, v_student, v_token);
  redemption_token := v_token; expires_at := v_exp;
  insert into public.analytics_events(actor_id, event_name, entity_type, entity_id) values (v_student, 'claim_completed', 'campaign', p_campaign_id);
  return next;
end;
$$;

create or replace function public.inspect_redemption(p_token text)
returns table(state text, claim_id uuid, offer_name text, partner_name text, partner_id uuid, expires_at timestamptz, redeemed_at timestamptz)
language plpgsql security definer set search_path = public
as $$
declare claim_row record; validity text;
begin
  perform public.expire_stale_claims();
  select cl.id, cl.status, cl.expires_at, cl.redeemed_at, o.name as offer_name, p.name as partner_name, p.id as partner_id
    into claim_row from public.claims cl join public.campaigns c on c.id = cl.campaign_id join public.offers o on o.id = c.offer_id join public.partners p on p.id = o.partner_id
   where cl.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
  if not found then return query select 'INVALID CODE'::text, null::uuid, null::text, null::text, null::uuid, null::timestamptz, null::timestamptz; return; end if;
  if claim_row.status = 'redeemed' then return query select 'ALREADY REDEEMED'::text, claim_row.id, claim_row.offer_name, claim_row.partner_name, claim_row.partner_id, claim_row.expires_at, claim_row.redeemed_at; return; end if;
  if claim_row.status = 'expired' then return query select 'EXPIRED'::text, claim_row.id, claim_row.offer_name, claim_row.partner_name, claim_row.partner_id, claim_row.expires_at, claim_row.redeemed_at; return; end if;
  if not public.is_partner_for(claim_row.partner_id) then return query select 'NOT VALID AT THIS PARTNER'::text, claim_row.id, claim_row.offer_name, claim_row.partner_name, claim_row.partner_id, claim_row.expires_at, claim_row.redeemed_at; return; end if;
  validity := public.claim_redeemability(claim_row.id);
  if validity = 'not_yet_valid' then return query select 'NOT YET VALID'::text, claim_row.id, claim_row.offer_name, claim_row.partner_name, claim_row.partner_id, claim_row.expires_at, claim_row.redeemed_at; return; end if;
  if validity <> 'valid' then return query select 'EXPIRED'::text, claim_row.id, claim_row.offer_name, claim_row.partner_name, claim_row.partner_id, claim_row.expires_at, claim_row.redeemed_at; return; end if;
  return query select 'VALID'::text, claim_row.id, claim_row.offer_name, claim_row.partner_name, claim_row.partner_id, claim_row.expires_at, claim_row.redeemed_at;
end;
$$;

create or replace function public.redeem_claim(p_token text)
returns text
language plpgsql security definer set search_path = public
as $$
declare v_claim_id uuid; v_status public.claim_status; v_partner uuid; validity text;
begin
  perform public.expire_stale_claims();
  select cl.id, cl.status, o.partner_id into v_claim_id, v_status, v_partner
    from public.claims cl join public.campaigns c on c.id = cl.campaign_id join public.offers o on o.id = c.offer_id
   where cl.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex') for update;
  if not found then return 'INVALID CODE'; end if;
  if not public.is_partner_for(v_partner) then return 'NOT VALID AT THIS PARTNER'; end if;
  if v_status = 'redeemed' then return 'ALREADY REDEEMED'; end if;
  if v_status = 'expired' then return 'EXPIRED'; end if;
  if v_status <> 'active' then return 'INVALID CODE'; end if;
  validity := public.claim_redeemability(v_claim_id);
  if validity = 'not_yet_valid' then return 'NOT YET VALID'; end if;
  if validity <> 'valid' then return 'EXPIRED'; end if;
  update public.claims set status = 'redeemed', redeemed_at = now() where id = v_claim_id;
  insert into public.redemption_events(claim_id, partner_id, partner_user_id) values (v_claim_id, v_partner, auth.uid());
  insert into public.analytics_events(actor_id, event_name, entity_type, entity_id) values (auth.uid(), 'redemption_completed', 'claim', v_claim_id);
  return 'REDEEMED';
end;
$$;

revoke execute on function public.create_mock_checkout(uuid, uuid, integer) from public, anon, authenticated;
revoke execute on function public.confirm_mock_payment(uuid, boolean) from public, anon, authenticated;
revoke execute on function public.expire_stale_claims() from public, anon, authenticated;
revoke execute on function public.campaign_is_claimable(uuid) from public, anon, authenticated;
revoke execute on function public.claim_redeemability(uuid) from public, anon, authenticated;
grant execute on function public.create_mock_checkout(uuid, uuid, integer), public.confirm_mock_payment(uuid, boolean), public.expire_stale_claims() to service_role;
grant execute on function public.claim_campaign(uuid), public.inspect_redemption(text), public.redeem_claim(text) to authenticated;
