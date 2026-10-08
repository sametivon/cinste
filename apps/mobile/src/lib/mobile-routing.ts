import type { AppRole, VerificationStatus } from '@/lib/types';

export type MobileWorkspace = 'student' | 'giver' | 'partner' | 'organization';
export type MobileDestination = 'loading' | 'login' | 'student' | 'giver' | 'impact-history' | 'verification' | 'workspace-chooser' | 'role-boundary';
export type MobileEntryDestination = MobileDestination | 'orientation';
export type WorkspaceEnvelope = { status: 'resolved' | 'unavailable'; workspaces: MobileWorkspace[] };
export type WorkspaceReadState = { profileRole: AppRole | null; partnerAssignment: boolean; organizationAssignment: boolean; readsAvailable: boolean };
export type WorkspaceResolution = { status: WorkspaceEnvelope['status']; workspaces: MobileWorkspace[] };
export type MobileRouteState = {
  hasSession: boolean;
  resolved: boolean;
  role: AppRole | null;
  verificationStatus: VerificationStatus | null;
  envelope?: WorkspaceEnvelope;
  selectedWorkspace?: MobileWorkspace | null;
};

export type MobileEntryState = MobileRouteState & { orientationComplete: boolean };

export function resolveWorkspaceEnvelope(state: WorkspaceReadState): WorkspaceResolution {
  if (!state.readsAvailable || !state.profileRole) return { status: 'unavailable', workspaces: [] };
  const workspaces: MobileWorkspace[] = [];
  if (state.profileRole === 'student') workspaces.push('student');
  if (state.profileRole === 'giver') workspaces.push('giver');
  if (state.profileRole === 'partner' && state.partnerAssignment) workspaces.push('partner');
  if (state.organizationAssignment) workspaces.push('organization');
  return { status: 'resolved', workspaces };
}

export function isWorkspaceAvailable(envelope: WorkspaceEnvelope | undefined, workspace: MobileWorkspace | null | undefined) {
  return Boolean(envelope?.status === 'resolved' && workspace && envelope.workspaces.includes(workspace));
}

// This is the client-side product boundary. Database RLS and RPCs remain the
// authority for every protected operation.
export function resolveMobileDestination(state: MobileRouteState): MobileDestination {
  if (!state.resolved) return 'loading';
  if (!state.hasSession) return 'login';
  const envelope = state.envelope ?? { status: state.role ? 'resolved' : 'unavailable', workspaces: state.role === 'student' ? ['student'] : [] } as WorkspaceEnvelope;
  if (envelope.status !== 'resolved' || envelope.workspaces.length === 0) return 'role-boundary';
  const workspace = state.selectedWorkspace && envelope.workspaces.includes(state.selectedWorkspace)
    ? state.selectedWorkspace
    : envelope.workspaces.length > 1 ? null : envelope.workspaces[0];
  if (!workspace) return 'workspace-chooser';
  if (workspace === 'giver') return 'giver';
  if (workspace !== 'student') return 'role-boundary';
  if (state.verificationStatus === 'verified') return 'student';
  return state.verificationStatus === 'pending' || state.verificationStatus === 'rejected' ? 'impact-history' : 'verification';
}

export function resolveMobileEntry(state: MobileEntryState): MobileEntryDestination {
  if (!state.resolved) return 'loading';
  if (!state.hasSession) return 'login';
  if (!state.orientationComplete) return 'orientation';
  return resolveMobileDestination(state);
}

export function mobileNavigationKey(userId: string | undefined) {
  return userId ? `mobile-account-${userId}` : 'mobile-guest';
}

export function canAccessVerifiedStudentRoute(state: MobileRouteState) {
  return resolveMobileDestination(state) === 'student';
}
