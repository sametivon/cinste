-- Supabase places pgcrypto functions in the extensions schema. Security-definer
-- functions use search_path=public, so all cryptographic calls must be explicit.
create extension if not exists pgcrypto with schema extensions;

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
 insert into claims(campaign_id,student_id,token_hash,token_hint,expires_at) values(p_campaign_id,v_student,encode(extensions.digest(v_token,'sha256'),'hex'),right(v_token,6),v_exp) returning id into claim_id;
 insert into claim_secrets(claim_id,student_id,redemption_token) values(claim_id,v_student,v_token);
 redemption_token:=v_token; expires_at:=v_exp;
 insert into analytics_events(actor_id,event_name,entity_type,entity_id) values(v_student,'claim_completed','campaign',p_campaign_id);
 return next;
end $$;

create or replace function public.inspect_redemption(p_token text) returns table(state text, claim_id uuid, offer_name text, partner_name text, partner_id uuid, expires_at timestamptz, redeemed_at timestamptz) language plpgsql security definer set search_path=public as $$ begin
 perform expire_stale_claims(); if not exists(select 1 from claims where token_hash=encode(extensions.digest(p_token,'sha256'),'hex')) then return query select 'INVALID CODE'::text,null::uuid,null::text,null::text,null::uuid,null::timestamptz,null::timestamptz; return; end if; return query select case when c.status='redeemed' then 'ALREADY REDEEMED' when c.status='expired' then 'EXPIRED' when not is_partner_for(p.id) then 'NOT VALID AT THIS PARTNER' else 'VALID' end,c.id,o.name,p.name,p.id,c.expires_at,c.redeemed_at from claims c join campaigns ca on ca.id=c.campaign_id join offers o on o.id=ca.offer_id join partners p on p.id=o.partner_id where c.token_hash=encode(extensions.digest(p_token,'sha256'),'hex'); end $$;

create or replace function public.redeem_claim(p_token text) returns text language plpgsql security definer set search_path=public as $$
declare v_claim_id uuid; v_status public.claim_status; v_partner uuid;
begin
 perform expire_stale_claims(); select cl.id, cl.status, o.partner_id into v_claim_id, v_status, v_partner from claims cl join campaigns ca on ca.id=cl.campaign_id join offers o on o.id=ca.offer_id where cl.token_hash=encode(extensions.digest(p_token,'sha256'),'hex') for update;
 if not found then return 'INVALID CODE'; end if; if not is_partner_for(v_partner) then return 'NOT VALID AT THIS PARTNER'; end if; if v_status='redeemed' then return 'ALREADY REDEEMED'; end if; if v_status='expired' then return 'EXPIRED'; end if; if v_status<>'active' then return 'INVALID CODE'; end if;
 update claims set status='redeemed',redeemed_at=now() where id=v_claim_id; insert into redemption_events(claim_id,partner_id,partner_user_id) values(v_claim_id,v_partner,auth.uid()); insert into analytics_events(actor_id,event_name,entity_type,entity_id) values(auth.uid(),'redemption_completed','claim',v_claim_id); return 'REDEEMED';
end $$;
