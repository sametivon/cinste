// Disposable PGlite validation only: this does not replace hosted concurrent
// execution checks for the private native-Giver BFF limiter.
import { after, afterEach, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const migrationUrl = new URL('../supabase/migrations/0023_native_bff_rate_limits.sql', import.meta.url);
const query = async (sql, params = []) => (await db.query(sql, params)).rows;
const scalar = async (sql, params = []) => Object.values((await query(sql, params))[0])[0];
const subject = 'a'.repeat(64);

before(async () => {
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema cinste_private authorization postgres;
    grant usage on schema public to anon, authenticated, service_role;
  `);
  await db.exec(await readFile(migrationUrl, 'utf8'));
});
beforeEach(async () => { await db.exec('begin'); });
afterEach(async () => { await db.exec('rollback'); });
after(async () => { await db.close(); });

async function reject(sql, params = [], code = '42501') {
  await db.exec('savepoint expected_failure');
  await assert.rejects(query(sql, params), error => error.code === code);
  await db.exec('rollback to savepoint expected_failure');
}

test('keeps private limiter storage inaccessible to all API roles', async () => {
  for (const role of ['anon', 'authenticated', 'service_role']) {
    assert.equal(await scalar("select has_schema_privilege($1, 'cinste_private', 'usage')", [role]), false);
    assert.equal(await scalar("select has_table_privilege($1, 'cinste_private.native_bff_rate_limit_windows', 'select')", [role]), false);
  }
  for (const role of ['anon', 'authenticated']) {
    assert.equal(await scalar("select has_function_privilege($1, 'public.consume_native_giver_bff_rate_limit(text, text)', 'execute')", [role]), false);
  }
  assert.equal(await scalar("select has_function_privilege('service_role', 'public.consume_native_giver_bff_rate_limit(text, text)', 'execute')"), true);
});

test('allows only the configured burst quota and rejects invalid scopes without recording input', async () => {
  await db.exec('set local role service_role');
  for (let attempt = 0; attempt < 5; attempt += 1) {
    assert.equal(await scalar("select public.consume_native_giver_bff_rate_limit('signup_ip_burst', $1)", [subject]), true);
  }
  assert.equal(await scalar("select public.consume_native_giver_bff_rate_limit('signup_ip_burst', $1)", [subject]), false);
  await reject("select public.consume_native_giver_bff_rate_limit('attacker_scope', $1)", [subject], 'P0001');
  await db.exec('reset role');
  assert.equal(await scalar('select count(*)::int from cinste_private.native_bff_rate_limit_windows'), 1);
});

test('requires a fixed opaque digest and preserves a postgres-owned safe function', async () => {
  await db.exec('set local role service_role');
  await reject("select public.consume_native_giver_bff_rate_limit('signup_ip_burst', 'raw-email@example.com')", [], 'P0001');
  const [metadata] = await query(`
    select p.prosecdef as security_definer,
           pg_get_userbyid(p.proowner) as owner,
           coalesce(array_to_string(p.proconfig, ','), '') as config
      from pg_proc p
     where p.oid = 'public.consume_native_giver_bff_rate_limit(text, text)'::regprocedure
  `);
  assert.equal(metadata.security_definer, true);
  assert.equal(metadata.owner, 'postgres');
  assert.match(metadata.config, /search_path=pg_catalog, public, cinste_private, pg_temp/);
});
