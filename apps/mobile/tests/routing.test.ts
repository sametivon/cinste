import { describe, expect, it } from 'vitest';

import { canAccessVerifiedStudentRoute, mobileNavigationKey, resolveMobileDestination, type MobileRouteState } from '@/lib/mobile-routing';

const state = (overrides: Partial<MobileRouteState> = {}): MobileRouteState => ({ hasSession: true, resolved: true, role: 'student', verificationStatus: 'verified', ...overrides });

describe('authoritative mobile account gate', () => {
  it('allows only a verified student into the student shell', () => {
    expect(resolveMobileDestination(state())).toBe('student');
    expect(canAccessVerifiedStudentRoute(state())).toBe(true);
  });

  it('routes unverified, pending, and rejected students to verification', () => {
    expect(resolveMobileDestination(state({ verificationStatus: null }))).toBe('verification');
    expect(resolveMobileDestination(state({ verificationStatus: 'pending' }))).toBe('verification');
    expect(resolveMobileDestination(state({ verificationStatus: 'rejected' }))).toBe('verification');
    expect(canAccessVerifiedStudentRoute(state({ verificationStatus: 'pending' }))).toBe(false);
  });

  it('keeps non-student roles out of the student shell', () => {
    for (const role of ['partner', 'giver', 'admin'] as const) {
      expect(resolveMobileDestination(state({ role, verificationStatus: null }))).toBe('role-boundary');
      expect(canAccessVerifiedStudentRoute(state({ role, verificationStatus: 'verified' }))).toBe(false);
    }
  });

  it('fails closed for a missing profile and while a persisted session is resolving', () => {
    expect(resolveMobileDestination(state({ role: null, verificationStatus: null }))).toBe('role-boundary');
    expect(resolveMobileDestination(state({ resolved: false, verificationStatus: null }))).toBe('loading');
    expect(canAccessVerifiedStudentRoute(state({ resolved: false }))).toBe(false);
  });

  it('updates the destination after a foreground verification decision', () => {
    expect(resolveMobileDestination(state({ verificationStatus: 'pending' }))).toBe('verification');
    expect(resolveMobileDestination(state({ verificationStatus: 'verified' }))).toBe('student');
  });

  it('resets navigation identity between logout and a different login', () => {
    expect(mobileNavigationKey('verified-user')).not.toBe(mobileNavigationKey(undefined));
    expect(mobileNavigationKey('verified-user')).not.toBe(mobileNavigationKey('unverified-user'));
    expect(resolveMobileDestination(state({ hasSession: false, role: null, verificationStatus: null }))).toBe('login');
    expect(resolveMobileDestination(state({ role: 'student', verificationStatus: null }))).toBe('verification');
  });
});
