import { describe, expect, it } from 'vitest';
import { givingOutcomePresentation, type GivingOutcome } from '@/lib/giving-outcomes';

const base: GivingOutcome = {
  order_id: 'order', order_item_id: 'item', offer_title: 'Experience', funded_quantity: 5,
  outcome_state: 'available', reserved_quantity: 2, redeemed_quantity: 1,
  recorded_unreserved_quantity: 2, available_now_quantity: 2, availability_state: 'available',
};

describe('giving outcome presentation', () => {
  it('shows only the reviewed aggregate fields for available outcomes', () => {
    expect(givingOutcomePresentation(base)).toEqual({ kind: 'available', message: null, metrics: { reserved: 2, redeemed: 1, recordedUnreserved: 2, availableNow: 2, availabilityState: 'available' } });
  });

  it.each(['privacy_suppressed', 'unavailable'] as const)('cannot reconstruct metrics from a %s outcome', (outcome_state) => {
    const presentation = givingOutcomePresentation({ ...base, outcome_state, reserved_quantity: null, redeemed_quantity: null, recorded_unreserved_quantity: null, available_now_quantity: null, availability_state: null });
    expect(presentation.metrics).toBeNull();
    expect(presentation.message).toBeTruthy();
  });
});
