-- Impact V1: email-only, per-opportunity consent with time-limited Organization access.

alter table public.impact_participations
  add column if not exists participant_email_consent_at timestamptz,
  add column if not exists participant_email_access_expires_at timestamptz;

alter table public.impact_opportunities
  add constraint impact_opportunities_phone_contact_not_available
  check (not ('phone'::public.impact_participant_contact_field = any(participant_contact_fields))) not valid;

drop function if exists public.organization_create_impact_opportunity(uuid, text, text, public.impact_opportunity_category, public.impact_opportunity_mode, text, timestamptz, timestamptz, timestamptz, integer, integer, text, text, text, text, text, text, public.impact_participant_contact_field[]);
create function public.organization_create_impact_opportunity(
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
  if 'phone'::public.impact_participant_contact_field = any(coalesce(p_participant_contact_fields, '{}')) then raise exception 'PHONE_CONTACT_NOT_AVAILABLE'; end if;
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

drop function if exists public.organization_update_impact_opportunity(uuid, text, text, public.impact_opportunity_category, public.impact_opportunity_mode, text, timestamptz, timestamptz, timestamptz, integer, integer, text, text, text, text, text, text, public.impact_participant_contact_field[]);
create function public.organization_update_impact_opportunity(
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
  if 'phone'::public.impact_participant_contact_field = any(coalesce(p_participant_contact_fields, '{}')) then raise exception 'PHONE_CONTACT_NOT_AVAILABLE'; end if;
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

revoke execute on function public.organization_create_impact_opportunity(uuid,text,text,public.impact_opportunity_category,public.impact_opportunity_mode,text,timestamptz,timestamptz,timestamptz,integer,integer,text,text,text,text,text,text,public.impact_participant_contact_field[]) from public, anon;
revoke execute on function public.organization_update_impact_opportunity(uuid,text,text,public.impact_opportunity_category,public.impact_opportunity_mode,text,timestamptz,timestamptz,timestamptz,integer,integer,text,text,text,text,text,text,public.impact_participant_contact_field[]) from public, anon;
grant execute on function public.organization_create_impact_opportunity(uuid,text,text,public.impact_opportunity_category,public.impact_opportunity_mode,text,timestamptz,timestamptz,timestamptz,integer,integer,text,text,text,text,text,text,public.impact_participant_contact_field[]) to authenticated;
grant execute on function public.organization_update_impact_opportunity(uuid,text,text,public.impact_opportunity_category,public.impact_opportunity_mode,text,timestamptz,timestamptz,timestamptz,integer,integer,text,text,text,text,text,text,public.impact_participant_contact_field[]) to authenticated;

drop function if exists public.student_join_impact_opportunity(uuid);
create function public.student_join_impact_opportunity(p_opportunity_id uuid)
returns uuid language plpgsql security definer set search_path = public
as $$
declare v_student uuid := auth.uid(); v_opportunity public.impact_opportunities%rowtype; v_active_count integer; v_taken_count integer; v_no_show_count integer; v_last_no_show timestamptz; v_participation_id uuid;
begin
  if v_student is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (select 1 from public.student_profiles where user_id = v_student and verification_status = 'verified') then raise exception 'STUDENT_NOT_VERIFIED'; end if;
  if not exists (select 1 from public.student_profiles where user_id = v_student and impact_18_plus_verified) then raise exception 'STUDENT_IMPACT_18_PLUS_REQUIRED'; end if;
  perform public.expire_impact_participations(); perform pg_advisory_xact_lock(hashtext(v_student::text));
  select * into v_opportunity from public.impact_opportunities where id = p_opportunity_id for update;
  if not found or v_opportunity.status <> 'published' then raise exception 'OPPORTUNITY_UNAVAILABLE'; end if;
  if exists (select 1 from public.impact_contributions where student_id = v_student and opportunity_id = p_opportunity_id) then raise exception 'OPPORTUNITY_CONTRIBUTION_ALREADY_EARNED'; end if;
  if not exists (select 1 from public.organizations where id = v_opportunity.organization_id and status = 'active') then raise exception 'ORGANIZATION_NOT_ACTIVE'; end if;
  if v_opportunity.due_at <= now() then raise exception 'OPPORTUNITY_EXPIRED'; end if;
  if v_opportunity.mode = 'scheduled' and v_opportunity.starts_at <= now() then raise exception 'OPPORTUNITY_ALREADY_STARTED'; end if;
  select count(*)::integer, max(resolved_at) into v_no_show_count, v_last_no_show from public.impact_participations where student_id = v_student and status = 'no_show' and resolved_at >= now() - interval '90 days';
  if v_no_show_count >= 2 and now() < v_last_no_show + (case when v_no_show_count >= 3 then interval '7 days' else interval '48 hours' end) then raise exception 'IMPACT_JOINING_RESTRICTED'; end if;
  select count(*) into v_active_count from public.impact_participations where student_id = v_student and status in ('joined', 'overdue');
  if v_active_count >= 2 then raise exception 'ACTIVE_PARTICIPATION_LIMIT_REACHED'; end if;
  select count(*) into v_taken_count from public.impact_participations where opportunity_id = p_opportunity_id and status = 'joined';
  if v_taken_count >= v_opportunity.capacity then raise exception 'OPPORTUNITY_FULL'; end if;
  if v_opportunity.mode = 'scheduled' and exists (select 1 from public.impact_participations p join public.impact_opportunities existing on existing.id = p.opportunity_id where p.student_id = v_student and p.status in ('joined', 'overdue') and existing.mode = 'scheduled' and v_opportunity.starts_at < existing.ends_at and existing.starts_at < v_opportunity.ends_at) then raise exception 'SCHEDULE_OVERLAP'; end if;
  insert into public.impact_participations(opportunity_id, student_id, participant_email_consent_at, participant_email_access_expires_at)
  values (p_opportunity_id, v_student, case when 'email'::public.impact_participant_contact_field = any(v_opportunity.participant_contact_fields) then now() end, case when 'email'::public.impact_participant_contact_field = any(v_opportunity.participant_contact_fields) then coalesce(v_opportunity.ends_at, v_opportunity.due_at) end)
  returning id into v_participation_id;
  insert into public.impact_audit_events(actor_id, target_type, target_id, organization_id, action, snapshot) values (v_student, 'participation', v_participation_id, v_opportunity.organization_id, 'joined', jsonb_build_object('opportunity_id', p_opportunity_id, 'email_consent', 'email'::public.impact_participant_contact_field = any(v_opportunity.participant_contact_fields), 'email_access_expires_at', case when 'email'::public.impact_participant_contact_field = any(v_opportunity.participant_contact_fields) then coalesce(v_opportunity.ends_at, v_opportunity.due_at) end));
  return v_participation_id;
end;
$$;
revoke execute on function public.student_join_impact_opportunity(uuid) from public, anon;
grant execute on function public.student_join_impact_opportunity(uuid) to authenticated;

drop function if exists public.list_organization_impact_participants(uuid[]);
create function public.list_organization_impact_participants(p_opportunity_ids uuid[])
returns table(participation_id uuid, opportunity_id uuid, participant_id uuid, participant_display_name text, participant_email text, eligibility_status text, participation_status public.impact_participation_status, attendance_status public.impact_attendance_status, joined_at timestamptz, resolved_at timestamptz, completed_at timestamptz, disputed_at timestamptz)
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  return query select p.id, p.opportunity_id, p.student_id,
    case when strpos(trim(sp.full_name), ' ') > 0 then split_part(trim(sp.full_name), ' ', 1) || ' ' || upper(left(regexp_replace(trim(sp.full_name), '^.*\s', ''), 1)) || '.' else trim(sp.full_name) end,
    case when p.participant_email_consent_at is not null and p.participant_email_access_expires_at > now() then pr.email else null end,
    case when sp.verification_status = 'verified' and sp.impact_18_plus_verified then 'verified_18_plus' when sp.verification_status = 'verified' then 'verified_student' else sp.verification_status::text end,
    p.status, p.attendance_status, p.joined_at, p.resolved_at, p.completed_at, p.disputed_at
  from public.impact_participations p join public.impact_opportunities o on o.id = p.opportunity_id join public.student_profiles sp on sp.user_id = p.student_id join public.profiles pr on pr.id = p.student_id
  where p.opportunity_id = any(coalesce(p_opportunity_ids, '{}'::uuid[])) and public.is_organization_operator_for(o.organization_id)
  order by p.joined_at desc;
end;
$$;
revoke execute on function public.list_organization_impact_participants(uuid[]) from public, anon;
grant execute on function public.list_organization_impact_participants(uuid[]) to authenticated;

-- Existing legacy rows remain private; new Student reads expose only the V1 field.
drop function public.list_impact_opportunities(public.impact_opportunity_category, text);
create function public.list_impact_opportunities(p_category public.impact_opportunity_category default null, p_city text default null)
returns table(id uuid, organization_id uuid, organization_name text, title text, description text, activity_details text, requirements text, organization_provides text, coordinator_name text, coordinator_contact text, accessibility_information text, participant_contact_fields public.impact_participant_contact_field[], category public.impact_opportunity_category, mode public.impact_opportunity_mode, city text, starts_at timestamptz, ends_at timestamptz, due_at timestamptz, expected_eligible_minutes integer, capacity integer, remaining_capacity integer)
language plpgsql security definer set search_path = public
as $$ begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (select 1 from public.student_profiles where user_id = auth.uid() and verification_status = 'verified') then raise exception 'STUDENT_NOT_VERIFIED'; end if;
  return query select o.id,o.organization_id,org.name,o.title,o.description,o.activity_details,o.requirements,o.organization_provides,o.coordinator_name,o.coordinator_contact,o.accessibility_information,array_remove(o.participant_contact_fields,'phone'::public.impact_participant_contact_field),o.category,o.mode,o.city,o.starts_at,o.ends_at,o.due_at,o.expected_eligible_minutes,o.capacity,greatest(o.capacity-(select count(*)::integer from public.impact_participations p where p.opportunity_id=o.id and p.status='joined'),0)
  from public.impact_opportunities o join public.organizations org on org.id=o.organization_id where o.status='published' and org.status='active' and o.due_at>now() and (p_category is null or o.category=p_category) and (p_city is null or o.city=p_city or (o.mode='flexible_remote' and o.city is null)) order by o.due_at,o.starts_at nulls last,o.created_at;
end; $$;
grant execute on function public.list_impact_opportunities(public.impact_opportunity_category, text) to authenticated;

drop function public.list_my_impact_participations();
create function public.list_my_impact_participations()
returns table(participation_id uuid, participation_status public.impact_participation_status, opportunity_id uuid, organization_id uuid, organization_name text, title text, description text, activity_details text, requirements text, organization_provides text, coordinator_name text, coordinator_contact text, accessibility_information text, participant_contact_fields public.impact_participant_contact_field[], category public.impact_opportunity_category, mode public.impact_opportunity_mode, city text, starts_at timestamptz, ends_at timestamptz, due_at timestamptz, expected_eligible_minutes integer, capacity integer, remaining_capacity integer)
language plpgsql security definer set search_path = public
as $$ declare v_student uuid := auth.uid(); begin
  if v_student is null then raise exception 'AUTH_REQUIRED'; end if;
  return query select p.id,p.status,o.id,o.organization_id,org.name,o.title,o.description,o.activity_details,o.requirements,o.organization_provides,o.coordinator_name,o.coordinator_contact,o.accessibility_information,array_remove(o.participant_contact_fields,'phone'::public.impact_participant_contact_field),o.category,o.mode,o.city,o.starts_at,o.ends_at,o.due_at,o.expected_eligible_minutes,o.capacity,greatest(o.capacity-(select count(*)::integer from public.impact_participations joined where joined.opportunity_id=o.id and joined.status='joined'),0)
  from public.impact_participations p join public.impact_opportunities o on o.id=p.opportunity_id join public.organizations org on org.id=o.organization_id where p.student_id=v_student order by p.created_at desc;
end; $$;
grant execute on function public.list_my_impact_participations() to authenticated;
