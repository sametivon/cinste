-- CINSTE Giver: a deliberately narrow, self-scoped outcome projection.
-- This reads historical funded inventory without changing campaign, claim, or
-- redemption authority. A row is attributable only when the paid order item
-- has one unambiguous, trusted campaign mapping.

create or replace function public.list_my_giving_outcomes()
returns table(
  order_id uuid,
  order_item_id uuid,
  offer_title text,
  funded_quantity integer,
  outcome_state text,
  reserved_quantity integer,
  redeemed_quantity integer,
  recorded_unreserved_quantity integer,
  available_now_quantity integer,
  availability_state text
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_giver uuid := auth.uid();
begin
  if v_giver is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  return query
  with owned_paid_items as (
    select
      go.id as source_order_id,
      oi.id as source_order_item_id,
      oi.offer_id as source_offer_id,
      o.name as source_offer_title,
      oi.quantity as source_funded_quantity,
      count(*) over (partition by go.id)::integer as source_order_item_count
    from public.giver_orders go
    join public.giver_order_items oi on oi.order_id = go.id
    join public.offers o on o.id = oi.offer_id
    where go.giver_id = v_giver
      and go.status = 'paid'
      and exists (
        select 1
        from public.payments pay
        where pay.order_id = go.id
          and pay.status = 'succeeded'
      )
  ), mapped_items as (
    select
      i.*,
      candidate.id as campaign_id,
      candidate.funding_source as campaign_funding_source,
      candidate.quantity_total as campaign_quantity_total,
      candidate.quantity_available as campaign_quantity_available,
      candidate.status as campaign_status,
      candidate.starts_at as campaign_starts_at,
      candidate.ends_at as campaign_ends_at,
      candidate.event_ends_at as campaign_event_ends_at,
      candidate_offer.fulfillment_type as campaign_fulfillment_type,
      candidate_offer.active as campaign_offer_active,
      candidate_partner.active as campaign_partner_active,
      candidate_category.active as campaign_category_active,
      matching.matching_campaign_count,
      all_for_order.order_campaign_count
    from owned_paid_items i
    cross join lateral (
      select count(*)::integer as matching_campaign_count
      from public.campaigns c
      where c.giver_order_id = i.source_order_id
        and c.offer_id = i.source_offer_id
    ) matching
    cross join lateral (
      select count(*)::integer as order_campaign_count
      from public.campaigns c
      where c.giver_order_id = i.source_order_id
    ) all_for_order
    left join lateral (
      select c.*
      from public.campaigns c
      where c.giver_order_id = i.source_order_id
        and c.offer_id = i.source_offer_id
      order by c.id
      limit 1
    ) candidate on true
    left join public.offers candidate_offer on candidate_offer.id = candidate.offer_id
    left join public.partners candidate_partner on candidate_partner.id = candidate_offer.partner_id
    left join public.categories candidate_category on candidate_category.id = candidate_offer.category_id
  ), attributed_items as (
    select
      m.*,
      (
        m.order_campaign_count = m.source_order_item_count
        and m.matching_campaign_count = 1
        and m.campaign_id is not null
        and m.campaign_funding_source = 'mock_payment'
        and m.campaign_quantity_total = m.source_funded_quantity
      ) as is_cleanly_attributed
    from mapped_items m
  ), measured_items as (
    select
      a.*,
      stats.reserved_count,
      stats.redeemed_count,
      stats.participating_student_count,
      availability.is_claimable_now
    from attributed_items a
    left join lateral (
      select
        count(*) filter (
          where cl.status = 'active'
            and (cl.expires_at is null or cl.expires_at > now())
            and a.campaign_ends_at > now()
            and (
              a.campaign_fulfillment_type <> 'scheduled_event'
              or (a.campaign_event_ends_at is not null and a.campaign_event_ends_at > now())
            )
        )::integer as reserved_count,
        count(*) filter (
          where cl.status = 'redeemed'
            and exists (
              select 1
              from public.redemption_events re
              where re.claim_id = cl.id
            )
        )::integer as redeemed_count,
        count(distinct cl.student_id)::integer as participating_student_count
      from public.claims cl
      where cl.campaign_id = a.campaign_id
    ) stats on a.is_cleanly_attributed
    left join lateral (
      select (
        a.campaign_status = 'active'
        and a.campaign_starts_at <= now()
        and a.campaign_ends_at > now()
        and a.campaign_offer_active
        and a.campaign_partner_active
        and a.campaign_category_active
        and (
          a.campaign_fulfillment_type <> 'scheduled_event'
          or (a.campaign_event_ends_at is not null and a.campaign_event_ends_at > now())
        )
      ) as is_claimable_now
    ) availability on a.is_cleanly_attributed
  )
  select
    m.source_order_id,
    m.source_order_item_id,
    m.source_offer_title,
    m.source_funded_quantity,
    case
      when not m.is_cleanly_attributed then 'unavailable'
      when m.source_funded_quantity < 5 or coalesce(m.participating_student_count, 0) < 5 then 'privacy_suppressed'
      else 'available'
    end,
    case when m.is_cleanly_attributed and m.source_funded_quantity >= 5 and coalesce(m.participating_student_count, 0) >= 5 then coalesce(m.reserved_count, 0) else null end,
    case when m.is_cleanly_attributed and m.source_funded_quantity >= 5 and coalesce(m.participating_student_count, 0) >= 5 then coalesce(m.redeemed_count, 0) else null end,
    case when m.is_cleanly_attributed and m.source_funded_quantity >= 5 and coalesce(m.participating_student_count, 0) >= 5 then m.campaign_quantity_available else null end,
    case when m.is_cleanly_attributed and m.source_funded_quantity >= 5 and coalesce(m.participating_student_count, 0) >= 5 then case when m.is_claimable_now then m.campaign_quantity_available else 0 end else null end,
    case when m.is_cleanly_attributed and m.source_funded_quantity >= 5 and coalesce(m.participating_student_count, 0) >= 5 then case when m.is_claimable_now and m.campaign_quantity_available > 0 then 'available' else 'unavailable' end else null end
  from measured_items m
  order by m.source_order_id desc, m.source_order_item_id;
end;
$$;

revoke execute on function public.list_my_giving_outcomes() from public, anon;
grant execute on function public.list_my_giving_outcomes() to authenticated;
