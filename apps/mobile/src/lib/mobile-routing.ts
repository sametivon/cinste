import type { AppRole, VerificationStatus } from '@/lib/types';

export type MobileDestination = 'loading' | 'login' | 'student' | 'impact-history' | 'verification' | 'role-boundary';
export type MobileRouteState = {
  hasSession: boolean;
  resolved: boolean;
  role: AppRole | null;
  verificationStatus: VerificationStatus | null;
};

// This is the client-side product boundary. Database RLS and RPCs remain the
// authority for every protected operation.
export function resolveMobileDestination(state: MobileRouteState): MobileDestination {
  if (!state.resolved) return 'loading';
  if (!state.hasSession) return 'login';
  if (state.role !== 'student') return 'role-boundary';
  if (state.verificationStatus === 'verified') return 'student';
  return state.verificationStatus === 'pending' || state.verificationStatus === 'rejected' ? 'impact-history' : 'verification';
}

export function mobileNavigationKey(userId: string | undefined) {
  return userId ? `mobile-account-${userId}` : 'mobile-guest';
}

export function canAccessVerifiedStudentRoute(state: MobileRouteState) {
  return resolveMobileDestination(state) === 'student';
}
