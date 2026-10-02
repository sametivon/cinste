-- CINSTE local MVP: all money is integer bani; all timestamps are UTC timestamptz.
create extension if not exists pgcrypto with schema extensions;
create type public.app_role as enum ('student','giver','partner','admin');
create type public.verification_status as enum ('pending','verified','rejected');
create type public.fulfillment_type as enum ('instant','appointment_required','scheduled_event');
create type public.campaign_status as enum ('draft','active','paused','ended');
create type public.claim_status as enum ('active','redeemed','expired','cancelled');
create type public.order_status as enum ('pending','paid','failed');
create type public.payment_status as enum ('pending','succeeded','failed');

create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, email text not null, role public.app_role not null default 'student', display_name text, created_at timestamptz not null default now());
create table public.universities (id uuid primary key default gen_random_uuid(), name text not null unique, active boolean not null default true, sort_order int not null default 0);
create table public.student_profiles (user_id uuid primary key references public.profiles(id) on delete cascade, full_name text not null, university_id uuid references public.universities(id), faculty text, verification_status public.verification_status not null default 'pending', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.student_verifications (id uuid primary key default gen_random_uuid(), student_id uuid not null references public.student_profiles(user_id) on delete cascade, university_id uuid references public.universities(id), full_name text not null, faculty text, document_path text not null, document_mime text not null, document_bytes int not null check (document_bytes > 0 and document_bytes <= 5242880), status public.verification_status not null default 'pending', reviewer_id uuid references public.profiles(id), rejection_reason text, submitted_at timestamptz not null default now(), reviewed_at timestamptz, check ((status = 'pending' and reviewed_at is null) or status <> 'pending'));
create unique index one_pending_verification on public.student_verifications(student_id) where status='pending';
create table public.categories (id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique, icon_identifier text not null default 'sparkles', active boolean not null default true, sort_order int not null default 0);
create table public.partners (id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique, description text, address text not null, city text not null default 'București', latitude numeric(9,6), longitude numeric(9,6), phone text, website text, booking_url text, active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.partner_users (partner_id uuid not null references public.partners(id) on delete cascade, user_id uuid not null references public.profiles(id) on delete cascade, created_at timestamptz not null default now(), primary key(partner_id,user_id));
create table public.offers (id uuid primary key default gen_random_uuid(), partner_id uuid not null references public.partners(id), category_id uuid not null references public.categories(id), name text not null, description text not null, image_path text, giver_price_bani integer not null check(giver_price_bani > 0), internal_redemption_value_bani integer check(internal_redemption_value_bani >= 0), fulfillment_type public.fulfillment_type not null, redemption_instructions text, booking_url text, active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.giver_orders (id uuid primary key default gen_random_uuid(), giver_id uuid not null references public.profiles(id), status public.order_status not null default 'pending', total_bani integer not null check(total_bani > 0), created_at timestamptz not null default now(), paid_at timestamptz);
create table public.giver_order_items (id uuid primary key default gen_random_uuid(), order_id uuid not null references public.giver_orders(id) on delete cascade, offer_id uuid not null references public.offers(id), quantity integer not null check(quantity > 0 and quantity <= 100), unit_price_bani integer not null check(unit_price_bani > 0), unique(order_id,offer_id));
create table public.payments (id uuid primary key default gen_random_uuid(), order_id uuid not null unique references public.giver_orders(id) on delete cascade, provider text not null default 'mock', provider_reference text not null unique, status public.payment_status not null default 'pending', amount_bani integer not null check(amount_bani > 0), confirmed_at timestamptz, created_at timestamptz not null default now());
create table public.campaigns (id uuid primary key default gen_random_uuid(), offer_id uuid not null references public.offers(id), giver_order_id uuid references public.giver_orders(id), name text not null, sponsor_type text not null check(sponsor_type in ('individual','company','creator','cinste','partner')), sponsor_display_name text, funding_source text not null check(funding_source in ('admin','mock_payment')), quantity_total integer not null check(quantity_total > 0), quantity_available integer not null check(quantity_available >= 0 and quantity_available <= quantity_total), starts_at timestamptz not null default now(), ends_at timestamptz not null, claim_expiration_minutes integer check(claim_expiration_minutes between 1 and 10080), event_starts_at timestamptz, event_ends_at timestamptz, eligibility jsonb not null default '{}'::jsonb, status public.campaign_status not null default 'active', created_at timestamptz not null default now(), check(ends_at > starts_at), check(event_ends_at is null or event_starts_at is null or event_ends_at > event_starts_at));
create table public.claims (id uuid primary key default gen_random_uuid(), campaign_id uuid not null references public.campaigns(id), student_id uuid not null references public.student_profiles(user_id), token_hash text not null unique, token_hint text not null, status public.claim_status not null default 'active', claimed_at timestamptz not null default now(), expires_at timestamptz, redeemed_at timestamptz, expired_inventory_restored_at timestamptz, created_at timestamptz not null default now(), check((status <> 'redeemed') or redeemed_at is not null));
-- Kept separate so partner claim-history reads can never receive the bearer token.
create table public.claim_secrets (claim_id uuid primary key references public.claims(id) on delete cascade, student_id uuid not null references public.student_profiles(user_id) on delete cascade, redemption_token text not null unique);
create index claims_student_time on public.claims(student_id,claimed_at desc); create index claims_campaign_active on public.claims(campaign_id) where status='active';
create table public.redemption_events (id uuid primary key default gen_random_uuid(), claim_id uuid not null unique references public.claims(id), partner_id uuid not null references public.partners(id), partner_user_id uuid references public.profiles(id), redeemed_at timestamptz not null default now());
create table public.analytics_events (id bigint generated always as identity primary key, actor_id uuid references public.profiles(id), event_name text not null check(event_name in ('landing_view','signup','verification_submitted','verification_approved','offer_viewed','claim_started','claim_completed','claim_expired','redemption_completed','giver_checkout_started','mock_payment_completed','pay_it_forward_clicked')), entity_type text, entity_id uuid, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from profiles where id=auth.uid() and role='admin') $$;
create or replace function public.is_partner_for(pid uuid) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from partner_users where user_id=auth.uid() and partner_id=pid) $$;
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$ begin insert into public.profiles(id,email,display_name) values(new.id,new.email,coalesce(new.raw_user_meta_data->>'display_name',split_part(new.email,'@',1))); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- Claims lock the student and atomically decrement the campaign. Browser clients never write inventory.
create or replace function public.claim_campaign(p_campaign_id uuid) returns table(claim_id uuid, redemption_token text, expires_at timestamptz) language plpgsql security definer set search_path=public as $$
declare v_student uuid:=auth.uid(); v_campaign campaigns%rowtype; v_token text:=encode(extensions.gen_random_bytes(32),'hex'); v_exp timestamptz;
begin
 if v_student is null then raise exception 'AUTH_REQUIRED'; end if;
 perform pg_advisory_xact_lock(hashtext(v_student::text));
 if not exists(select 1 from student_profiles where user_id=v_student and verification_status='verified') then raise exception 'STUDENT_NOT_VERIFIED'; end if;
 if exists(select 1 from claims where student_id=v_student and status in ('active','redeemed') and claimed_at > now()-interval '24 hours') then raise exception 'CLAIM_LIMIT_REACHED'; end if;
 select * into v_campaign from campaigns where id=p_campaign_id and status='active' and starts_at<=now() and ends_at>now() for update;
 if not found then raise exception 'CAMPAIGN_UNAVAILABLE'; end if;
 if v_campaign.quantity_available < 1 then raise exception 'SOLD_OUT'; end if;
 update campaigns set quantity_available=quantity_available-1 where id=p_campaign_id and quantity_available>0 returning * into v_campaign;
 if not found then raise exception 'SOLD_OUT'; end if;
 v_exp:=case when v_campaign.claim_expiration_minutes is null then null else now()+make_interval(mins=>v_campaign.claim_expiration_minutes) end;
 insert into claims(campaign_id,student_id,token_hash,token_hint,expires_at) values(p_campaign_id,v_student,encode(extensions.digest(v_token,'sha256'),'hex'),right(v_token,6),v_exp) returning id into claim_id; insert into claim_secrets(claim_id,student_id,redemption_token) values(claim_id,v_student,v_token);
 redemption_token:=v_token; expires_at:=v_exp; insert into analytics_events(actor_id,event_name,entity_type,entity_id) values(v_student,'claim_completed','campaign',p_campaign_id); return next;
end $$;
create or replace function public.expire_stale_claims() returns integer language plpgsql security definer set search_path=public as $$
declare n integer;
begin
  with expired_claim_rows as (
    update claims set status='expired'
    where status='active' and expires_at is not null and expires_at<=now()
    returning id, campaign_id
  ), restored_rows as (
    update campaigns c set quantity_available=quantity_available+1
    from expired_claim_rows e where c.id=e.campaign_id
    returning e.id
  )
  update claims set expired_inventory_restored_at=now()
  where id in (select id from restored_rows) and expired_inventory_restored_at is null;
  get diagnostics n=row_count;
  return n;
end $$;
create or replace function public.inspect_redemption(p_token text) returns table(state text, claim_id uuid, offer_name text, partner_name text, partner_id uuid, expires_at timestamptz, redeemed_at timestamptz) language plpgsql security definer set search_path=public as $$ begin
 perform expire_stale_claims(); if not exists(select 1 from claims where token_hash=encode(extensions.digest(p_token,'sha256'),'hex')) then return query select 'INVALID CODE'::text,null::uuid,null::text,null::text,null::uuid,null::timestamptz,null::timestamptz; return; end if; return query select case when c.status='redeemed' then 'ALREADY REDEEMED' when c.status='expired' then 'EXPIRED' when not is_partner_for(p.id) then 'NOT VALID AT THIS PARTNER' else 'VALID' end,c.id,o.name,p.name,p.id,c.expires_at,c.redeemed_at from claims c join campaigns ca on ca.id=c.campaign_id join offers o on o.id=ca.offer_id join partners p on p.id=o.partner_id where c.token_hash=encode(extensions.digest(p_token,'sha256'),'hex'); end $$;
create or replace function public.redeem_claim(p_token text) returns text language plpgsql security definer set search_path=public as $$
declare v_claim_id uuid; v_status public.claim_status; v_partner uuid;
begin
  perform expire_stale_claims();
  select cl.id, cl.status, o.partner_id into v_claim_id, v_status, v_partner
  from claims cl join campaigns ca on ca.id=cl.campaign_id join offers o on o.id=ca.offer_id
  where cl.token_hash=encode(extensions.digest(p_token,'sha256'),'hex') for update;
  if not found then return 'INVALID CODE'; end if;
  if not is_partner_for(v_partner) then return 'NOT VALID AT THIS PARTNER'; end if;
  if v_status='redeemed' then return 'ALREADY REDEEMED'; end if;
  if v_status='expired' then return 'EXPIRED'; end if;
  if v_status<>'active' then return 'INVALID CODE'; end if;
  update claims set status='redeemed',redeemed_at=now() where id=v_claim_id;
  insert into redemption_events(claim_id,partner_id,partner_user_id) values(v_claim_id,v_partner,auth.uid());
  insert into analytics_events(actor_id,event_name,entity_type,entity_id) values(auth.uid(),'redemption_completed','claim',v_claim_id);
  return 'REDEEMED';
end $$;
create or replace function public.confirm_mock_payment(p_order_id uuid, p_success boolean) returns text language plpgsql security definer set search_path=public as $$
declare o giver_orders%rowtype; i giver_order_items%rowtype; begin
 select * into o from giver_orders where id=p_order_id for update; if not found or o.giver_id<>auth.uid() then raise exception 'ORDER_NOT_FOUND'; end if;
 if o.status<>'pending' then return o.status::text; end if;
 if not p_success then update giver_orders set status='failed' where id=o.id; update payments set status='failed',confirmed_at=now() where order_id=o.id; return 'failed'; end if;
 update giver_orders set status='paid',paid_at=now() where id=o.id; update payments set status='succeeded',confirmed_at=now() where order_id=o.id;
 for i in select * from giver_order_items where order_id=o.id loop
   insert into campaigns(offer_id,giver_order_id,name,sponsor_type,funding_source,quantity_total,quantity_available,starts_at,ends_at,claim_expiration_minutes,status)
   values(i.offer_id,o.id,'Cinste din comunitate','individual','mock_payment',i.quantity,i.quantity,now(),now()+interval '30 days',60,'active');
 end loop;
 insert into analytics_events(actor_id,event_name,entity_type,entity_id) values(auth.uid(),'mock_payment_completed','order',o.id); return 'paid'; end $$;
grant execute on function public.claim_campaign(uuid), public.inspect_redemption(text), public.redeem_claim(text), public.confirm_mock_payment(uuid,boolean) to authenticated;

alter table public.profiles enable row level security; alter table public.student_profiles enable row level security; alter table public.student_verifications enable row level security; alter table public.universities enable row level security; alter table public.categories enable row level security; alter table public.partners enable row level security; alter table public.partner_users enable row level security; alter table public.offers enable row level security; alter table public.campaigns enable row level security; alter table public.claims enable row level security; alter table public.claim_secrets enable row level security; alter table public.giver_orders enable row level security; alter table public.giver_order_items enable row level security; alter table public.payments enable row level security; alter table public.redemption_events enable row level security; alter table public.analytics_events enable row level security;
create policy profiles_self on profiles for select using(id=auth.uid() or is_admin()); create policy universities_read on universities for select using(active or is_admin()); create policy category_read on categories for select using(active or is_admin()); create policy partners_read on partners for select using(active or is_admin()); create policy offers_read on offers for select using(active or is_admin()); create policy campaigns_read on campaigns for select using((status='active' and starts_at<=now() and ends_at>now()) or is_admin());
create policy partner_user_self on partner_users for select using(user_id=auth.uid() or is_admin());
create policy student_self on student_profiles for select using(user_id=auth.uid() or is_admin()); create policy student_insert on student_profiles for insert with check(user_id=auth.uid()); create policy student_update on student_profiles for update using(user_id=auth.uid()) with check(user_id=auth.uid()); create policy verification_self on student_verifications for select using(student_id=auth.uid() or is_admin()); create policy verification_insert on student_verifications for insert with check(student_id=auth.uid());
create policy claim_self on claims for select using(student_id=auth.uid() or is_admin() or exists(select 1 from campaigns ca join offers o on o.id=ca.offer_id where ca.id=campaign_id and is_partner_for(o.partner_id)));
create policy claim_secret_student on claim_secrets for select using(student_id=auth.uid());
create policy order_self on giver_orders for select using(giver_id=auth.uid() or is_admin()); create policy item_self on giver_order_items for select using(exists(select 1 from giver_orders where id=order_id and giver_id=auth.uid()) or is_admin()); create policy payment_self on payments for select using(exists(select 1 from giver_orders where id=order_id and giver_id=auth.uid()) or is_admin()); create policy redemption_partner on redemption_events for select using(is_admin() or is_partner_for(partner_id));
create policy order_create on giver_orders for insert with check(giver_id=auth.uid()); create policy item_create on giver_order_items for insert with check(exists(select 1 from giver_orders where id=order_id and giver_id=auth.uid() and status='pending'));
create or replace function public.prevent_self_verification_change() returns trigger language plpgsql security definer set search_path=public as $$ begin if not is_admin() and new.verification_status is distinct from old.verification_status then raise exception 'VERIFICATION_STATUS_MANAGED_BY_ADMIN'; end if; return new; end $$;
create trigger protect_student_verification before update on public.student_profiles for each row execute procedure public.prevent_self_verification_change();
create policy admin_profiles_manage on profiles for all using(is_admin()) with check(is_admin()); create policy admin_students_manage on student_profiles for all using(is_admin()) with check(is_admin()); create policy admin_verifications_manage on student_verifications for all using(is_admin()) with check(is_admin()); create policy admin_categories_manage on categories for all using(is_admin()) with check(is_admin()); create policy admin_partners_manage on partners for all using(is_admin()) with check(is_admin()); create policy admin_partner_users_manage on partner_users for all using(is_admin()) with check(is_admin()); create policy admin_offers_manage on offers for all using(is_admin()) with check(is_admin()); create policy admin_campaigns_manage on campaigns for all using(is_admin()) with check(is_admin()); create policy admin_orders_manage on giver_orders for all using(is_admin()) with check(is_admin()); create policy admin_items_manage on giver_order_items for all using(is_admin()) with check(is_admin()); create policy admin_payments_manage on payments for all using(is_admin()) with check(is_admin()); create policy admin_analytics_manage on analytics_events for all using(is_admin()) with check(is_admin());
-- Admin writes and payment confirmation are deliberately server-side (service role) endpoints; no client receives that key.

insert into storage.buckets(id,name,public) values('student-documents','student-documents',false) on conflict(id) do nothing;
create policy student_document_upload on storage.objects for insert to authenticated with check(bucket_id='student-documents' and (storage.foldername(name))[1]=auth.uid()::text);
create policy admin_document_read on storage.objects for select to authenticated using(bucket_id='student-documents' and public.is_admin());
