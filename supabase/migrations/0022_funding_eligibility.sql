-- V1 funding is exclusive to accounts whose stored profile role is Giver.
-- Browser sessions never execute these functions directly: the trusted web
-- server passes the user ID returned by Auth, and the database rechecks both
-- current eligibility and order ownership before any financial side effect.

create or replace function public.create_mock_checkout(
  p_giver_id uuid,
  p_offer_id uuid,
  p_quantity integer
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  trusted_price integer;
  order_id uuid;
begin
  if p_giver_id is null or not exists (
    select 1
      from public.profiles profile
     where profile.id = p_giver_id
       and profile.role = 'giver'::public.app_role
  ) then
    raise exception 'GIVER_REQUIRED';
  end if;

  if p_quantity is null or p_quantity < 1 or p_quantity > 100 then
    raise exception 'INVALID_QUANTITY';
  end if;

  select offer.giver_price_bani
    into trusted_price
    from public.offers offer
    join public.partners partner on partner.id = offer.partner_id
   where offer.id = p_offer_id
     and offer.active
     and partner.active
   for update of offer, partner;

  if not found then
    raise exception 'OFFER_NOT_FUNDABLE';
  end if;

  insert into public.giver_orders(giver_id, total_bani)
  values (p_giver_id, trusted_price * p_quantity)
  returning id into order_id;

  insert into public.giver_order_items(order_id, offer_id, quantity, unit_price_bani)
  values (order_id, p_offer_id, p_quantity, trusted_price);

  insert into public.payments(order_id, provider, provider_reference, status, amount_bani)
  values (
    order_id,
    'mock',
    'mock_' || extensions.gen_random_uuid()::text,
    'pending',
    trusted_price * p_quantity
  );

  return order_id;
end;
$$;

alter function public.create_mock_checkout(uuid, uuid, integer) owner to postgres;

-- Replace the former order-ID-only signature. The authenticated owner is an
-- explicit trusted-server input and must match the stored order owner.
drop function public.confirm_mock_payment(uuid, boolean);

create function public.confirm_mock_payment(
  p_giver_id uuid,
  p_order_id uuid,
  p_success boolean
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  order_row public.giver_orders%rowtype;
  payment_row public.payments%rowtype;
  item_row record;
  trusted_total bigint := 0;
  item_count integer := 0;
begin
  if p_giver_id is null or not exists (
    select 1
      from public.profiles profile
     where profile.id = p_giver_id
       and profile.role = 'giver'::public.app_role
  ) then
    raise exception 'GIVER_REQUIRED';
  end if;

  select *
    into order_row
    from public.giver_orders
   where id = p_order_id
     and giver_id = p_giver_id
   for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  if order_row.status <> 'pending' then
    return order_row.status::text;
  end if;

  select *
    into payment_row
    from public.payments
   where order_id = order_row.id
   for update;

  if not found
     or payment_row.provider <> 'mock'
     or payment_row.status <> 'pending' then
    raise exception 'PAYMENT_INVALID';
  end if;

  -- A failed simulation records no inventory. Eligibility and ownership were
  -- still established first, so another user cannot fail an order they saw.
  if not p_success then
    update public.giver_orders set status = 'failed' where id = order_row.id;
    update public.payments
       set status = 'failed', confirmed_at = now()
     where id = payment_row.id;
    return 'failed';
  end if;

  for item_row in
    select oi.offer_id, oi.quantity, oi.unit_price_bani, offer.giver_price_bani,
           offer.active as offer_active, partner.active as partner_active
      from public.giver_order_items oi
      join public.offers offer on offer.id = oi.offer_id
      join public.partners partner on partner.id = offer.partner_id
     where oi.order_id = order_row.id
     for update of oi, offer, partner
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
    trusted_total := trusted_total
      + (item_row.quantity::bigint * item_row.giver_price_bani::bigint);
  end loop;

  if item_count = 0 or trusted_total <> order_row.total_bani::bigint then
    raise exception 'ORDER_TOTAL_MISMATCH';
  end if;
  if payment_row.amount_bani::bigint <> trusted_total then
    raise exception 'PAYMENT_AMOUNT_MISMATCH';
  end if;

  update public.giver_orders
     set status = 'paid', paid_at = now()
   where id = order_row.id;
  update public.payments
     set status = 'succeeded', confirmed_at = now()
   where id = payment_row.id;

  for item_row in
    select offer_id, quantity
      from public.giver_order_items
     where order_id = order_row.id
  loop
    insert into public.campaigns(
      offer_id, giver_order_id, name, sponsor_type, funding_source,
      quantity_total, quantity_available, starts_at, ends_at,
      claim_expiration_minutes, status
    ) values (
      item_row.offer_id, order_row.id, 'Cinste din comunitate', 'individual',
      'mock_payment', item_row.quantity, item_row.quantity, now(),
      now() + interval '30 days', 60, 'active'
    );
  end loop;

  insert into public.analytics_events(actor_id, event_name, entity_type, entity_id)
  values (p_giver_id, 'mock_payment_completed', 'order', order_row.id);
  return 'paid';
end;
$$;

alter function public.confirm_mock_payment(uuid, uuid, boolean) owner to postgres;

-- Admins retain the existing read policies for operational inspection, but no
-- authenticated application role has a direct financial-table write path.
drop policy if exists admin_orders_manage on public.giver_orders;
drop policy if exists admin_items_manage on public.giver_order_items;
drop policy if exists admin_payments_manage on public.payments;

revoke insert, update, delete on table public.giver_orders
  from anon, authenticated;
revoke insert, update, delete on table public.giver_order_items
  from anon, authenticated;
revoke insert, update, delete on table public.payments
  from anon, authenticated;

revoke all on function public.create_mock_checkout(uuid, uuid, integer)
  from public, anon, authenticated;
revoke all on function public.confirm_mock_payment(uuid, uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.create_mock_checkout(uuid, uuid, integer)
  to service_role;
grant execute on function public.confirm_mock_payment(uuid, uuid, boolean)
  to service_role;
