import { describe, expect, it } from 'vitest';

import { canAccessVerifiedStudentRoute, mobileNavigationKey, resolveMobileDestination, resolveWorkspaceEnvelope, type MobileRouteState } from '@/lib/mobile-routing';

const state = (overrides: Partial<MobileRouteState> = {}): MobileRouteState => ({ hasSession: true, resolved: true, role: 'student', verificationStatus: 'verified', ...overrides });

describe('authoritative mobile account gate', () => {
  it('derives only independently readable workspaces and fails closed on stale reads', () => {
    expect(resolveWorkspaceEnvelope({ profileRole: 'giver', partnerAssignment: false, organizationAssignment: true, readsAvailable: true })).toEqual({ status: 'resolved', workspaces: ['giver', 'organization'] });
    expect(resolveWorkspaceEnvelope({ profileRole: 'partner', partnerAssignment: false, organizationAssignment: false, readsAvailable: true })).toEqual({ status: 'resolved', workspaces: [] });
    expect(resolveWorkspaceEnvelope({ profileRole: 'student', partnerAssignment: false, organizationAssignment: true, readsAvailable: false })).toEqual({ status: 'unavailable', workspaces: [] });
  });

  it('allows only a verified student into the student shell', () => {
    expect(resolveMobileDestination(state())).toBe('student');
    expect(canAccessVerifiedStudentRoute(state())).toBe(true);
  });

  it('keeps verification available while routing pending and rejected students to read-only Impact history', () => {
    expect(resolveMobileDestination(state({ verificationStatus: null }))).toBe('verification');
    expect(resolveMobileDestination(state({ verificationStatus: 'pending' }))).toBe('impact-history');
    expect(resolveMobileDestination(state({ verificationStatus: 'rejected' }))).toBe('impact-history');
    expect(canAccessVerifiedStudentRoute(state({ verificationStatus: 'pending' }))).toBe(false);
  });

  it('keeps non-student roles out of the student shell', () => {
    for (const role of ['partner', 'giver', 'admin'] as const) {
      expect(resolveMobileDestination(state({ role, verificationStatus: null }))).toBe('role-boundary');
      expect(canAccessVerifiedStudentRoute(state({ role, verificationStatus: 'verified' }))).toBe(false);
    }
  });

  it('routes a confirmed Giver to the safe native shell and presents a chooser for additive workspaces', () => {
    expect(resolveMobileDestination(state({ role: 'giver', envelope: { status: 'resolved', workspaces: ['giver'] }, verificationStatus: null }))).toBe('giver');
    expect(resolveMobileDestination(state({ role: 'giver', envelope: { status: 'resolved', workspaces: ['giver', 'organization'] }, verificationStatus: null }))).toBe('workspace-chooser');
    expect(resolveMobileDestination(state({ role: 'giver', envelope: { status: 'resolved', workspaces: ['giver', 'organization'] }, selectedWorkspace: 'giver', verificationStatus: null }))).toBe('giver');
    expect(resolveMobileDestination(state({ role: 'giver', envelope: { status: 'resolved', workspaces: ['giver'] }, selectedWorkspace: 'organization', verificationStatus: null }))).toBe('giver');
  });

  it('falls back to the safe boundary for unavailable or unauthorized workspace reads', () => {
    expect(resolveMobileDestination(state({ role: 'giver', envelope: { status: 'unavailable', workspaces: [] }, verificationStatus: null }))).toBe('role-boundary');
    expect(resolveMobileDestination(state({ role: 'partner', envelope: { status: 'resolved', workspaces: [] }, verificationStatus: null }))).toBe('role-boundary');
  });

  it('fails closed for a missing profile and while a persisted session is resolving', () => {
    expect(resolveMobileDestination(state({ role: null, verificationStatus: null }))).toBe('role-boundary');
    expect(resolveMobileDestination(state({ resolved: false, verificationStatus: null }))).toBe('loading');
    expect(canAccessVerifiedStudentRoute(state({ resolved: false }))).toBe(false);
  });

  it('updates the destination after a foreground verification decision', () => {
    expect(resolveMobileDestination(state({ verificationStatus: 'pending' }))).toBe('impact-history');
    expect(resolveMobileDestination(state({ verificationStatus: 'verified' }))).toBe('student');
  });

  it('resets navigation identity between logout and a different login', () => {
    expect(mobileNavigationKey('verified-user')).not.toBe(mobileNavigationKey(undefined));
    expect(mobileNavigationKey('verified-user')).not.toBe(mobileNavigationKey('unverified-user'));
    expect(resolveMobileDestination(state({ hasSession: false, role: null, verificationStatus: null }))).toBe('login');
    expect(resolveMobileDestination(state({ role: 'student', verificationStatus: null }))).toBe('verification');
  });
});
