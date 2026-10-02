-- Backend completion batch 2: verification lifecycle integrity and operational
-- deactivation semantics. Apply after 0005.

-- Keep historical rejected submissions intact, while requiring all newly
-- reviewed rows to contain a complete and student-safe outcome.
alter table public.student_verifications
  add constraint student_verification_review_outcome
  check (
    (status = 'pending' and reviewer_id is null and reviewed_at is null and rejection_reason is null)
    or (status = 'verified' and reviewer_id is not null and reviewed_at is not null and rejection_reason is null)
    or (status = 'rejected' and reviewer_id is not null and reviewed_at is not null and length(btrim(rejection_reason)) >= 3)
  ) not valid;

-- Student verification data is no longer mutable directly through table RLS.
-- The narrowly-scoped RPC below owns the pending transition and preserves the
-- prior rejected submission as history.
drop policy if exists student_insert on public.student_profiles;
drop policy if exists student_update on public.student_profiles;
drop policy if exists verification_insert on public.student_verifications;

-- Admins still need to read the queue, but all verification/profile decisions
-- are made by the atomic review function rather than independent table writes.
drop policy if exists admin_students_manage on public.student_profiles;
drop policy if exists admin_verifications_manage on public.student_verifications;
create policy admin_students_read on public.student_profiles for select using(public.is_admin());
create policy admin_verifications_read on public.student_verifications for select using(public.is_admin());

-- A student can create an initial or replacement submission only after a
-- rejected result. The uploaded object remains private and must be in their
-- own Storage prefix. Existing verified identity data can change only through
-- this re-verification path, which immediately returns the profile to pending.
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
set search_path = public
as $$
declare
  v_student uuid := auth.uid();
  v_profile public.student_profiles%rowtype;
  v_verification_id uuid;
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

-- Only a pending submission may receive its first outcome. Locking the row and
-- updating both submission and profile in this one transaction means concurrent
-- reviewers cannot overwrite each other.
create or replace function public.review_student_verification(
  p_verification_id uuid,
  p_decision public.verification_status,
  p_rejection_reason text default null
)
returns public.verification_status
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reviewer uuid := auth.uid();
  v_submission public.student_verifications%rowtype;
begin
  if v_reviewer is null or not public.is_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;
  if p_decision not in ('verified', 'rejected') then
    raise exception 'INVALID_VERIFICATION_DECISION';
  end if;
  if p_decision = 'rejected' and coalesce(length(btrim(p_rejection_reason)), 0) < 3 then
    raise exception 'REJECTION_REASON_REQUIRED';
  end if;
  if p_decision = 'verified' and nullif(btrim(coalesce(p_rejection_reason, '')), '') is not null then
    raise exception 'REJECTION_REASON_NOT_ALLOWED';
  end if;

  select * into v_submission
    from public.student_verifications
   where id = p_verification_id
   for update;
  if not found then
    raise exception 'VERIFICATION_NOT_FOUND';
  end if;
  if v_submission.status <> 'pending' then
    raise exception 'VERIFICATION_NOT_PENDING';
  end if;

  update public.student_verifications
     set status = p_decision,
         reviewer_id = v_reviewer,
         reviewed_at = now(),
         rejection_reason = case when p_decision = 'rejected' then btrim(p_rejection_reason) else null end
   where id = v_submission.id;

  update public.student_profiles
     set verification_status = p_decision,
         updated_at = now()
   where user_id = v_submission.student_id;

  if p_decision = 'verified' then
    insert into public.analytics_events(actor_id, event_name, entity_type, entity_id)
    values (v_reviewer, 'verification_approved', 'verification', v_submission.id);
  end if;
  return p_decision;
end;
$$;

-- Discovery must use the same operational definition as claim creation. This
-- hides campaigns immediately when their partner or offer is deactivated.
drop policy if exists campaigns_read on public.campaigns;
create policy campaigns_read on public.campaigns for select
  using (public.is_admin() or public.campaign_is_claimable(id));

-- Entity deactivation is temporary operational invalidity, not claim expiry.
-- Expiration mutates claim state only for permanent time-window failures; an
-- otherwise valid active claim can work again after partner/offer reactivation.
create or replace function public.expire_stale_claims()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  expired_count integer;
begin
  with expired_claim_rows as (
    update public.claims cl
       set status = 'expired'
      from public.campaigns c
      join public.offers o on o.id = c.offer_id
     where cl.campaign_id = c.id
       and cl.status = 'active'
       and (
         (cl.expires_at is not null and cl.expires_at <= now())
         or c.ends_at <= now()
         or (o.fulfillment_type = 'scheduled_event' and (c.event_ends_at is null or c.event_ends_at <= now()))
       )
     returning cl.id, cl.campaign_id, cl.expires_at
  ), restored_rows as (
    update public.campaigns c
       set quantity_available = c.quantity_available + 1
      from expired_claim_rows expired
     where c.id = expired.campaign_id
       and expired.expires_at is not null
       and expired.expires_at <= now()
       and public.campaign_is_claimable(c.id)
       and c.quantity_available < c.quantity_total
     returning expired.id
  )
  update public.claims cl
     set expired_inventory_restored_at = now()
   where cl.id in (select id from restored_rows)
     and cl.expired_inventory_restored_at is null;

  get diagnostics expired_count = row_count;
  return expired_count;
end;
$$;

revoke execute on function public.submit_student_verification(text, uuid, text, text, text, integer) from public, anon;
revoke execute on function public.review_student_verification(uuid, public.verification_status, text) from public, anon;
grant execute on function public.submit_student_verification(text, uuid, text, text, text, integer) to authenticated;
grant execute on function public.review_student_verification(uuid, public.verification_status, text) to authenticated;
