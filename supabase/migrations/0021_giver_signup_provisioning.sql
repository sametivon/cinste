-- One-time, server-issued proof for new Giver accounts. The proof authorizes
-- only the auth.users INSERT transaction that consumes it; it is not a role
-- mutation mechanism and is never accepted by profile UPDATE paths.

create table cinste_private.giver_provisioning_grants (
  token_hash text primary key,
  normalized_email text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  consumed_user_id uuid references auth.users(id) on delete cascade,
  constraint giver_provisioning_grant_expiry check (expires_at > created_at),
  constraint giver_provisioning_grant_consumption check (
    (consumed_at is null and consumed_user_id is null)
    or (consumed_at is not null and consumed_user_id is not null)
  )
);

alter table cinste_private.giver_provisioning_grants enable row level security;
revoke all on table cinste_private.giver_provisioning_grants
  from public, anon, authenticated, service_role;

create function public.issue_giver_provisioning_grant(p_normalized_email text)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_token text;
begin
  if p_normalized_email is null
     or p_normalized_email = ''
     or p_normalized_email is distinct from lower(btrim(p_normalized_email)) then
    raise exception 'INVALID_NORMALIZED_EMAIL';
  end if;

  -- 32 random bytes provide 256 bits of entropy. Only the SHA-256 digest is
  -- retained; the opaque token is returned once to trusted server execution.
  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into cinste_private.giver_provisioning_grants(
    token_hash,
    normalized_email,
    expires_at
  ) values (
    encode(extensions.digest(v_token, 'sha256'), 'hex'),
    p_normalized_email,
    now() + interval '10 minutes'
  );

  return v_token;
end;
$$;

alter function public.issue_giver_provisioning_grant(text) owner to postgres;
revoke all on function public.issue_giver_provisioning_grant(text)
  from public, anon, authenticated;
grant execute on function public.issue_giver_provisioning_grant(text)
  to service_role;

-- Trusted server execution calls this after Auth signup. A consumed grant
-- returns the authoritative new user ID. An unused grant is cancelled so a
-- duplicate or failed signup cannot leave live provisioning proof behind.
create function public.finalize_giver_provisioning_grant(p_token text)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_token_hash text;
  v_consumed_user_id uuid;
begin
  if p_token is null or p_token = '' then
    return null;
  end if;

  v_token_hash := encode(extensions.digest(p_token, 'sha256'), 'hex');

  select g.consumed_user_id
    into v_consumed_user_id
    from cinste_private.giver_provisioning_grants g
   where g.token_hash = v_token_hash
   for update;

  if not found then
    return null;
  end if;

  if v_consumed_user_id is null then
    delete from cinste_private.giver_provisioning_grants
     where token_hash = v_token_hash;
  end if;

  return v_consumed_user_id;
end;
$$;

alter function public.finalize_giver_provisioning_grant(text) owner to postgres;
revoke all on function public.finalize_giver_provisioning_grant(text)
  from public, anon, authenticated;
grant execute on function public.finalize_giver_provisioning_grant(text)
  to service_role;

-- Supabase Auth may copy signup data into both user and identity metadata.
-- Existing-user signup paths do not fire the auth.users INSERT trigger, so
-- strip this one reserved transport field from later metadata writes too.
create function cinste_private.strip_giver_token_from_user_metadata()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  new.raw_user_meta_data := coalesce(new.raw_user_meta_data, '{}'::jsonb)
                            - 'cinste_giver_provisioning_token';
  return new;
end;
$$;

alter function cinste_private.strip_giver_token_from_user_metadata() owner to postgres;
revoke all on function cinste_private.strip_giver_token_from_user_metadata()
  from public, anon, authenticated, service_role;

create trigger strip_giver_token_from_user_metadata
before update of raw_user_meta_data on auth.users
for each row
when (new.raw_user_meta_data ? 'cinste_giver_provisioning_token')
execute function cinste_private.strip_giver_token_from_user_metadata();

create function cinste_private.strip_giver_token_from_identity_metadata()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  new.identity_data := coalesce(new.identity_data, '{}'::jsonb)
                       - 'cinste_giver_provisioning_token';
  return new;
end;
$$;

alter function cinste_private.strip_giver_token_from_identity_metadata() owner to postgres;
revoke all on function cinste_private.strip_giver_token_from_identity_metadata()
  from public, anon, authenticated, service_role;

create trigger strip_giver_token_from_identity_metadata
before insert or update of identity_data on auth.identities
for each row
when (new.identity_data ? 'cinste_giver_provisioning_token')
execute function cinste_private.strip_giver_token_from_identity_metadata();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_grant_token text := new.raw_user_meta_data ->> 'cinste_giver_provisioning_token';
  v_grant_hash text;
  v_consumed_hash text;
  v_role public.app_role := 'student'::public.app_role;
begin
  if v_grant_token is not null then
    v_grant_hash := encode(extensions.digest(v_grant_token, 'sha256'), 'hex');

    update cinste_private.giver_provisioning_grants
       set consumed_at = now(),
           consumed_user_id = new.id
     where token_hash = v_grant_hash
       and normalized_email = lower(btrim(new.email))
       and expires_at > now()
       and consumed_at is null
       and consumed_user_id is null
    returning token_hash into v_consumed_hash;

    if v_consumed_hash is null then
      raise exception 'INVALID_GIVER_PROVISIONING_GRANT';
    end if;

    v_role := 'giver'::public.app_role;

    -- The token is transport proof, not durable user metadata. Remove it in
    -- the same Auth transaction before returning the newly created user.
    update auth.users
       set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
                            - 'cinste_giver_provisioning_token'
     where id = new.id;
  end if;

  insert into public.profiles(id, email, role, display_name)
  values (
    new.id,
    new.email,
    v_role,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );

  return new;
end;
$$;

alter function public.handle_new_user() owner to postgres;
revoke all on function public.handle_new_user()
  from public, anon, authenticated, service_role;

-- Trigger invocation is not an EXECUTE grant: the existing Auth INSERT
-- trigger continues to call its postgres-owned function after client grants
-- are removed.
