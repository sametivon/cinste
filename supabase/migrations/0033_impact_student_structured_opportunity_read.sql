-- Impact V1: expose approved operational details to the participating Student.

drop function public.list_impact_opportunities(public.impact_opportunity_category, text);
create function public.list_impact_opportunities(
  p_category public.impact_opportunity_category default null,
  p_city text default null
)
returns table(
  id uuid,
  organization_id uuid,
  organization_name text,
  title text,
  description text,
  activity_details text,
  requirements text,
  organization_provides text,
  coordinator_name text,
  coordinator_contact text,
  accessibility_information text,
  participant_contact_fields public.impact_participant_contact_field[],
  category public.impact_opportunity_category,
  mode public.impact_opportunity_mode,
  city text,
  starts_at timestamptz,
  ends_at timestamptz,
  due_at timestamptz,
  expected_eligible_minutes integer,
  capacity integer,
  remaining_capacity integer
)
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (select 1 from public.student_profiles where user_id = auth.uid() and verification_status = 'verified') then raise exception 'STUDENT_NOT_VERIFIED'; end if;
  return query
  select o.id, o.organization_id, org.name, o.title, o.description,
         o.activity_details, o.requirements, o.organization_provides,
         o.coordinator_name, o.coordinator_contact, o.accessibility_information,
         o.participant_contact_fields, o.category, o.mode, o.city,
         o.starts_at, o.ends_at, o.due_at, o.expected_eligible_minutes, o.capacity,
         greatest(o.capacity - (select count(*)::integer from public.impact_participations p where p.opportunity_id = o.id and p.status = 'joined'), 0)
    from public.impact_opportunities o
    join public.organizations org on org.id = o.organization_id
   where o.status = 'published'
     and org.status = 'active'
     and o.due_at > now()
     and (p_category is null or o.category = p_category)
     and (p_city is null or o.city = p_city or (o.mode = 'flexible_remote' and o.city is null))
   order by o.due_at, o.starts_at nulls last, o.created_at;
end;
$$;

grant execute on function public.list_impact_opportunities(public.impact_opportunity_category, text) to authenticated;

drop function public.list_my_impact_participations();
create function public.list_my_impact_participations()
returns table(
  participation_id uuid,
  participation_status public.impact_participation_status,
  opportunity_id uuid,
  organization_id uuid,
  organization_name text,
  title text,
  description text,
  activity_details text,
  requirements text,
  organization_provides text,
  coordinator_name text,
  coordinator_contact text,
  accessibility_information text,
  participant_contact_fields public.impact_participant_contact_field[],
  category public.impact_opportunity_category,
  mode public.impact_opportunity_mode,
  city text,
  starts_at timestamptz,
  ends_at timestamptz,
  due_at timestamptz,
  expected_eligible_minutes integer,
  capacity integer,
  remaining_capacity integer
)
language plpgsql security definer set search_path = public
as $$
declare v_student uuid := auth.uid();
begin
  if v_student is null then raise exception 'AUTH_REQUIRED'; end if;
  return query
  select p.id, p.status, o.id, o.organization_id, org.name, o.title, o.description,
         o.activity_details, o.requirements, o.organization_provides,
         o.coordinator_name, o.coordinator_contact, o.accessibility_information,
         o.participant_contact_fields, o.category, o.mode, o.city, o.starts_at,
         o.ends_at, o.due_at, o.expected_eligible_minutes, o.capacity,
         greatest(o.capacity - (select count(*)::integer from public.impact_participations joined where joined.opportunity_id = o.id and joined.status = 'joined'), 0)
    from public.impact_participations p
    join public.impact_opportunities o on o.id = p.opportunity_id
    join public.organizations org on org.id = o.organization_id
   where p.student_id = v_student
   order by p.created_at desc;
end;
$$;

grant execute on function public.list_my_impact_participations() to authenticated;
