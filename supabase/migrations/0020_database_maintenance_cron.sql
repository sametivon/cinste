-- Requires Supabase's supported pg_cron extension. No network or API secret.
create extension if not exists pg_cron with schema pg_catalog;

do $$
declare
  v_job_id bigint;
begin
  if current_user <> 'postgres' then
    raise exception 'MAINTENANCE_CRON_REQUIRES_POSTGRES';
  end if;

  -- schedule() and deactivation share this atomic DO statement. An active
  -- version is never committed/visible to the scheduler, even outside a
  -- migration transaction. Reapplying reconciles this owner's named job.
  v_job_id := cron.schedule(
    'cinste-maintenance-v1',
    '*/5 * * * *',
    'SET statement_timeout = ''240s''; SELECT * FROM cinste_private.run_maintenance();'
  );
  perform cron.alter_job(v_job_id, active := false);
end;
$$;

-- Activation is a separate owner-operated deployment action, never part of
-- schema promotion or local/QA setup. Do not add API-role cron privileges.
