// Disposable in-memory PostgreSQL only: never reads .env or connects to a host.
// PGlite has no Cron worker/multiple sessions. Cron registration below uses an
// explicit test double; real extension/worker and overlap checks are deployment gates.
import { after, afterEach, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

const db = new PGlite({ extensions: { pgcrypto } });
const migrationDir = new URL('../supabase/migrations/', import.meta.url);
const migration = name => readFile(new URL(name, migrationDir), 'utf8');
const query = async (sql, params = []) => (await db.query(sql, params)).rows;
const scalar = async (sql, params = []) => Object.values((await query(sql, params))[0])[0];
const insertId = (sql, params = []) => scalar(`${sql} returning id`, params);
let originalCore;
let originalPolicies;
let historicalActor;
let historicalAudit;

before(async () => {
  // Minimal Supabase platform schemas, not application schema substitutes.
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema storage; create schema extensions;
    create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    create table storage.buckets(id text primary key, name text, public boolean,
      file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(id uuid primary key, bucket_id text, name text,
      owner_id uuid, metadata jsonb);
    alter table storage.objects enable row level security;
    create function storage.foldername(text) returns text[] language sql immutable as $$
      select string_to_array($1, '/')
    $$;
    grant usage on schema public, auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
  `);
  const files = (await readdir(migrationDir)).filter(f => /^\d{4}.*\.sql$/.test(f)).sort();
  for (const file of files.filter(f => Number(f.slice(0, 4)) <= 17)) {
    await db.exec(await migration(file));
  }
  historicalActor = await student();
  historicalAudit = await insertId(`insert into public.impact_audit_events
    (actor_id,target_type,target_id,action) values ($1,'participation',$2,'joined')`,
  [historicalActor, randomUUID()]);
  originalCore = await scalar("select pg_get_functiondef('public.expire_stale_claims()'::regprocedure)");
  await db.exec(await migration('0018_impact_maintenance_system_attribution.sql'));
  await db.exec(await migration('0019_database_maintenance_runner.sql'));
  await db.exec(await migration('0025_impact_opportunity_moderation.sql'));
  await db.exec(await migration('0026_impact_attendance_provenance.sql'));
  await db.exec(await migration('0027_impact_organization_participant_projection.sql'));
  await db.exec(await migration('0028_impact_incidents.sql'));
  await db.exec(await migration('0029_impact_participant_display_name_case.sql'));
  await db.exec(await migration('0030_impact_cancellation_no_show_policy.sql'));
  originalPolicies = await query('select * from pg_policies order by schemaname, tablename, policyname');
});
beforeEach(async () => { await db.exec('begin'); });
afterEach(async () => { await db.exec('rollback'); });
after(async () => { await db.close(); });

async function student() {
  const id = randomUUID();
  await query('insert into auth.users(id,email) values ($1,$2)', [id, `${id}@scheduler.test.invalid`]);
  await query(`insert into public.student_profiles(user_id, full_name, verification_status)
    values ($1,'Scheduler test','verified')`, [id]);
  return id;
}

async function opportunity(mode = 'flexible_remote', due = true) {
  const org = await insertId("insert into public.organizations(name,status) values ('Scheduler test','active')");
  return insertId(`insert into public.impact_opportunities
    (organization_id,title,description,category,mode,starts_at,ends_at,due_at,
     expected_eligible_minutes,capacity,status,published_at)
    values ($1,'Scheduler test','Disposable fixture','community',$2::public.impact_opportunity_mode,
      case when $2::public.impact_opportunity_mode = 'scheduled' then now()-interval '75 hours' end,
      case when $2::public.impact_opportunity_mode = 'scheduled' then now()-interval '73 hours' end,
      case when $3 then now()-interval '1 hour' else now()+interval '1 day' end,
      60,10,'published',now())`, [org, mode, due]);
}

async function participation(user, mode = 'flexible_remote', due = true) {
  const op = await opportunity(mode, due);
  return insertId('insert into public.impact_participations(student_id,opportunity_id) values ($1,$2)', [user, op]);
}

async function claims(user) {
  const category = await insertId("insert into public.categories(name,slug) values ('Scheduler test',$1)", [randomUUID()]);
  const partner = await insertId("insert into public.partners(name,slug,address) values ('Scheduler test',$1,'Test')", [randomUUID()]);
  const offer = await insertId(`insert into public.offers(partner_id,category_id,name,description,giver_price_bani,fulfillment_type)
    values ($1,$2,'Scheduler test','Test',100,'instant')`, [partner, category]);
  const campaign = await insertId(`insert into public.campaigns(offer_id,name,sponsor_type,funding_source,
    quantity_total,quantity_available,starts_at,ends_at,status)
    values ($1,'Scheduler test','cinste','admin',2,0,now()-interval '1 day',now()+interval '1 day','active')`, [offer]);
  for (let i = 0; i < 2; i++) await query(`insert into public.claims(campaign_id,student_id,token_hash,token_hint,expires_at)
    values ($1,$2,$3,'test00',now()-interval '1 hour')`, [campaign, user, randomUUID()]);
  return campaign;
}

async function reject(sql, params, code) {
  await db.exec('savepoint expected_failure');
  await assert.rejects(query(sql, params), error => error.code === code);
  await db.exec('rollback to savepoint expected_failure');
}

test('API roles cannot directly execute maintenance or the private runner', async () => {
  for (const role of ['anon', 'authenticated', 'service_role']) {
    assert.equal(await scalar("select has_function_privilege($1,'public.expire_impact_participations()','execute')", [role]), false);
    assert.equal(await scalar("select has_function_privilege($1,'cinste_private.run_maintenance()','execute')", [role]), false);
    assert.equal(await scalar("select has_schema_privilege($1,'cinste_private','usage')", [role]), false);
    await db.exec(`set local role ${role}`);
    await reject('select public.expire_impact_participations()', [], '42501');
    await reject('select * from cinste_private.run_maintenance()', [], '42501');
    if (role !== 'service_role') {
      await reject(`insert into public.impact_audit_events(actor_kind,target_type,target_id,action)
        values ('system','participation',$1,'overdue')`, [randomUUID()], '42501');
    }
    await db.exec('reset role');
  }
  for (const role of ['anon', 'authenticated']) {
    assert.equal(await scalar("select has_function_privilege($1,'public.expire_stale_claims()','execute')", [role]), false);
  }
  const funcs = await query(`select p.proname,p.prosecdef,p.proconfig,r.rolname from pg_proc p
    join pg_roles r on r.oid=p.proowner where p.oid in
    ('public.expire_impact_participations()'::regprocedure,'cinste_private.run_maintenance()'::regprocedure)`);
  assert.ok(funcs.every(f => f.rolname === 'postgres' && f.proconfig.includes('search_path=pg_catalog, public, pg_temp')));
  assert.equal(funcs.find(f => f.proname === 'run_maintenance').prosecdef, false);
});

test('unattended execution records constrained system attribution for both transitions', async () => {
  assert.equal(await scalar('select auth.uid()'), null);
  const user = await student();
  const flex = await participation(user);
  const scheduled = await participation(user, 'scheduled');
  assert.deepEqual(await query('select * from cinste_private.run_maintenance()'), [{ expired_claims: 0, expired_participations: 2 }]);
  const audits = await query(`select actor_kind,actor_id,action from public.impact_audit_events
    where target_id in ($1,$2) order by action`, [flex, scheduled]);
  assert.deepEqual(audits, [
    { actor_kind: 'system', actor_id: null, action: 'expired_incomplete' },
    { actor_kind: 'system', actor_id: null, action: 'overdue' },
  ]);
  const rows = await query('select status,resolution_actor_id,resolved_at from public.impact_participations where id in ($1,$2)', [flex, scheduled]);
  assert.ok(rows.every(r => r.resolution_actor_id === null));
  assert.ok(rows.find(r => r.status === 'expired_incomplete').resolved_at);
  assert.equal(rows.find(r => r.status === 'overdue').resolved_at, null);
  assert.equal(await scalar('select count(*)::int from public.impact_contributions'), 0);
  assert.equal(await scalar('select count(*)::int from public.impact_reciprocity_settlements'), 0);
  assert.equal(await scalar('select count(*)::int from public.impact_reciprocity_state'), 0);
});

test('trusted authenticated join still expires rows with human attribution', async () => {
  const user = await student();
  const expired = await participation(user);
  const future = await opportunity('flexible_remote', false);
  // Simulate the authenticated request context only inside this isolated test.
  await query("select set_config('request.jwt.claim.sub',$1,true)", [user]);
  await db.exec('set local role authenticated');
  await reject('select public.expire_impact_participations()', [], '42501');
  await query('select public.student_join_impact_opportunity($1)', [future]);
  await db.exec('reset role');
  assert.deepEqual(await query('select actor_kind,actor_id from public.impact_audit_events where target_id=$1', [expired]),
    [{ actor_kind: 'human', actor_id: user }]);
  assert.equal(await scalar('select resolution_actor_id from public.impact_participations where id=$1', [expired]), user);
  assert.deepEqual(await query('select actor_kind,actor_id from public.impact_audit_events where id=$1', [historicalAudit]),
    [{ actor_kind: 'human', actor_id: historicalActor }]);
});

test('actor constraint cannot turn arbitrary events or missing human IDs into system events', async () => {
  const insert = `insert into public.impact_audit_events(actor_kind,actor_id,target_type,target_id,action)
    values ($1,$2,$3,$4,$5)`;
  for (const values of [
    ['human', null, 'participation', randomUUID(), 'joined'],
    ['system', historicalActor, 'participation', randomUUID(), 'expired_incomplete'],
    ['system', null, 'participation', randomUUID(), 'completed'],
    ['system', null, 'organization', randomUUID(), 'overdue'],
    ['unknown', null, 'participation', randomUUID(), 'overdue'],
  ]) await reject(insert, values, '23514');
  await reject('update public.impact_audit_events set actor_id=null,actor_kind=\'system\' where id=$1', [historicalAudit], 'P0001');
});

test('duplicate requests and retries expire once and restore a shared campaign once', async () => {
  const user = await student();
  const expired = await participation(user);
  const campaign = await claims(user);
  // PGlite queues these requests; this verifies duplicates, not multi-session locking.
  const results = await Promise.all([
    query('select * from cinste_private.run_maintenance()'),
    query('select * from cinste_private.run_maintenance()'),
  ]);
  assert.deepEqual(results, [[{ expired_claims: 2, expired_participations: 1 }], [{ expired_claims: 0, expired_participations: 0 }]]);
  assert.equal(await scalar('select quantity_available from public.campaigns where id=$1', [campaign]), 2);
  assert.equal(await scalar('select count(*)::int from public.impact_audit_events where target_id=$1', [expired]), 1);
  assert.equal(await scalar("select count(*)::int from public.claims where campaign_id=$1 and status='expired'", [campaign]), 2);
});

test('Impact audit failure rolls back both stages; retry succeeds without duplicate effects', async () => {
  const user = await student();
  const expired = await participation(user);
  const campaign = await claims(user);
  await db.exec(`create function cinste_private.test_fail_audit() returns trigger language plpgsql as $$
    begin raise exception 'TEST_AUDIT_FAILURE'; end $$;
    create trigger test_fail_audit before insert on public.impact_audit_events
    for each row execute function cinste_private.test_fail_audit();`);
  await reject('select * from cinste_private.run_maintenance()', [], 'P0001');
  assert.equal(await scalar('select quantity_available from public.campaigns where id=$1', [campaign]), 0);
  assert.equal(await scalar("select count(*)::int from public.claims where campaign_id=$1 and status='active'", [campaign]), 2);
  assert.equal(await scalar('select status from public.impact_participations where id=$1', [expired]), 'joined');
  assert.equal(await scalar('select count(*)::int from public.impact_audit_events where target_id=$1', [expired]), 0);
  await db.exec('drop trigger test_fail_audit on public.impact_audit_events');
  assert.deepEqual(await query('select * from cinste_private.run_maintenance()'), [{ expired_claims: 2, expired_participations: 1 }]);
});

test('future participations and existing policies/Core expiration definition stay unchanged', async () => {
  const user = await student();
  const future = await participation(user, 'flexible_remote', false);
  const pending = await participation(user, 'scheduled');
  await query(`update public.impact_opportunities set starts_at=now()-interval '3 hours',
    ends_at=now()-interval '2 hours',due_at=now()-interval '1 hour'
    where id=(select opportunity_id from public.impact_participations where id=$1)`, [pending]);
  assert.equal(await scalar('select public.expire_impact_participations()'), 0);
  assert.equal(await scalar('select status from public.impact_participations where id=$1', [future]), 'joined');
  assert.equal(await scalar("select pg_get_functiondef('public.expire_stale_claims()'::regprocedure)"), originalCore);
  assert.deepEqual(await query('select * from pg_policies order by schemaname, tablename, policyname'), originalPolicies);
});

test('due_at and the scheduled 72-hour boundary remain inclusive', async () => {
  const user = await student();
  const flex = await participation(user);
  const scheduled = await participation(user, 'scheduled');
  const notYet = await participation(user, 'scheduled');
  await query(`update public.impact_opportunities set due_at=now()
    where id=(select opportunity_id from public.impact_participations where id=$1)`, [flex]);
  for (const [id, delay] of [[scheduled, '0 milliseconds'], [notYet, '1 millisecond']]) {
    await query(`update public.impact_opportunities set ends_at=now()-interval '72 hours'+$2::interval
      where id=(select opportunity_id from public.impact_participations where id=$1)`, [id, delay]);
  }
  assert.equal(await scalar('select public.expire_impact_participations()'), 2);
  assert.equal(await scalar('select status from public.impact_participations where id=$1', [notYet]), 'joined');
});

test('Cron registration is inactive, local, five-minute and idempotent (registration double only)', async () => {
  // pg_cron is unavailable in WASM. Execute the real registration DO block
  // against a minimal SQL double, and separately assert extension installation.
  await db.exec(`create schema cron;
    create table cron.job(jobid bigint generated always as identity primary key,
      jobname text unique, schedule text, command text, username text, active boolean);
    create function cron.schedule(text,text,text) returns bigint language sql as $$
      insert into cron.job(jobname,schedule,command,username,active) values ($1,$2,$3,current_user,true)
      on conflict(jobname) do update set schedule=$2,command=$3,active=true returning jobid
    $$;
    create function cron.alter_job(job_id bigint, active boolean) returns void language sql as $$
      update cron.job set active=$2 where jobid=$1
    $$;`);
  const sql = await migration('0020_database_maintenance_cron.sql');
  const extension = 'create extension if not exists pg_cron with schema pg_catalog;';
  assert.ok(sql.includes(extension));
  const registration = sql.replace(extension, '');
  await db.exec(`create or replace function cron.alter_job(job_id bigint, active boolean)
    returns void language plpgsql as $$ begin raise exception 'TEST_CRON_FAILURE'; end $$;`);
  await reject(registration, [], 'P0001');
  assert.equal(await scalar('select count(*)::int from cron.job'), 0);
  await db.exec(`create or replace function cron.alter_job(job_id bigint, active boolean)
    returns void language sql as $$ update cron.job set active=$2 where jobid=$1 $$;`);
  await db.exec(registration);
  await db.exec(registration);
  assert.deepEqual(await query('select jobname,schedule,command,username,active from cron.job'), [{
    jobname: 'cinste-maintenance-v1', schedule: '*/5 * * * *',
    command: "SET statement_timeout = '240s'; SELECT * FROM cinste_private.run_maintenance();",
    username: 'postgres', active: false,
  }]);
});

test('Impact opportunities require submission and Admin low-risk approval before publication', async () => {
  const adminUser = await student();
  const operator = await student();
  await query("update public.profiles set role='admin' where id=$1", [adminUser]);
  const organization = await insertId("insert into public.organizations(name,status) values ('Moderation test','active')");
  await query('insert into public.organization_users(organization_id,user_id,assigned_by) values ($1,$2,$3)', [organization, operator, adminUser]);
  await query("select set_config('request.jwt.claim.sub',$1,true)", [operator]);
  await db.exec('set local role authenticated');
  const opportunityId = await scalar(`select public.organization_create_impact_opportunity($1,'Moderation test','Structured low-risk work','community','flexible_remote','Bucharest',null,null,now()+interval '1 day',60,5)`, [organization]);
  await query('select public.organization_submit_impact_opportunity($1)', [opportunityId]);
  await reject('select public.organization_publish_impact_opportunity($1)', [opportunityId], 'P0001');
  await query("select set_config('request.jwt.claim.sub',$1,true)", [adminUser]);
  await query('select public.admin_review_impact_opportunity($1,\'approved\',\'allowed_low_risk\',\'Reviewed for pilot\')', [opportunityId]);
  assert.deepEqual(await query('select status,review_status,risk_state from public.impact_opportunities where id=$1', [opportunityId]), [{ status: 'published', review_status: 'approved', risk_state: 'allowed_low_risk' }]);
  await db.exec('reset role');
});

test('Impact attendance is organization-authoritative and separate from completion', async () => {
  const adminUser = await student();
  const operator = await student();
  const attendee = await student();
  await query("update public.profiles set role='admin' where id=$1", [adminUser]);
  const organization = await insertId("insert into public.organizations(name,status) values ('Attendance test','active')");
  await query('insert into public.organization_users(organization_id,user_id,assigned_by) values ($1,$2,$3)', [organization, operator, adminUser]);
  await query("select set_config('request.jwt.claim.sub',$1,true)", [operator]);
  await db.exec('set local role authenticated');
  const opportunityId = await scalar(`select public.organization_create_impact_opportunity($1,'Attendance test','Structured low-risk work','community','flexible_remote','Bucharest',null,null,now()+interval '1 day',60,5)`, [organization]);
  await query('select public.organization_submit_impact_opportunity($1)', [opportunityId]);
  await query("select set_config('request.jwt.claim.sub',$1,true)", [adminUser]);
  await query('select public.admin_review_impact_opportunity($1,\'approved\',\'allowed_low_risk\',\'Reviewed for attendance test\')', [opportunityId]);
  await db.exec('reset role');
  const participationId = await scalar('insert into public.impact_participations(student_id,opportunity_id) values ($1,$2) returning id', [attendee, opportunityId]);
  await query("select set_config('request.jwt.claim.sub',$1,true)", [operator]);
  await db.exec('set local role authenticated');
  await query('select public.organization_mark_impact_attendance($1,\'attended\',null)', [participationId]);
  assert.deepEqual(await query('select status,attendance_status,completed_at from public.impact_participations where id=$1', [participationId]), [{ status: 'joined', attendance_status: 'attended', completed_at: null }]);
  await query('select public.organization_verify_impact_participation($1)', [participationId]);
  const completed = (await query('select status,attendance_status,completed_at from public.impact_participations where id=$1', [participationId]))[0];
  assert.equal(completed.status, 'completed');
  assert.equal(completed.attendance_status, 'attended');
  assert.ok(completed.completed_at);
  await db.exec('reset role');
  assert.equal(await scalar("select count(*)::int from public.impact_audit_events where target_id=$1 and action='attended'", [participationId]), 1);
});

test('Organization participant projection is assignment-scoped and privacy-limited', async () => {
  const adminUser = await student();
  const operator = await student();
  const attendee = await student();
  await query("update public.profiles set role='admin' where id=$1", [adminUser]);
  await query("update public.student_profiles set full_name='Ana Popescu' where user_id=$1", [attendee]);
  const organization = await insertId("insert into public.organizations(name,status) values ('Projection test','active')");
  const foreignOrganization = await insertId("insert into public.organizations(name,status) values ('Foreign projection test','active')");
  await query('insert into public.organization_users(organization_id,user_id,assigned_by) values ($1,$2,$3)', [organization, operator, adminUser]);
  const opportunityId = await insertId(`insert into public.impact_opportunities
    (organization_id,title,description,category,mode,due_at,expected_eligible_minutes,capacity,status,published_at)
    values ($1,'Projection test','Structured work','community','flexible_remote',now()+interval '1 day',60,5,'published',now())`, [organization]);
  const foreignOpportunityId = await insertId(`insert into public.impact_opportunities
    (organization_id,title,description,category,mode,due_at,expected_eligible_minutes,capacity,status,published_at)
    values ($1,'Foreign projection test','Structured work','community','flexible_remote',now()+interval '1 day',60,5,'published',now())`, [foreignOrganization]);
  const participationId = await insertId('insert into public.impact_participations(student_id,opportunity_id) values ($1,$2)', [attendee, opportunityId]);
  await insertId('insert into public.impact_participations(student_id,opportunity_id) values ($1,$2)', [attendee, foreignOpportunityId]);
  await query("select set_config('request.jwt.claim.sub',$1,true)", [operator]);
  await db.exec('set local role authenticated');
  const rows = await query('select * from public.list_organization_impact_participants($1::uuid[])', [[opportunityId, foreignOpportunityId]]);
  assert.deepEqual(rows, [{
    participation_id: participationId,
    opportunity_id: opportunityId,
    participant_id: attendee,
    participant_display_name: 'Ana P.',
    eligibility_status: 'verified_student',
    participation_status: 'joined',
    attendance_status: 'pending',
    joined_at: rows[0].joined_at,
    resolved_at: null,
    completed_at: null,
    disputed_at: null,
  }]);
  await db.exec('reset role');
});

test('Impact incidents are reportable by participants or assigned operators and reviewable by Admin', async () => {
  const adminUser = await student();
  const operator = await student();
  const attendee = await student();
  await query("update public.profiles set role='admin' where id=$1", [adminUser]);
  const organization = await insertId("insert into public.organizations(name,status) values ('Incident test','active')");
  await query('insert into public.organization_users(organization_id,user_id,assigned_by) values ($1,$2,$3)', [organization, operator, adminUser]);
  const opportunityId = await insertId(`insert into public.impact_opportunities
    (organization_id,title,description,category,mode,due_at,expected_eligible_minutes,capacity,status,published_at)
    values ($1,'Incident test','Structured work','community','flexible_remote',now()+interval '1 day',60,5,'published',now())`, [organization]);
  const participationId = await insertId('insert into public.impact_participations(student_id,opportunity_id) values ($1,$2)', [attendee, opportunityId]);
  await query("select set_config('request.jwt.claim.sub',$1,true)", [attendee]);
  await db.exec('set local role authenticated');
  const incidentId = await scalar("select public.report_impact_incident($1,'safety_concern','serious','Test safety concern')", [participationId]);
  assert.equal(await scalar('select status from public.impact_incidents where id=$1', [incidentId]), 'open');
  await query("select set_config('request.jwt.claim.sub',$1,true)", [adminUser]);
  await query("select public.admin_review_impact_incident($1,'resolved','Reviewed by Admin')", [incidentId]);
  assert.deepEqual(await query('select status,reviewed_by from public.impact_incidents where id=$1', [incidentId]), [{ status: 'resolved', reviewed_by: adminUser }]);
  await db.exec('reset role');
});

test('Impact cancellation uses 12 hours and repeated no-shows restrict joining', async () => {
  const adminUser = await student();
  const operator = await student();
  const attendee = await student();
  await query("update public.profiles set role='admin' where id=$1", [adminUser]);
  const organization = await insertId("insert into public.organizations(name,status) values ('Policy test','active')");
  await query('insert into public.organization_users(organization_id,user_id,assigned_by) values ($1,$2,$3)', [organization, operator, adminUser]);
  const cancellationOpportunity = await insertId(`insert into public.impact_opportunities
    (organization_id,title,description,category,mode,starts_at,ends_at,due_at,expected_eligible_minutes,capacity,status,published_at)
    values ($1,'Cancellation policy test','Structured work','community','scheduled',now()+interval '8 hours',now()+interval '9 hours',now()+interval '1 day',60,5,'published',now())`, [organization]);
  const cancellationParticipation = await insertId('insert into public.impact_participations(student_id,opportunity_id) values ($1,$2)', [attendee, cancellationOpportunity]);
  await query("select set_config('request.jwt.claim.sub',$1,true)", [attendee]);
  await db.exec('set local role authenticated');
  assert.equal(await scalar('select public.student_cancel_impact_participation($1)', [cancellationParticipation]), 'late_cancelled');
  await db.exec('reset role');
  const noShowOpportunity = await insertId(`insert into public.impact_opportunities
    (organization_id,title,description,category,mode,starts_at,ends_at,due_at,expected_eligible_minutes,capacity,status,published_at)
    values ($1,'No-show policy test','Structured work','community','scheduled',now()-interval '2 hours',now()-interval '1 hour',now()+interval '1 day',60,5,'published',now())`, [organization]);
  for (let i = 0; i < 2; i++) {
    const participationId = await insertId('insert into public.impact_participations(student_id,opportunity_id) values ($1,$2)', [attendee, noShowOpportunity]);
    await query("select set_config('request.jwt.claim.sub',$1,true)", [operator]);
    await db.exec('set local role authenticated');
    await query("select public.organization_resolve_impact_participation($1,'no_show','Policy test no-show')", [participationId]);
    await db.exec('reset role');
  }
  const futureOpportunity = await insertId(`insert into public.impact_opportunities
    (organization_id,title,description,category,mode,due_at,expected_eligible_minutes,capacity,status,published_at)
    values ($1,'Future policy test','Structured work','community','flexible_remote',now()+interval '1 day',60,5,'published',now())`, [organization]);
  await query("select set_config('request.jwt.claim.sub',$1,true)", [attendee]);
  await db.exec('set local role authenticated');
  await reject('select public.student_join_impact_opportunity($1)', [futureOpportunity], 'P0001');
  await db.exec('reset role');
  assert.equal(await scalar("select count(*)::int from public.impact_participations where student_id=$1 and status='no_show'", [attendee]), 2);
});
