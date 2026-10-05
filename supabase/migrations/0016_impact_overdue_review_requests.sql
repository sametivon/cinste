-- CINSTE Impact Batch 5: student-requested Admin review for overdue work.
-- This does not resolve, verify, settle, or otherwise alter participation.

create table public.impact_overdue_review_requests (
  participation_id uuid primary key references public.impact_participations(id),
  student_id uuid not null references public.student_profiles(user_id),
  requested_at timestamptz not null default now(),
  reason text,
  check (reason is null or length(btrim(reason)) between 3 and 500)
);

create index impact_overdue_review_requests_requested on public.impact_overdue_review_requests(requested_at desc);

alter table public.impact_overdue_review_requests enable row level security;
create policy overdue_review_requests_student_read on public.impact_overdue_review_requests
  for select using (student_id = auth.uid());
create policy overdue_review_requests_admin_read on public.impact_overdue_review_requests
  for select using (public.is_admin());

revoke all on table public.impact_overdue_review_requests from anon, authenticated;
grant select on public.impact_overdue_review_requests to authenticated;

create or replace function public.student_request_impact_overdue_review(
  p_participation_id uuid,
  p_reason text default null
)
returns timestamptz
language plpgsql security definer set search_path = public
as $$
declare
  v_student uuid := auth.uid();
  v_participation public.impact_participations%rowtype;
  v_organization_id uuid;
  v_requested_at timestamptz;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if v_student is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_reason is not null and (length(v_reason) < 3 or length(v_reason) > 500) then
    raise exception 'INVALID_REVIEW_REQUEST_REASON';
  end if;

  select * into v_participation
    from public.impact_participations
   where id = p_participation_id and student_id = v_student
   for update;
  if not found then raise exception 'PARTICIPATION_NOT_FOUND'; end if;
  if v_participation.status <> 'overdue' then raise exception 'PARTICIPATION_NOT_OVERDUE'; end if;

  insert into public.impact_overdue_review_requests(participation_id, student_id, reason)
  values (v_participation.id, v_student, v_reason)
  on conflict (participation_id) do nothing
  returning requested_at into v_requested_at;

  if v_requested_at is null then
    select requested_at into v_requested_at
      from public.impact_overdue_review_requests
     where participation_id = v_participation.id;
    return v_requested_at;
  end if;

  select organization_id into v_organization_id
    from public.impact_opportunities
   where id = v_participation.opportunity_id;
  insert into public.impact_audit_events(actor_id, target_type, target_id, organization_id, action, reason, snapshot)
  values (v_student, 'participation', v_participation.id, v_organization_id,
          'overdue_review_requested', v_reason, jsonb_build_object('status', 'overdue'));
  return v_requested_at;
end;
$$;

revoke execute on function public.student_request_impact_overdue_review(uuid, text) from public, anon;
grant execute on function public.student_request_impact_overdue_review(uuid, text) to authenticated;
