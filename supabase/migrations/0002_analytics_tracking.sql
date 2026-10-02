-- Apply after 0001_cinste.sql. Keeps analytics writes constrained to the MVP event vocabulary.
create or replace function public.track_event(
  p_event text,
  p_entity_type text default null,
  p_entity_id uuid default null
) returns void
language plpgsql security definer set search_path=public as $$
begin
  if p_event not in (
    'landing_view','signup','verification_submitted','verification_approved',
    'offer_viewed','claim_started','claim_completed','claim_expired',
    'redemption_completed','giver_checkout_started','mock_payment_completed',
    'pay_it_forward_clicked'
  ) then
    raise exception 'INVALID_EVENT';
  end if;
  insert into analytics_events(actor_id,event_name,entity_type,entity_id)
  values(auth.uid(),p_event,p_entity_type,p_entity_id);
end $$;

grant execute on function public.track_event(text,text,uuid) to authenticated;
