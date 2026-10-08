import type { AppRole, VerificationStatus } from '@/lib/types';
import type { MobileWorkspace, WorkspaceEnvelope } from '@/lib/mobile-routing';

export type JourneyKind = 'student-unverified' | 'student-verified' | 'student-pending' | 'student-rejected' | 'giver' | 'workspace' | 'boundary';
export type JourneyModel = { kind: JourneyKind; roleLabelKey: string; stageKey: string; nextKey: string; ctaKey: string; steps: string[] };

export const orientationPhaseContent = [
  { titleKey: 'orientation.systemTitle', contentKeys: ['orientation.systemCopy', 'orientation.map.accessibility'] },
  { titleKey: 'orientation.placeTitle', contentKeys: ['journey.role', 'journey.stage', 'journey.steps'] },
  { titleKey: 'orientation.startTitle', contentKeys: ['orientation.nextTitle', 'journey.next', 'orientation.ready'] },
] as const;

export function selectOrientationJourney(input: { role: AppRole | null; verificationStatus: VerificationStatus | null; envelope?: WorkspaceEnvelope; selectedWorkspace?: MobileWorkspace | null }): JourneyModel {
  const workspaces = input.envelope?.workspaces ?? [];
  if (workspaces.length > 1 && !input.selectedWorkspace) return { kind: 'workspace', roleLabelKey: 'orientation.role.multi', stageKey: 'orientation.stage.choose', nextKey: 'orientation.next.workspace', ctaKey: 'orientation.cta.workspace', steps: ['orientation.step.choose', 'orientation.step.enter'] };
  if (input.role === 'student') {
    if (input.verificationStatus === 'verified') return { kind: 'student-verified', roleLabelKey: 'orientation.role.student', stageKey: 'orientation.stage.verified', nextKey: 'orientation.next.studentVerified', ctaKey: 'orientation.cta.explore', steps: ['orientation.step.discover', 'orientation.step.claim', 'orientation.step.redeem', 'orientation.step.impact'] };
    if (input.verificationStatus === 'pending') return { kind: 'student-pending', roleLabelKey: 'orientation.role.student', stageKey: 'orientation.stage.pending', nextKey: 'orientation.next.studentPending', ctaKey: 'orientation.cta.history', steps: ['orientation.step.verify', 'orientation.step.history'] };
    if (input.verificationStatus === 'rejected') return { kind: 'student-rejected', roleLabelKey: 'orientation.role.student', stageKey: 'orientation.stage.rejected', nextKey: 'orientation.next.studentRejected', ctaKey: 'orientation.cta.review', steps: ['orientation.step.verify', 'orientation.step.history'] };
    return { kind: 'student-unverified', roleLabelKey: 'orientation.role.student', stageKey: 'orientation.stage.unverified', nextKey: 'orientation.next.studentUnverified', ctaKey: 'orientation.cta.verify', steps: ['orientation.step.verify', 'orientation.step.discover', 'orientation.step.claim', 'orientation.step.redeem'] };
  }
  if (input.role === 'giver') return { kind: 'giver', roleLabelKey: 'orientation.role.giver', stageKey: 'orientation.stage.giver', nextKey: 'orientation.next.giver', ctaKey: 'orientation.cta.offers', steps: ['orientation.step.explore', 'orientation.step.web', 'orientation.step.outcomes'] };
  if (input.role === 'partner' || input.role === 'admin') return { kind: 'boundary', roleLabelKey: `orientation.role.${input.role}`, stageKey: 'orientation.stage.boundary', nextKey: 'orientation.next.boundary', ctaKey: 'orientation.cta.boundary', steps: ['orientation.step.web', 'orientation.step.enter'] };
  return { kind: 'boundary', roleLabelKey: 'orientation.role.unknown', stageKey: 'orientation.stage.boundary', nextKey: 'orientation.next.boundary', ctaKey: 'orientation.cta.boundary', steps: ['orientation.step.enter'] };
}

export function motionDuration(reducedMotion: boolean, normalDuration: number) { return reducedMotion ? 0 : normalDuration; }

export function systemMapReveal(progress: number, index: number) {
  return progress >= (index + 1) / 4;
}

export function systemMapProgress(reducedMotion: boolean, progress: number) {
  return reducedMotion ? 1 : progress;
}
