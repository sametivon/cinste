-- Impact V1: retain structured operational details on each opportunity.

create type public.impact_participant_contact_field as enum ('email', 'phone');

alter table public.impact_opportunities
  add column activity_details text,
  add column requirements text,
  add column organization_provides text,
  add column coordinator_name text,
  add column coordinator_contact text,
  add column accessibility_information text,
  add column participant_contact_fields public.impact_participant_contact_field[] not null default '{}';

alter table public.impact_opportunities
  add constraint impact_opportunities_activity_details_length check (activity_details is null or length(btrim(activity_details)) between 3 and 4000),
  add constraint impact_opportunities_requirements_length check (requirements is null or length(btrim(requirements)) between 1 and 2000),
  add constraint impact_opportunities_organization_provides_length check (organization_provides is null or length(btrim(organization_provides)) between 1 and 2000),
  add constraint impact_opportunities_coordinator_name_length check (coordinator_name is null or length(btrim(coordinator_name)) between 2 and 200),
  add constraint impact_opportunities_coordinator_contact_length check (coordinator_contact is null or length(btrim(coordinator_contact)) between 3 and 300),
  add constraint impact_opportunities_accessibility_length check (accessibility_information is null or length(btrim(accessibility_information)) between 1 and 2000);

drop function if exists public.organization_create_impact_opportunity(uuid, text, text, public.impact_opportunity_category, public.impact_opportunity_mode, text, timestamptz, timestamptz, timestamptz, integer, integer);
create or replace function public.organization_create_impact_opportunity(
  p_organization_id uuid, p_title text, p_description text,
  p_category public.impact_opportunity_category, p_mode public.impact_opportunity_mode,
  p_city text, p_starts_at timestamptz, p_ends_at timestamptz, p_due_at timestamptz,
  p_expected_eligible_minutes integer, p_capacity integer,
  p_activity_details text, p_requirements text, p_organization_provides text,
  p_coordinator_name text, p_coordinator_contact text,
  p_accessibility_information text,
  p_participant_contact_fields public.impact_participant_contact_field[] default '{}'
)
returns uuid language plpgsql security definer set search_path = public
as $$
declare v_actor uuid := auth.uid(); v_id uuid;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED'; end if;
  if coalesce(length(btrim(p_title)), 0) < 2 or length(p_title) > 200 then raise exception 'INVALID_OPPORTUNITY_TITLE'; end if;
  if coalesce(length(btrim(p_description)), 0) < 1 then raise exception 'INVALID_OPPORTUNITY_DESCRIPTION'; end if;
  if coalesce(length(btrim(p_activity_details)), 0) < 3 then raise exception 'INVALID_ACTIVITY_DETAILS'; end if;
  if p_category is null or p_mode is null then raise exception 'INVALID_OPPORTUNITY_TYPE'; end if;
  if p_due_at is null or p_due_at <= now() then raise exception 'INVALID_OPPORTUNITY_DUE_AT'; end if;
  if p_expected_eligible_minutes is null or p_expected_eligible_minutes < 1 or p_expected_eligible_minutes > 1440 then raise exception 'INVALID_ELIGIBLE_MINUTES'; end if;
  if p_capacity is null or p_capacity < 1 or p_capacity > 100000 then raise exception 'INVALID_CAPACITY'; end if;
  if p_mode = 'scheduled' then
    if p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at or p_due_at < p_ends_at then raise exception 'INVALID_SCHEDULED_WINDOW'; end if;
  elsif p_starts_at is not null or p_ends_at is not null then raise exception 'FLEXIBLE_OPPORTUNITY_CANNOT_HAVE_SCHEDULE'; end if;
  if p_organization_id is null or not public.is_organization_operator_for(p_organization_id) then raise exception 'ORGANIZATION_ACCESS_REQUIRED'; end if;
  insert into public.impact_opportunities(organization_id,title,description,category,mode,city,starts_at,ends_at,due_at,expected_eligible_minutes,capacity,activity_details,requirements,organization_provides,coordinator_name,coordinator_contact,accessibility_information,participant_contact_fields)
  values(p_organization_id,btrim(p_title),btrim(p_description),p_category,p_mode,nullif(btrim(coalesce(p_city,'')),''),p_starts_at,p_ends_at,p_due_at,p_expected_eligible_minutes,p_capacity,btrim(p_activity_details),nullif(btrim(coalesce(p_requirements,'')),''),nullif(btrim(coalesce(p_organization_provides,'')),''),nullif(btrim(coalesce(p_coordinator_name,'')),''),nullif(btrim(coalesce(p_coordinator_contact,'')),''),nullif(btrim(coalesce(p_accessibility_information,'')),''),coalesce(p_participant_contact_fields,'{}')) returning id into v_id;
  insert into public.impact_audit_events(actor_id,target_type,target_id,organization_id,action,snapshot) values(v_actor,'opportunity',v_id,p_organization_id,'created',jsonb_build_object('status','draft'));
  return v_id;
end;
$$;

