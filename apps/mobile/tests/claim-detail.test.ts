import { describe, expect, it } from 'vitest';

import { offerFromClaimRelation } from '@/lib/claim-display';

type DetailOffer = { name: string; partners: { name: string; address: string | null } | null; categories: { name: string } | null };

describe('claim-detail nullable relations', () => {
  it('preserves a claim state when campaign metadata is unavailable', () => {
    const claim = { status: 'active', expires_at: '2026-10-06T12:00:00.000Z', campaigns: null as { offers: DetailOffer | null } | null };

    expect(offerFromClaimRelation(claim.campaigns)).toBeNull();
    expect(claim.status).toBe('active');
    expect(claim.expires_at).toBeTruthy();
  });

  it('accepts missing offer, partner, and category metadata without dereferencing it', () => {
    expect(offerFromClaimRelation<DetailOffer>({ offers: null })).toBeNull();
    expect(offerFromClaimRelation({ offers: { name: 'Cinema ticket', partners: null, categories: null } })?.partners).toBeNull();
  });
});
