-- Impact V1: expose only privacy-preserving community aggregates to Givers.
-- There is intentionally no Giver/Student or funded-campaign attribution here.

create or replace function public.list_community_impact_outcomes()
returns table(
  outcome_state text,
  completed_impact_activities integer,
  total_impact_hours double precision,
  participating_students integer
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_students integer;
  v_activities integer;
  v_hours double precision;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select
    count(*) filter (where c.revoked_at is null)::integer,
    round(coalesce(sum(c.verified_minutes) filter (where c.revoked_at is null), 0)::numeric / 60, 1)::double precision,
    count(distinct c.student_id) filter (where c.revoked_at is null)::integer
  into v_activities, v_hours, v_students
  from public.impact_contributions c;

  if coalesce(v_students, 0) < 5 then
    return query select 'privacy_suppressed'::text, null::integer, null::double precision, null::integer;
    return;
  end if;

  return query select 'available'::text, v_activities, v_hours, v_students;
end;
$$;

revoke execute on function public.list_community_impact_outcomes() from public, anon;
grant execute on function public.list_community_impact_outcomes() to authenticated;
