-- The legacy trigger predates the RPC-only verification lifecycle. It checks
-- auth.uid() rather than the trusted function boundary and therefore blocks a
-- legitimate rejected-to-pending resubmission. Direct profile mutations are
-- already denied by the 0006 RLS policy changes; lifecycle transitions occur
-- only in submit_student_verification or review_student_verification.
drop trigger if exists protect_student_verification on public.student_profiles;
