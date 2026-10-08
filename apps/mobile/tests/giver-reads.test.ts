import { describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/supabase', () => ({ supabase: { rpc: vi.fn(), from: vi.fn() } }));
import { getMyGivingOutcomes, presentGivingOutcome, shapeActiveGiverOffers } from '@/lib/giver-reads';
import { supabase } from '@/lib/supabase';
import type { GivingOutcome } from '@/lib/types';

const outcome = (state: GivingOutcome['outcome_state'], overrides: Partial<GivingOutcome> = {}): GivingOutcome => ({ order_id: 'order-1', order_item_id: 'item-1', offer_title: 'Coffee', funded_quantity: 5, outcome_state: state, reserved_quantity: 2, redeemed_quantity: 1, recorded_unreserved_quantity: 2, available_now_quantity: 2, availability_state: 'available', ...overrides });

describe('native Giver read contracts', () => {
  it('shapes the catalog to active offers with active partners and categories', () => {
    const base = { id: '1', localization_key: null, name: 'Offer', description: '', image_path: null, giver_price_bani: 100, fulfillment_type: 'instant' as const, redemption_instructions: null, booking_url: null, active: true, partners: { name: 'Partner', address: null, active: true }, categories: { name: 'Category', slug: 'food-drink', active: true } };
    expect(shapeActiveGiverOffers([base, { ...base, id: '2', active: false }, { ...base, id: '3', partners: { ...base.partners, active: false } }]).map((offer) => offer.id)).toEqual(['1']);
  });
  it.each(['available', 'privacy_suppressed', 'unavailable'] as const)('preserves %s outcome state', (state) => expect(presentGivingOutcome(outcome(state)).state).toBe(state));
  it('does not infer zero or expose metrics for suppressed or unavailable outcomes', () => {
    for (const state of ['privacy_suppressed', 'unavailable'] as const) expect(presentGivingOutcome(outcome(state, { reserved_quantity: null, redeemed_quantity: null, recorded_unreserved_quantity: null, available_now_quantity: null })).metrics).toBeNull();
  });
  it('fails closed when an available row has missing activity metrics', () => expect(presentGivingOutcome(outcome('available', { reserved_quantity: null })).state).toBe('unavailable'));
  it('calls the outcomes RPC without a caller-supplied user or Giver ID', async () => {
    const rpc = vi.mocked(supabase.rpc).mockResolvedValue({ data: [], error: null } as never);
    await getMyGivingOutcomes();
    expect(rpc).toHaveBeenCalledWith('list_my_giving_outcomes');
    expect(rpc.mock.calls[0]).toHaveLength(1);
    rpc.mockReset();
  });
});
