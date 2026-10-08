import { describe, expect, it } from 'vitest';
import { motionDuration, selectOrientationJourney } from '@/lib/orientation-journey';

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
});
