-- CINSTE Impact: self-scoped participation context for the native student app.
-- Discovery remains governed by list_impact_opportunities. This projection is
-- intentionally limited to the authenticated student's own participation rows.

create or replace function public.list_my_impact_participations()
returns table(
  participation_id uuid,
  participation_status public.impact_participation_status,
  opportunity_id uuid,
  organization_id uuid,
  organization_name text,
  title text,
  description text,
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
  select p.id, p.status, o.id, o.organization_id, org.name, o.title,
         o.description, o.category, o.mode, o.city, o.starts_at, o.ends_at,
         o.due_at, o.expected_eligible_minutes, o.capacity,
         greatest(o.capacity - (
           select count(*)::integer from public.impact_participations joined
            where joined.opportunity_id = o.id and joined.status = 'joined'
         ), 0)
    from public.impact_participations p
    join public.impact_opportunities o on o.id = p.opportunity_id
    join public.organizations org on org.id = o.organization_id
   where p.student_id = v_student
   order by p.created_at desc;
end;
$$;

revoke execute on function public.list_my_impact_participations() from public, anon;
grant execute on function public.list_my_impact_participations() to authenticated;
