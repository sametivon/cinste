// Disposable in-memory PostgreSQL only: never reads .env or connects to a host.
import { after, afterEach, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

const db = new PGlite({ extensions: { pgcrypto } });
const migrationUrl = new URL('../supabase/migrations/0022_funding_eligibility.sql', import.meta.url);
const query = async (sql, params = []) => (await db.query(sql, params)).rows;
const scalar = async (sql, params = []) => Object.values((await query(sql, params))[0])[0];

const ids = {
  giverA: randomUUID(), giverB: randomUUID(), student: randomUUID(),
  partnerUser: randomUUID(), admin: randomUUID(), partner: randomUUID(),
  offer: randomUUID(),
};

before(async () => {
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema auth authorization postgres;
    create schema extensions authorization postgres;
    create extension pgcrypto with schema extensions;

    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    create type public.app_role as enum ('student', 'giver', 'partner', 'admin');
    create type public.order_status as enum ('pending', 'paid', 'failed');
    create type public.payment_status as enum ('pending', 'succeeded', 'failed');
    create type public.campaign_status as enum ('draft', 'active', 'paused', 'ended');

    create table public.profiles (
      id uuid primary key, email text not null, role public.app_role not null
    );
    create table public.partners (
      id uuid primary key, active boolean not null default true
    );
    create table public.offers (
      id uuid primary key, partner_id uuid not null references public.partners(id),
      giver_price_bani integer not null, active boolean not null default true
    );
    create table public.giver_orders (
      id uuid primary key default extensions.gen_random_uuid(),
      giver_id uuid not null references public.profiles(id),
      status public.order_status not null default 'pending',
      total_bani integer not null, created_at timestamptz not null default now(),
      paid_at timestamptz
    );
    create table public.giver_order_items (
      id uuid primary key default extensions.gen_random_uuid(),
      order_id uuid not null references public.giver_orders(id) on delete cascade,
      offer_id uuid not null references public.offers(id), quantity integer not null,
      unit_price_bani integer not null
    );
    create table public.payments (
      id uuid primary key default extensions.gen_random_uuid(),
      order_id uuid not null unique references public.giver_orders(id) on delete cascade,
      provider text not null, provider_reference text not null unique,
      status public.payment_status not null default 'pending', amount_bani integer not null,
      confirmed_at timestamptz, created_at timestamptz not null default now()
    );
    create table public.campaigns (
      id uuid primary key default extensions.gen_random_uuid(),
      offer_id uuid not null references public.offers(id),
      giver_order_id uuid references public.giver_orders(id), name text not null,
      sponsor_type text not null, funding_source text not null,
      quantity_total integer not null, quantity_available integer not null,
      starts_at timestamptz not null, ends_at timestamptz not null,
      claim_expiration_minutes integer, status public.campaign_status not null
    );
    create table public.analytics_events (
      id uuid primary key default extensions.gen_random_uuid(), actor_id uuid,
      event_name text not null, entity_type text, entity_id uuid
    );

    create function public.is_admin() returns boolean language sql stable as $$
      select exists (select 1 from public.profiles where id=auth.uid() and role='admin')
    $$;
    alter table public.giver_orders enable row level security;
    alter table public.giver_order_items enable row level security;
    alter table public.payments enable row level security;
    create policy order_self on public.giver_orders for select
      using (giver_id=auth.uid() or public.is_admin());
    create policy item_self on public.giver_order_items for select using (
      exists(select 1 from public.giver_orders where id=order_id and (giver_id=auth.uid() or public.is_admin()))
    );
    create policy payment_self on public.payments for select using (
      exists(select 1 from public.giver_orders where id=order_id and (giver_id=auth.uid() or public.is_admin()))
    );
    create policy admin_orders_manage on public.giver_orders for all
      using (public.is_admin()) with check (public.is_admin());
    create policy admin_items_manage on public.giver_order_items for all
      using (public.is_admin()) with check (public.is_admin());
    create policy admin_payments_manage on public.payments for all
      using (public.is_admin()) with check (public.is_admin());

    create function public.create_mock_checkout(uuid, uuid, integer) returns uuid
      language sql security definer as $$ select null::uuid $$;
    create function public.confirm_mock_payment(uuid, boolean) returns text
      language sql security definer as $$ select null::text $$;

    grant usage on schema public, auth, extensions to anon, authenticated, service_role;
    grant execute on function auth.uid(), public.is_admin() to anon, authenticated, service_role;
    grant select, insert, update, delete on all tables in schema public
      to anon, authenticated, service_role;
    grant execute on function public.create_mock_checkout(uuid, uuid, integer),
      public.confirm_mock_payment(uuid, boolean) to authenticated, service_role;

    insert into public.profiles(id,email,role) values
      ('${ids.giverA}','giver-a@test.invalid','giver'),
      ('${ids.giverB}','giver-b@test.invalid','giver'),
      ('${ids.student}','student@test.invalid','student'),
      ('${ids.partnerUser}','partner@test.invalid','partner'),
      ('${ids.admin}','admin@test.invalid','admin');
    insert into public.partners(id,active) values ('${ids.partner}',true);
    insert into public.offers(id,partner_id,giver_price_bani,active)
      values ('${ids.offer}','${ids.partner}',1250,true);
  `);
  await db.exec(await readFile(migrationUrl, 'utf8'));
});

beforeEach(async () => { await db.exec('begin'); });
afterEach(async () => { await db.exec('rollback'); });
after(async () => { await db.close(); });

async function serviceScalar(sql, params = []) {
  await db.exec('set local role service_role');
  const value = await scalar(sql, params);
  await db.exec('reset role');
  return value;
}

async function rejectAs(role, sql, params = [], code = 'P0001') {
  await db.exec('savepoint expected_failure');
  await db.exec(`set local role ${role}`);
  await assert.rejects(query(sql, params), error => error.code === code);
  await db.exec('rollback to savepoint expected_failure');
}

async function counts() {
  const [row] = await query(`select
    (select count(*)::int from public.giver_orders) as orders,
    (select count(*)::int from public.giver_order_items) as items,
    (select count(*)::int from public.payments) as payments,
    (select count(*)::int from public.campaigns) as campaigns,
    (select count(*)::int from public.analytics_events) as events`);
  return row;
}

test('only a stored Giver profile can create a checkout, with zero denial side effects', async () => {
  for (const deniedId of [ids.student, ids.partnerUser, ids.admin]) {
    const before = await counts();
    await rejectAs('service_role', 'select public.create_mock_checkout($1,$2,1)', [deniedId, ids.offer]);
    assert.deepEqual(await counts(), before);
  }

  const orderId = await serviceScalar('select public.create_mock_checkout($1,$2,2)', [ids.giverA, ids.offer]);
  assert.match(orderId, /^[0-9a-f-]{36}$/);
  assert.deepEqual(await counts(), { orders: 1, items: 1, payments: 1, campaigns: 0, events: 0 });
  assert.deepEqual(await query('select giver_id,total_bani,status from public.giver_orders where id=$1', [orderId]), [
    { giver_id: ids.giverA, total_bani: 2500, status: 'pending' },
  ]);
});

test('confirmation binds the authenticated Giver ID to the stored order owner', async () => {
  const orderId = await serviceScalar('select public.create_mock_checkout($1,$2,1)', [ids.giverA, ids.offer]);
  const before = await counts();
  await rejectAs('service_role', 'select public.confirm_mock_payment($1,$2,true)', [ids.giverB, orderId]);
  assert.deepEqual(await counts(), before);
  assert.equal(await scalar('select status from public.giver_orders where id=$1', [orderId]), 'pending');
  assert.equal(await scalar('select status from public.payments where order_id=$1', [orderId]), 'pending');

  assert.equal(await serviceScalar('select public.confirm_mock_payment($1,$2,true)', [ids.giverA, orderId]), 'paid');
  assert.equal(await scalar('select count(*)::int from public.campaigns where giver_order_id=$1', [orderId]), 1);
  assert.equal(await scalar('select count(*)::int from public.analytics_events where actor_id=$1', [ids.giverA]), 1);
});

test('current eligibility is rechecked on confirmation with zero denial side effects', async () => {
  const orderId = await serviceScalar('select public.create_mock_checkout($1,$2,1)', [ids.giverA, ids.offer]);
  for (const role of ['student', 'partner', 'admin']) {
    await query('update public.profiles set role=$2 where id=$1', [ids.giverA, role]);
    const before = await counts();
    await rejectAs('service_role', 'select public.confirm_mock_payment($1,$2,false)', [ids.giverA, orderId]);
    assert.deepEqual(await counts(), before);
    assert.equal(await scalar('select status from public.giver_orders where id=$1', [orderId]), 'pending');
    assert.equal(await scalar('select status from public.payments where order_id=$1', [orderId]), 'pending');
  }
});

test('funding RPCs remain service-only and the obsolete confirmation signature is gone', async () => {
  assert.equal(await scalar("select to_regprocedure('public.confirm_mock_payment(uuid,boolean)') is null"), true);
  for (const role of ['anon', 'authenticated']) {
    assert.equal(await scalar("select has_function_privilege($1, 'public.create_mock_checkout(uuid,uuid,integer)', 'execute')", [role]), false);
    assert.equal(await scalar("select has_function_privilege($1, 'public.confirm_mock_payment(uuid,uuid,boolean)', 'execute')", [role]), false);
    await rejectAs(role, 'select public.create_mock_checkout($1,$2,1)', [ids.giverA, ids.offer], '42501');
    await rejectAs(role, 'select public.confirm_mock_payment($1,$2,true)', [ids.giverA, randomUUID()], '42501');
  }
  assert.equal(await scalar("select has_function_privilege('service_role', 'public.create_mock_checkout(uuid,uuid,integer)', 'execute')"), true);
  assert.equal(await scalar("select has_function_privilege('service_role', 'public.confirm_mock_payment(uuid,uuid,boolean)', 'execute')"), true);
});

test('Student, Giver, Partner, and Admin cannot write financial tables directly', async () => {
  for (const userId of [ids.student, ids.giverA, ids.partnerUser, ids.admin]) {
    await query("select set_config('request.jwt.claim.sub',$1,true)", [userId]);
    await rejectAs('authenticated', 'insert into public.giver_orders(giver_id,total_bani) values ($1,1)', [userId], '42501');
    await rejectAs('authenticated', "update public.giver_orders set status='failed'", [], '42501');
    await rejectAs('authenticated', 'delete from public.giver_orders', [], '42501');
    await rejectAs('authenticated', 'insert into public.giver_order_items(order_id,offer_id,quantity,unit_price_bani) values ($1,$2,1,1)', [randomUUID(), ids.offer], '42501');
    await rejectAs('authenticated', 'update public.giver_order_items set quantity=2', [], '42501');
    await rejectAs('authenticated', 'delete from public.giver_order_items', [], '42501');
    await rejectAs('authenticated', 'insert into public.payments(order_id,provider,provider_reference,amount_bani) values ($1,\'mock\',$2,1)', [randomUUID(), randomUUID()], '42501');
    await rejectAs('authenticated', "update public.payments set status='failed'", [], '42501');
    await rejectAs('authenticated', 'delete from public.payments', [], '42501');
  }
});

test('funding functions use postgres ownership and fixed safe search paths', async () => {
  const functions = await query(`select p.proname, p.prosecdef, p.proconfig, r.rolname
    from pg_proc p join pg_roles r on r.oid=p.proowner
    where p.oid in (
      'public.create_mock_checkout(uuid,uuid,integer)'::regprocedure,
      'public.confirm_mock_payment(uuid,uuid,boolean)'::regprocedure
    ) order by p.proname`);
  assert.equal(functions.length, 2);
  assert.ok(functions.every(fn => fn.rolname === 'postgres' && fn.prosecdef));
  assert.ok(functions.every(fn => fn.proconfig.includes('search_path=pg_catalog, public, pg_temp')));
});
