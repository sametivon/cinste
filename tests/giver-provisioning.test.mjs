// Disposable in-memory PostgreSQL only: never reads .env or connects to a host.
// PGlite has one session, so replay and duplicate behavior are deterministic;
// true simultaneous transaction contention remains a hosted validation gate.
import { after, afterEach, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

const db = new PGlite({ extensions: { pgcrypto } });
const migrationUrl = new URL('../supabase/migrations/0021_giver_signup_provisioning.sql', import.meta.url);
const query = async (sql, params = []) => (await db.query(sql, params)).rows;
const scalar = async (sql, params = []) => Object.values((await query(sql, params))[0])[0];

before(async () => {
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema auth authorization postgres;
    create schema extensions authorization postgres;
    create schema cinste_private authorization postgres;
    create extension pgcrypto with schema extensions;

    create table auth.users (
      id uuid primary key,
      email text not null unique,
      raw_user_meta_data jsonb not null default '{}'::jsonb,
      email_confirmed_at timestamptz
    );
    create table auth.identities (
      id uuid primary key,
      user_id uuid not null references auth.users(id) on delete cascade,
      identity_data jsonb not null default '{}'::jsonb
    );
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;

    create type public.app_role as enum ('student', 'giver', 'partner', 'admin');
    create table public.profiles (
      id uuid primary key references auth.users(id) on delete cascade,
      email text not null,
      role public.app_role not null default 'student',
      display_name text,
      created_at timestamptz not null default now()
    );
    alter table public.profiles enable row level security;
    create policy profiles_self on public.profiles for select using (id = auth.uid());

    create function public.handle_new_user() returns trigger
    language plpgsql security definer set search_path = public as $$
    begin
      insert into public.profiles(id, email, display_name)
      values (new.id, new.email, new.raw_user_meta_data ->> 'display_name');
      return new;
    end $$;
    create trigger on_auth_user_created after insert on auth.users
      for each row execute procedure public.handle_new_user();

    grant usage on schema public, auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
    grant select, insert, update, delete on public.profiles to anon, authenticated, service_role;
  `);
  await db.exec(await readFile(migrationUrl, 'utf8'));
});

beforeEach(async () => { await db.exec('begin'); });
afterEach(async () => { await db.exec('rollback'); });
after(async () => { await db.close(); });

async function reject(sql, params = [], code = 'P0001') {
  await db.exec('savepoint expected_failure');
  await assert.rejects(query(sql, params), error => error.code === code);
  await db.exec('rollback to savepoint expected_failure');
}

async function issue(email) {
  await db.exec('set local role service_role');
  const token = await scalar('select public.issue_giver_provisioning_grant($1)', [email]);
  await db.exec('reset role');
  return token;
}

async function finalize(token) {
  await db.exec('set local role service_role');
  const userId = await scalar('select public.finalize_giver_provisioning_grant($1)', [token]);
  await db.exec('reset role');
  return userId;
}

async function insertUser(email, metadata = {}) {
  const id = randomUUID();
  await query('insert into auth.users(id, email, raw_user_meta_data) values ($1, $2, $3)', [id, email, metadata]);
  return id;
}

test('only service_role can issue or finalize grants and clients cannot access private storage', async () => {
  for (const role of ['anon', 'authenticated']) {
    assert.equal(await scalar("select has_function_privilege($1, 'public.issue_giver_provisioning_grant(text)', 'execute')", [role]), false);
    assert.equal(await scalar("select has_function_privilege($1, 'public.finalize_giver_provisioning_grant(text)', 'execute')", [role]), false);
    assert.equal(await scalar("select has_schema_privilege($1, 'cinste_private', 'usage')", [role]), false);
    await db.exec(`set local role ${role}`);
    await reject("select public.issue_giver_provisioning_grant('client@test.invalid')", [], '42501');
    await reject('select * from cinste_private.giver_provisioning_grants', [], '42501');
    await reject("insert into public.profiles(id, email, role) values ($1, 'forged@test.invalid', 'giver')", [randomUUID()], '42501');
    await db.exec('reset role');
  }
  assert.equal(await scalar("select has_function_privilege('service_role', 'public.issue_giver_provisioning_grant(text)', 'execute')"), true);
  assert.equal(await scalar("select has_table_privilege('service_role', 'cinste_private.giver_provisioning_grants', 'select')"), false);
});

test('grant stores only a hash, binds normalized email, and uses a short server expiry', async () => {
  const token = await issue('giver@test.invalid');
  assert.match(token, /^[0-9a-f]{64}$/);
  const [grant] = await query(`select token_hash, normalized_email,
    extract(epoch from (expires_at - created_at))::int as lifetime
    from cinste_private.giver_provisioning_grants`);
  assert.notEqual(grant.token_hash, token);
  assert.equal(grant.normalized_email, 'giver@test.invalid');
  assert.equal(grant.lifetime, 600);
  await db.exec('set local role service_role');
  await reject("select public.issue_giver_provisioning_grant(' Giver@Test.Invalid ')");
  await db.exec('reset role');
});

test('ordinary signup and caller-selected role metadata always create a literal Student', async () => {
  const metadataValues = [
    {},
    { role: 'giver' },
    { role: 'partner' },
    { role: 'admin' },
    { role: 'anything_else' },
  ];
  for (const [index, metadata] of metadataValues.entries()) {
    const id = await insertUser(`student-${index}@test.invalid`, metadata);
    assert.equal(await scalar('select role from public.profiles where id=$1', [id]), 'student');
  }
});

test('valid proof creates a Giver atomically without an Auth session and removes token metadata', async () => {
  assert.equal(await scalar('select auth.uid()'), null);
  const email = 'new-giver@test.invalid';
  const token = await issue(email);
  const id = await insertUser(email, {
    display_name: 'New Giver',
    role: 'admin',
    cinste_giver_provisioning_token: token,
  });
  assert.deepEqual(await query('select role, display_name from public.profiles where id=$1', [id]), [
    { role: 'giver', display_name: 'New Giver' },
  ]);
  assert.equal(await scalar("select raw_user_meta_data ? 'cinste_giver_provisioning_token' from auth.users where id=$1", [id]), false);
  await query('insert into auth.identities(id,user_id,identity_data) values ($1,$2,$3)', [
    randomUUID(), id, { email, cinste_giver_provisioning_token: token },
  ]);
  assert.equal(await scalar("select identity_data ? 'cinste_giver_provisioning_token' from auth.identities where user_id=$1", [id]), false);
  assert.equal(await finalize(token), id);
});

test('forged, expired, wrong-email, and replayed proofs fail instead of falling back to Student', async () => {
  await reject('insert into auth.users(id,email,raw_user_meta_data) values ($1,$2,$3)', [
    randomUUID(), 'forged@test.invalid', { cinste_giver_provisioning_token: '0'.repeat(64) },
  ]);

  const expired = await issue('expired@test.invalid');
  await query("update cinste_private.giver_provisioning_grants set created_at=now()-interval '20 minutes', expires_at=now()-interval '10 minutes' where normalized_email='expired@test.invalid'");
  await reject('insert into auth.users(id,email,raw_user_meta_data) values ($1,$2,$3)', [
    randomUUID(), 'expired@test.invalid', { cinste_giver_provisioning_token: expired },
  ]);

  const wrongEmail = await issue('bound@test.invalid');
  await reject('insert into auth.users(id,email,raw_user_meta_data) values ($1,$2,$3)', [
    randomUUID(), 'other@test.invalid', { cinste_giver_provisioning_token: wrongEmail },
  ]);

  const replay = await issue('first@test.invalid');
  await insertUser('first@test.invalid', { cinste_giver_provisioning_token: replay });
  await reject('insert into auth.users(id,email,raw_user_meta_data) values ($1,$2,$3)', [
    randomUUID(), 'second@test.invalid', { cinste_giver_provisioning_token: replay },
  ]);
});

test('profile failure rolls back Auth insertion and grant consumption together', async () => {
  const email = 'rollback@test.invalid';
  const token = await issue(email);
  await db.exec(`
    create function public.test_profile_failure() returns trigger language plpgsql as $$
    begin
      if new.email = 'rollback@test.invalid' then raise exception 'TEST_PROFILE_FAILURE'; end if;
      return new;
    end $$;
    create trigger test_profile_failure before insert on public.profiles
      for each row execute function public.test_profile_failure();
  `);
  await reject('insert into auth.users(id,email,raw_user_meta_data) values ($1,$2,$3)', [
    randomUUID(), email, { cinste_giver_provisioning_token: token },
  ]);
  assert.equal(await scalar('select count(*)::int from auth.users where email=$1', [email]), 0);
  assert.deepEqual(await query(`select consumed_at, consumed_user_id
    from cinste_private.giver_provisioning_grants where normalized_email=$1`, [email]), [
    { consumed_at: null, consumed_user_id: null },
  ]);
});

test('duplicate signup cannot promote an existing unconfirmed Student or persist unused proof', async () => {
  const email = 'existing@test.invalid';
  const existingId = await insertUser(email, { role: 'giver' });
  const token = await issue(email);
  await query('update auth.users set raw_user_meta_data=$2 where id=$1', [
    existingId, { display_name: 'Existing Student', cinste_giver_provisioning_token: token },
  ]);
  await query('insert into auth.identities(id,user_id,identity_data) values ($1,$2,$3)', [
    randomUUID(), existingId, { email, cinste_giver_provisioning_token: token },
  ]);
  await reject('insert into auth.users(id,email,raw_user_meta_data) values ($1,$2,$3)', [
    randomUUID(), email, { cinste_giver_provisioning_token: token },
  ], '23505');
  assert.equal(await scalar('select role from public.profiles where id=$1', [existingId]), 'student');
  assert.equal(await scalar("select raw_user_meta_data ? 'cinste_giver_provisioning_token' from auth.users where id=$1", [existingId]), false);
  assert.equal(await scalar("select identity_data ? 'cinste_giver_provisioning_token' from auth.identities where user_id=$1", [existingId]), false);
  assert.equal(await finalize(token), null);
  assert.equal(await scalar('select count(*)::int from cinste_private.giver_provisioning_grants where normalized_email=$1', [email]), 0);
});

test('trigger and service functions use trusted ownership, fixed search_path, and revoked trigger execution', async () => {
  const functions = await query(`select p.proname, p.prosecdef, p.proconfig, r.rolname
    from pg_proc p join pg_roles r on r.oid=p.proowner
    where p.oid in (
      'public.handle_new_user()'::regprocedure,
      'public.issue_giver_provisioning_grant(text)'::regprocedure,
      'public.finalize_giver_provisioning_grant(text)'::regprocedure,
      'cinste_private.strip_giver_token_from_user_metadata()'::regprocedure,
      'cinste_private.strip_giver_token_from_identity_metadata()'::regprocedure
    ) order by p.proname`);
  assert.ok(functions.every(fn => fn.rolname === 'postgres' && fn.prosecdef));
  assert.ok(functions.every(fn => fn.proconfig.includes('search_path=pg_catalog, public, pg_temp')));
  for (const role of ['anon', 'authenticated', 'service_role']) {
    assert.equal(await scalar("select has_function_privilege($1, 'public.handle_new_user()', 'execute')", [role]), false);
  }
  const id = await insertUser('trigger-still-works@test.invalid');
  assert.equal(await scalar('select role from public.profiles where id=$1', [id]), 'student');
});
