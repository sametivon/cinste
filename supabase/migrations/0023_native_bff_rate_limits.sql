-- Shared, private rate limiting for the reviewed native Giver BFF. The table
-- stores only HMAC-SHA-256 subject fingerprints produced by trusted server
-- execution; it never stores raw IP addresses or email addresses. Windows are
-- retained for at most 48 hours and are inaccessible to every API role.

create table cinste_private.native_bff_rate_limit_windows (
  scope text not null,
  subject_hash text not null check (subject_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null,
  attempts integer not null default 0 check (attempts > 0),
  primary key (scope, subject_hash, window_started_at)
);

create index native_bff_rate_limit_windows_expiry_idx
  on cinste_private.native_bff_rate_limit_windows(window_started_at);

alter table cinste_private.native_bff_rate_limit_windows enable row level security;
revoke all on table cinste_private.native_bff_rate_limit_windows
  from public, anon, authenticated, service_role;

create function public.consume_native_giver_bff_rate_limit(
  p_scope text,
  p_subject_hash text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, cinste_private, pg_temp
as $$
declare
  v_window_seconds integer;
  v_limit integer;
  v_window_start timestamptz;
  v_attempts integer;
begin
  case p_scope
    when 'signup_ip_burst' then v_window_seconds := 60; v_limit := 5;
    when 'signup_ip_sustained' then v_window_seconds := 86400; v_limit := 20;
    when 'signup_email_burst' then v_window_seconds := 3600; v_limit := 3;
    when 'funding_user_burst' then v_window_seconds := 60; v_limit := 12;
    when 'funding_ip_sustained' then v_window_seconds := 3600; v_limit := 60;
    else raise exception 'INVALID_RATE_LIMIT_SCOPE';
  end case;

  if p_subject_hash is null or p_subject_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'INVALID_RATE_LIMIT_SUBJECT';
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / v_window_seconds) * v_window_seconds
  );

  insert into cinste_private.native_bff_rate_limit_windows(
    scope, subject_hash, window_started_at, attempts
  ) values (
    p_scope, p_subject_hash, v_window_start, 1
  )
  on conflict (scope, subject_hash, window_started_at)
  do update set attempts = cinste_private.native_bff_rate_limit_windows.attempts + 1
  returning attempts into v_attempts;

  -- The BFF is the only caller and this bounded cleanup preserves the stated
  -- 48-hour retention without exposing a client-triggerable deletion path.
  delete from cinste_private.native_bff_rate_limit_windows
   where window_started_at < clock_timestamp() - interval '48 hours';

  return v_attempts <= v_limit;
end;
$$;

alter function public.consume_native_giver_bff_rate_limit(text, text) owner to postgres;
revoke all on function public.consume_native_giver_bff_rate_limit(text, text)
  from public, anon, authenticated;
grant execute on function public.consume_native_giver_bff_rate_limit(text, text)
  to service_role;
