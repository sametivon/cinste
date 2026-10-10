-- Impact V1 opportunity moderation. Existing published rows remain live as
-- legacy compatibility records; new publication requires Admin approval.

create type public.impact_opportunity_review_status as enum ('draft', 'pending_review', 'approved', 'rejected');
create type public.impact_opportunity_risk_state as enum ('allowed_low_risk', 'restricted_not_publishable');

alter table public.impact_opportunities
  add column review_status public.impact_opportunity_review_status not null default 'draft',
  add column risk_state public.impact_opportunity_risk_state not null default 'allowed_low_risk',
  add column submitted_at timestamptz,
  add column reviewed_at timestamptz,
  add column reviewed_by uuid references public.profiles(id),
  add column review_reason text;

update public.impact_opportunities
   set review_status = 'approved'
 where status = 'published' and review_status = 'draft';

create index impact_opportunities_review_queue
  on public.impact_opportunities(review_status, created_at desc)
 where review_status = 'pending_review';

create or replace function public.organization_submit_impact_opportunity(p_opportunity_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare v_actor uuid := auth.uid(); v_opportunity public.impact_opportunities%rowtype;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_opportunity from public.impact_opportunities where id = p_opportunity_id for update;
  if not found then raise exception 'OPPORTUNITY_NOT_FOUND'; end if;
  if not public.is_organization_operator_for(v_opportunity.organization_id) then raise exception 'ORGANIZATION_ACCESS_REQUIRED'; end if;
  if v_opportunity.status <> 'draft' or v_opportunity.review_status not in ('draft', 'rejected') then raise exception 'OPPORTUNITY_NOT_SUBMITTABLE'; end if;
  if v_opportunity.due_at <= now() then raise exception 'OPPORTUNITY_ALREADY_DUE'; end if;
  if v_opportunity.mode = 'scheduled' and v_opportunity.starts_at <= now() then raise exception 'SCHEDULED_OPPORTUNITY_ALREADY_STARTED'; end if;
  update public.impact_opportunities set review_status = 'pending_review', submitted_at = now(), reviewed_at = null, reviewed_by = null, review_reason = null, updated_at = now() where id = p_opportunity_id;
  insert into public.impact_audit_events(actor_id, target_type, target_id, organization_id, action, snapshot)
  values (v_actor, 'opportunity', p_opportunity_id, v_opportunity.organization_id, 'submitted_for_review', jsonb_build_object('review_status', 'pending_review'));
end;
$$;

create or replace function public.organization_publish_impact_opportunity(p_opportunity_id uuid)
returns void language plpgsql security definer set search_path = public
as $$ begin raise exception 'ADMIN_PUBLICATION_REQUIRED'; end; $$;

create or replace function public.admin_review_impact_opportunity(
  p_opportunity_id uuid, p_decision text,
  p_risk_state public.impact_opportunity_risk_state, p_reason text default null
)
returns void language plpgsql security definer set search_path = public
as $$
declare v_opportunity public.impact_opportunities%rowtype; v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if p_decision not in ('approved', 'rejected') then raise exception 'INVALID_REVIEW_DECISION'; end if;
  if p_decision = 'rejected' and coalesce(length(v_reason), 0) < 3 then raise exception 'REASON_REQUIRED'; end if;
  if p_decision = 'approved' and p_risk_state <> 'allowed_low_risk' then raise exception 'RESTRICTED_OPPORTUNITY_NOT_PUBLISHABLE'; end if;
  select * into v_opportunity from public.impact_opportunities where id = p_opportunity_id for update;
  if not found then raise exception 'OPPORTUNITY_NOT_FOUND'; end if;
  if v_opportunity.review_status <> 'pending_review' or v_opportunity.status <> 'draft' then raise exception 'OPPORTUNITY_NOT_PENDING_REVIEW'; end if;
  if p_decision = 'approved' and v_opportunity.due_at <= now() then raise exception 'OPPORTUNITY_ALREADY_DUE'; end if;
  if p_decision = 'approved' and v_opportunity.mode = 'scheduled' and v_opportunity.starts_at <= now() then raise exception 'SCHEDULED_OPPORTUNITY_ALREADY_STARTED'; end if;
  update public.impact_opportunities set review_status = p_decision::public.impact_opportunity_review_status, risk_state = p_risk_state, reviewed_at = now(), reviewed_by = auth.uid(), review_reason = v_reason, published_at = case when p_decision = 'approved' then now() else null end, updated_at = now(), status = case when p_decision = 'approved' then 'published'::public.impact_opportunity_status else status end where id = p_opportunity_id;
  insert into public.impact_audit_events(actor_id, target_type, target_id, organization_id, action, reason, snapshot)
  values (auth.uid(), 'opportunity', p_opportunity_id, v_opportunity.organization_id, p_decision, v_reason, jsonb_build_object('review_status', p_decision, 'risk_state', p_risk_state));
  if p_decision = 'approved' then
    insert into public.impact_audit_events(actor_id, target_type, target_id, organization_id, action, snapshot)
    values (auth.uid(), 'opportunity', p_opportunity_id, v_opportunity.organization_id, 'published', jsonb_build_object('review_status', 'approved'));
  end if;
end;
$$;

revoke execute on function public.organization_submit_impact_opportunity(uuid), public.organization_publish_impact_opportunity(uuid), public.admin_review_impact_opportunity(uuid, text, public.impact_opportunity_risk_state, text) from public, anon;
grant execute on function public.organization_submit_impact_opportunity(uuid), public.organization_publish_impact_opportunity(uuid), public.admin_review_impact_opportunity(uuid, text, public.impact_opportunity_risk_state, text) to authenticated;
