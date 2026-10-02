import { describe, expect, it } from 'vitest';
import { tokenFromScannedCode } from '@/lib/redemption-code';

describe('tokenFromScannedCode', () => {
  it('extracts a CINSTE token from the QR redemption URL', () => {
    expect(tokenFromScannedCode('https://cinste.test/r/opaque-token')).toBe('opaque-token');
  });

  it('preserves a manually encoded opaque token', () => {
    expect(tokenFromScannedCode('opaque-token')).toBe('opaque-token');
  });

  it('does not create a token from blank scanner input', () => {
    expect(tokenFromScannedCode('  ')).toBe('');
  });
});
