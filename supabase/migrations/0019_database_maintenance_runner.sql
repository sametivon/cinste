create schema cinste_private authorization postgres;
revoke all on schema cinste_private from public, anon, authenticated, service_role;

create function cinste_private.run_maintenance()
returns table(expired_claims integer, expired_participations integer)
language plpgsql security invoker set search_path = pg_catalog, public, pg_temp
as $$
begin
  -- Deliberately sequential and atomic. Let errors propagate: a failure in
  -- Impact rolls back claim maintenance too, and Cron records the failure.
  expired_claims := public.expire_stale_claims();
  expired_participations := public.expire_impact_participations();
  return next;
end;
$$;

alter function cinste_private.run_maintenance() owner to postgres;
revoke all on function cinste_private.run_maintenance() from public, anon, authenticated, service_role;
