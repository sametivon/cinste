import { describe, expect, it } from 'vitest';
import { redemptionPresentation } from '@/lib/partner-redemption';

describe('partner redemption presentation', () => {
  it('permits confirmation only for a server-validated claim', () => {
    expect(redemptionPresentation('VALID')).toMatchObject({ canConfirm: true, tone: 'success' });
    expect(redemptionPresentation('EXPIRED').canConfirm).toBe(false);
  });
  it.each([['INVALID CODE', 'Cod invalid'], ['ALREADY REDEEMED', 'Deja răscumpărat'], ['EXPIRED', 'Expirat'], ['NOT VALID AT THIS PARTNER', 'Alt partener'], ['NOT YET VALID', 'Încă nu este valabil']])('gives %s a distinct operational message', (state, title) => {
    expect(redemptionPresentation(state)).toMatchObject({ title, canConfirm: false });
  });
  it('keeps unavailable results non-actionable', () => {
    expect(redemptionPresentation(null)).toMatchObject({ title: 'CINSTE indisponibil', canConfirm: false });
  });
});