drop function if exists public.organization_update_impact_opportunity(uuid, text, text, public.impact_opportunity_category, public.impact_opportunity_mode, text, timestamptz, timestamptz, timestamptz, integer, integer);
create or replace function public.organization_update_impact_opportunity(
  p_opportunity_id uuid, p_title text, p_description text,
  p_category public.impact_opportunity_category, p_mode public.impact_opportunity_mode,
  p_city text, p_starts_at timestamptz, p_ends_at timestamptz, p_due_at timestamptz,
  p_expected_eligible_minutes integer, p_capacity integer,
  p_activity_details text, p_requirements text, p_organization_provides text,
  p_coordinator_name text, p_coordinator_contact text,
  p_accessibility_information text,
  p_participant_contact_fields public.impact_participant_contact_field[] default '{}'
)
returns void language plpgsql security definer set search_path = public
as $$
declare v_actor uuid := auth.uid(); v_opportunity public.impact_opportunities%rowtype;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED'; end if;
  if coalesce(length(btrim(p_title)), 0) < 2 or length(p_title) > 200 then raise exception 'INVALID_OPPORTUNITY_TITLE'; end if;
  if coalesce(length(btrim(p_description)), 0) < 1 then raise exception 'INVALID_OPPORTUNITY_DESCRIPTION'; end if;
  if coalesce(length(btrim(p_activity_details)), 0) < 3 then raise exception 'INVALID_ACTIVITY_DETAILS'; end if;
  if p_category is null or p_mode is null then raise exception 'INVALID_OPPORTUNITY_TYPE'; end if;
  if p_due_at is null or p_expected_eligible_minutes is null or p_expected_eligible_minutes < 1 or p_expected_eligible_minutes > 1440 then raise exception 'INVALID_OPPORTUNITY_TIMING'; end if;
  if p_capacity is null or p_capacity < 1 or p_capacity > 100000 then raise exception 'INVALID_CAPACITY'; end if;
  if p_mode = 'scheduled' then
    if p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at or p_due_at < p_ends_at then raise exception 'INVALID_SCHEDULED_WINDOW'; end if;
  elsif p_starts_at is not null or p_ends_at is not null then raise exception 'FLEXIBLE_OPPORTUNITY_CANNOT_HAVE_SCHEDULE'; end if;
  select * into v_opportunity from public.impact_opportunities where id=p_opportunity_id for update;
  if not found then raise exception 'OPPORTUNITY_NOT_FOUND'; end if;
  if not public.is_organization_operator_for(v_opportunity.organization_id) then raise exception 'ORGANIZATION_ACCESS_REQUIRED'; end if;
  if v_opportunity.status <> 'draft' then raise exception 'ONLY_DRAFT_OPPORTUNITY_EDITABLE'; end if;
  update public.impact_opportunities set title=btrim(p_title),description=btrim(p_description),category=p_category,mode=p_mode,city=nullif(btrim(coalesce(p_city,'')),''),starts_at=p_starts_at,ends_at=p_ends_at,due_at=p_due_at,expected_eligible_minutes=p_expected_eligible_minutes,capacity=p_capacity,activity_details=btrim(p_activity_details),requirements=nullif(btrim(coalesce(p_requirements,'')),''),organization_provides=nullif(btrim(coalesce(p_organization_provides,'')),''),coordinator_name=nullif(btrim(coalesce(p_coordinator_name,'')),''),coordinator_contact=nullif(btrim(coalesce(p_coordinator_contact,'')),''),accessibility_information=nullif(btrim(coalesce(p_accessibility_information,'')),''),participant_contact_fields=coalesce(p_participant_contact_fields,'{}'),updated_at=now() where id=p_opportunity_id;
  insert into public.impact_audit_events(actor_id,target_type,target_id,organization_id,action,snapshot) values(v_actor,'opportunity',p_opportunity_id,v_opportunity.organization_id,'updated',jsonb_build_object('status','draft'));
end;
$$;

revoke execute on function public.organization_create_impact_opportunity(uuid,text,text,public.impact_opportunity_category,public.impact_opportunity_mode,text,timestamptz,timestamptz,timestamptz,integer,integer, text,text,text,text,text,text,public.impact_participant_contact_field[]) from public, anon;
revoke execute on function public.organization_update_impact_opportunity(uuid,text,text,public.impact_opportunity_category,public.impact_opportunity_mode,text,timestamptz,timestamptz,timestamptz,integer,integer, text,text,text,text,text,text,public.impact_participant_contact_field[]) from public, anon;
grant execute on function public.organization_create_impact_opportunity(uuid,text,text,public.impact_opportunity_category,public.impact_opportunity_mode,text,timestamptz,timestamptz,timestamptz,integer,integer, text,text,text,text,text,text,public.impact_participant_contact_field[]) to authenticated;
grant execute on function public.organization_update_impact_opportunity(uuid,text,text,public.impact_opportunity_category,public.impact_opportunity_mode,text,timestamptz,timestamptz,timestamptz,integer,integer, text,text,text,text,text,text,public.impact_participant_contact_field[]) to authenticated;
