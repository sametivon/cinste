-- campaigns_read calls this security-definer boolean function. PostgreSQL also
-- requires the querying role to have EXECUTE, even when the call originates in
-- an RLS policy. The function exposes only the same claimability predicate
-- already used to decide whether a campaign row is visible.
grant execute on function public.campaign_is_claimable(uuid) to authenticated;
