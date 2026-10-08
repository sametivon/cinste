import { describe, expect, it } from 'vitest';
import { motionDuration, orientationPhaseContent, selectOrientationJourney, systemMapProgress, systemMapReveal } from '@/lib/orientation-journey';

describe('guided launch journey selection', () => {
  it('selects truthful student stages', () => {
    expect(selectOrientationJourney({ role: 'student', verificationStatus: null }).kind).toBe('student-unverified');
    expect(selectOrientationJourney({ role: 'student', verificationStatus: 'verified' }).steps).toContain('orientation.step.impact');
    expect(selectOrientationJourney({ role: 'student', verificationStatus: 'pending' }).nextKey).toBe('orientation.next.studentPending');
    expect(selectOrientationJourney({ role: 'student', verificationStatus: 'rejected' }).nextKey).toBe('orientation.next.studentRejected');
  });
  it('uses workspace choice and safe role boundaries', () => {
    expect(selectOrientationJourney({ role: 'giver', verificationStatus: null, envelope: { status: 'resolved', workspaces: ['giver', 'organization'] } }).kind).toBe('workspace');
    expect(selectOrientationJourney({ role: 'giver', verificationStatus: null, envelope: { status: 'resolved', workspaces: ['giver'] } }).steps).toEqual(['orientation.step.explore', 'orientation.step.web', 'orientation.step.outcomes']);
    expect(selectOrientationJourney({ role: 'partner', verificationStatus: null, envelope: { status: 'resolved', workspaces: [] } }).kind).toBe('boundary');
  });
  it('makes reduced motion instant without changing content', () => { expect(motionDuration(true, 260)).toBe(0); expect(motionDuration(false, 260)).toBe(260); });
  it('keeps all three phase bodies present after transition completion', () => {
    expect(orientationPhaseContent.map((phase) => phase.titleKey)).toEqual(['orientation.systemTitle', 'orientation.placeTitle', 'orientation.startTitle']);
    expect(orientationPhaseContent.every((phase) => phase.contentKeys.length > 0)).toBe(true);
  });
  it('reveals the system map in Support, Partner, Student, Impact order', () => {
    expect([0, 1, 2].map((index) => systemMapReveal(0.75, index))).toEqual([true, true, true]);
    expect(systemMapReveal(0.75, 3)).toBe(false);
    expect(systemMapReveal(1, 3)).toBe(true);
    expect(systemMapProgress(true, 0)).toBe(1);
  });
});
