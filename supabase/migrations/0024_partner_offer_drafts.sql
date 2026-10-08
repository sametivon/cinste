-- Partner-authored copy stays separate from the student/Giver catalog until
-- an Admin reviews it and sets the commercial terms.
create table public.partner_offer_drafts (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  category_id uuid not null references public.categories(id),
  created_by uuid not null references public.profiles(id),
  name text not null check (length(btrim(name)) between 2 and 160),
  description text not null check (length(btrim(description)) between 2 and 2000),
  fulfillment_type public.fulfillment_type not null,
  redemption_instructions text check (redemption_instructions is null or length(redemption_instructions) <= 1000),
  booking_url text,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'rejected')),
  review_note text check (review_note is null or length(review_note) <= 500),
  approved_offer_id uuid unique references public.offers(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index partner_offer_drafts_partner_status on public.partner_offer_drafts(partner_id, status, updated_at desc);
alter table public.partner_offer_drafts enable row level security;

create policy partner_offer_drafts_read on public.partner_offer_drafts for select
  using (public.is_admin() or public.is_partner_for(partner_id));
create policy partner_offer_drafts_create on public.partner_offer_drafts for insert to authenticated
  with check (created_by = auth.uid() and public.is_partner_for(partner_id) and status = 'draft' and approved_offer_id is null);
create policy partner_offer_drafts_update on public.partner_offer_drafts for update to authenticated
  using (public.is_partner_for(partner_id) and status in ('draft', 'rejected'))
  with check (created_by = auth.uid() and public.is_partner_for(partner_id) and status in ('draft', 'submitted') and approved_offer_id is null);
create policy admin_partner_offer_drafts_manage on public.partner_offer_drafts for all
  using (public.is_admin()) with check (public.is_admin());

create or replace function public.admin_review_partner_offer_draft(
  p_draft_id uuid,
  p_decision text,
  p_giver_price_bani integer default null,
  p_internal_redemption_value_bani integer default null,
  p_review_note text default null
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_draft public.partner_offer_drafts%rowtype; v_offer_id uuid;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if p_decision not in ('approved', 'rejected') then raise exception 'INVALID_DECISION'; end if;
  if p_review_note is not null and length(p_review_note) > 500 then raise exception 'INVALID_REVIEW_NOTE'; end if;
  select * into v_draft from public.partner_offer_drafts where id = p_draft_id for update;
  if not found then raise exception 'DRAFT_NOT_FOUND'; end if;
  if v_draft.status <> 'submitted' then raise exception 'DRAFT_NOT_SUBMITTED'; end if;
  if p_decision = 'rejected' then
    update public.partner_offer_drafts set status = 'rejected', review_note = nullif(btrim(coalesce(p_review_note, '')), ''), updated_at = now() where id = v_draft.id;
    return null;
  end if;
  if p_giver_price_bani is null or p_giver_price_bani < 1 or p_internal_redemption_value_bani is not null and p_internal_redemption_value_bani < 0 then raise exception 'INVALID_PRICE'; end if;
  if not exists (select 1 from public.partners where id = v_draft.partner_id and active) or not exists (select 1 from public.categories where id = v_draft.category_id and active) then raise exception 'DRAFT_NOT_OPERATIONAL'; end if;
  insert into public.offers(partner_id, category_id, name, description, giver_price_bani, internal_redemption_value_bani, fulfillment_type, redemption_instructions, booking_url)
  values (v_draft.partner_id, v_draft.category_id, v_draft.name, v_draft.description, p_giver_price_bani, p_internal_redemption_value_bani, v_draft.fulfillment_type, v_draft.redemption_instructions, v_draft.booking_url)
  returning id into v_offer_id;
  update public.partner_offer_drafts set status = 'approved', review_note = nullif(btrim(coalesce(p_review_note, '')), ''), approved_offer_id = v_offer_id, updated_at = now() where id = v_draft.id;
  return v_offer_id;
end;
$$;
revoke execute on function public.admin_review_partner_offer_draft(uuid, text, integer, integer, text) from public, anon;
grant execute on function public.admin_review_partner_offer_draft(uuid, text, integer, integer, text) to authenticated;
