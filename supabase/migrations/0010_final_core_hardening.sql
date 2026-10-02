-- Backend completion batch 4: final document, audit, and integrity hardening.
-- Apply after 0009_admin_operations.sql.

-- Storage enforces the maximum accepted upload size and declared content type
-- before an object is persisted. The bucket remains private.
update storage.buckets
   set file_size_limit = 5242880,
       allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png']::text[]
 where id = 'student-documents';

-- A verification submission must point to the authenticated student's own
-- uploaded object. Client-provided path, type, and size are therefore checked
-- against Storage metadata at the trusted database boundary.
create or replace function public.submit_student_verification(
  p_full_name text,
  p_university_id uuid,
  p_faculty text,
  p_document_path text,
  p_document_mime text,
  p_document_bytes integer
)
returns uuid
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_student uuid := auth.uid();
  v_profile public.student_profiles%rowtype;
  v_verification_id uuid;
  v_object_owner uuid;
  v_object_mime text;
  v_object_bytes bigint;
begin
  if v_student is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if coalesce(length(btrim(p_full_name)), 0) < 3 or length(p_full_name) > 120 then
    raise exception 'INVALID_FULL_NAME';
  end if;
  if p_faculty is not null and length(p_faculty) > 120 then
    raise exception 'INVALID_FACULTY';
  end if;
  if p_university_id is null or not exists (select 1 from public.universities where id = p_university_id and active) then
    raise exception 'INVALID_UNIVERSITY';
  end if;
  if p_document_mime not in ('application/pdf', 'image/jpeg', 'image/png')
     or p_document_bytes is null or p_document_bytes < 1 or p_document_bytes > 5242880
     or p_document_path is null
     or p_document_path !~ ('^' || v_student::text || '/') then
    raise exception 'INVALID_DOCUMENT';
  end if;

  select owner_id,
         metadata ->> 'mimetype',
         nullif(metadata ->> 'size', '')::bigint
    into v_object_owner, v_object_mime, v_object_bytes
    from storage.objects
   where bucket_id = 'student-documents'
     and name = p_document_path;

  if not found
     or v_object_owner is distinct from v_student
     or v_object_mime is distinct from p_document_mime
     or v_object_bytes is distinct from p_document_bytes::bigint
     or v_object_bytes < 1
     or v_object_bytes > 5242880 then
    raise exception 'INVALID_DOCUMENT';
  end if;

  select * into v_profile from public.student_profiles where user_id = v_student for update;
  if found and v_profile.verification_status = 'pending' then
    raise exception 'VERIFICATION_ALREADY_PENDING';
  end if;
  if found and v_profile.verification_status = 'verified'
     and v_profile.full_name = btrim(p_full_name)
     and v_profile.university_id is not distinct from p_university_id
     and v_profile.faculty is not distinct from nullif(btrim(coalesce(p_faculty, '')), '') then
    raise exception 'ALREADY_VERIFIED';
  end if;

  if found then
    update public.student_profiles
       set full_name = btrim(p_full_name),
           university_id = p_university_id,
           faculty = nullif(btrim(coalesce(p_faculty, '')), ''),
           verification_status = 'pending',
           updated_at = now()
     where user_id = v_student;
  else
    insert into public.student_profiles(user_id, full_name, university_id, faculty, verification_status)
    values (v_student, btrim(p_full_name), p_university_id, nullif(btrim(coalesce(p_faculty, '')), ''), 'pending');
  end if;

  insert into public.student_verifications(
    student_id, university_id, full_name, faculty, document_path, document_mime, document_bytes, status
  ) values (
    v_student, p_university_id, btrim(p_full_name), nullif(btrim(coalesce(p_faculty, '')), ''),
    p_document_path, p_document_mime, p_document_bytes, 'pending'
  ) returning id into v_verification_id;

  insert into public.analytics_events(actor_id, event_name, entity_type, entity_id)
  values (v_student, 'verification_submitted', 'verification', v_verification_id);
  return v_verification_id;
end;
$$;

-- Events entered directly by an untrusted client are conversion telemetry only.
-- Transactional events continue to be written by their owning trusted RPCs.
create or replace function public.track_event(
  p_event text,
  p_entity_type text default null,
  p_entity_id uuid default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if p_event <> 'pay_it_forward_clicked'
     or p_entity_type is distinct from 'conversion'
     or p_entity_id is not null then
    raise exception 'CLIENT_EVENT_NOT_ALLOWED';
  end if;
  insert into public.analytics_events(actor_id, event_name, entity_type, entity_id)
  values (auth.uid(), p_event, p_entity_type, p_entity_id);
end;
$$;

-- Keep access assignment/revocation inspectable without retaining a live
-- partner_users row after revocation. Only an admin may read this audit trail.
create table public.partner_user_access_events (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id),
  user_id uuid not null references public.profiles(id),
  actor_id uuid references public.profiles(id),
  action text not null check (action in ('assigned', 'revoked')),
  created_at timestamptz not null default now()
);
create index partner_user_access_events_partner_created on public.partner_user_access_events(partner_id, created_at desc);
alter table public.partner_user_access_events enable row level security;
create policy admin_partner_user_access_events_read on public.partner_user_access_events for select using(public.is_admin());

create or replace function public.audit_partner_user_access()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.partner_user_access_events(partner_id, user_id, actor_id, action)
    values (new.partner_id, new.user_id, auth.uid(), 'assigned');
    return new;
  end if;
  insert into public.partner_user_access_events(partner_id, user_id, actor_id, action)
  values (old.partner_id, old.user_id, auth.uid(), 'revoked');
  return old;
end;
$$;
drop trigger if exists partner_user_access_audit on public.partner_users;
create trigger partner_user_access_audit
after insert or delete on public.partner_users
for each row execute function public.audit_partner_user_access();

-- Campaign windows are one business interval. Admin RPCs already validate
-- fulfillment-specific requirements; this protects direct future writes too.
alter table public.campaigns
  add constraint campaign_event_within_campaign_window
  check (
    (event_starts_at is null and event_ends_at is null)
    or (event_starts_at >= starts_at and event_ends_at <= ends_at)
  ) not valid;

-- `cancelled` is reserved but has no supported MVP transition. Claims have no
-- client update policy; this guard also prevents accidental privileged use.
create or replace function public.reject_unsupported_claim_cancellation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    raise exception 'CLAIM_CANCELLATION_UNSUPPORTED';
  end if;
  return new;
end;
$$;
drop trigger if exists claims_reject_unsupported_cancellation on public.claims;
create trigger claims_reject_unsupported_cancellation
before update of status on public.claims
for each row execute function public.reject_unsupported_claim_cancellation();
