import { describe, expect, it } from 'vitest';
import { reviewVerificationInput } from '@/lib/verification-review';

const id = '00000000-0000-4000-8000-000000000001';
describe('verification review Server Action input', () => {
  it('accepts a reliable explicit approve decision', () => {
    expect(reviewVerificationInput.parse({ id, decision: 'verified' }).decision).toBe('verified');
  });
  it('accepts a reliable explicit reject decision', () => {
    expect(reviewVerificationInput.parse({ id, decision: 'rejected', rejectionReason: 'Documentul nu este lizibil.' }).decision).toBe('rejected');
  });
  it('requires a student-safe reason for rejection', () => {
    expect(() => reviewVerificationInput.parse({ id, decision: 'rejected' })).toThrow('REJECTION_REASON_REQUIRED');
  });
  it('does not allow a rejection reason on approval', () => {
    expect(() => reviewVerificationInput.parse({ id, decision: 'verified', rejectionReason: 'unused' })).toThrow('REJECTION_REASON_NOT_ALLOWED');
  });
});
