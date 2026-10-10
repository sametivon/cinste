-- Impact V1: opportunity-scoped participant projection for Organization operators.
-- Do not expose the Student profile or verification documents through this read.

create or replace function public.list_organization_impact_participants(p_opportunity_ids uuid[])
returns table(
  participation_id uuid,
  opportunity_id uuid,
  participant_id uuid,
  participant_display_name text,
  eligibility_status text,
  participation_status public.impact_participation_status,
  attendance_status public.impact_attendance_status,
  joined_at timestamptz,
  resolved_at timestamptz,
  completed_at timestamptz,
  disputed_at timestamptz
)
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  return query
  select p.id,
         p.opportunity_id,
         p.student_id,
         case
           when strpos(trim(sp.full_name), ' ') > 0 then
             split_part(trim(sp.full_name), ' ', 1) || ' ' ||
             left(regexp_replace(trim(sp.full_name), '^.*\s', ''), 1) || '.'
           else trim(sp.full_name)
         end,
         case when sp.verification_status = 'verified' then 'verified_student' else sp.verification_status::text end,
         p.status,
         p.attendance_status,
         p.joined_at,
         p.resolved_at,
         p.completed_at,
         p.disputed_at
    from public.impact_participations p
    join public.impact_opportunities o on o.id = p.opportunity_id
    join public.student_profiles sp on sp.user_id = p.student_id
   where p.opportunity_id = any(coalesce(p_opportunity_ids, '{}'::uuid[]))
     and public.is_organization_operator_for(o.organization_id)
   order by p.joined_at desc;
end;
$$;

revoke execute on function public.list_organization_impact_participants(uuid[]) from public, anon;
grant execute on function public.list_organization_impact_participants(uuid[]) to authenticated;
