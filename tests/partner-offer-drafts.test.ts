import { describe, expect, it } from 'vitest';
import { partnerOfferDraftInput } from '@/app/partner/actions';

describe('partner offer drafts', () => {
  const input = { partnerId: '00000000-0000-4000-8000-000000000001', categoryId: '00000000-0000-4000-8000-000000000002', name: 'Haircut', description: 'A student haircut.', fulfillment: 'appointment_required', instructions: '', bookingUrl: '' };
  it('accepts only partner-authored descriptive fields', () => {
    expect(partnerOfferDraftInput.parse(input)).toMatchObject({ name: 'Haircut', fulfillment: 'appointment_required' });
    expect(() => partnerOfferDraftInput.parse({ ...input, price: '1' })).toThrow();
  });
});
