import { describe, expect, it } from 'vitest';

import { offerFromClaimRelation } from '@/lib/claim-display';

describe('offerFromClaimRelation', () => {
  const offer = { name: 'Cinema ticket' };

  it('keeps a readable offer when every relation is present', () => {
    expect(offerFromClaimRelation({ offers: offer })).toBe(offer);
  });

  it('returns no offer when the embedded campaign is unavailable', () => {
    expect(offerFromClaimRelation<typeof offer>(null)).toBeNull();
  });

  it('returns no offer when the embedded offer is unavailable', () => {
    expect(offerFromClaimRelation<typeof offer>({ offers: null })).toBeNull();
  });
});
