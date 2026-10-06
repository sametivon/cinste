import { describe, expect, it } from 'vitest';
import { groupOpportunities, isOperatorAction, participationAction } from '@/lib/organization-operator';

const now = new Date('2026-10-06T12:00:00.000Z');
const scheduled = { id: 'scheduled', status: 'published', mode: 'scheduled', starts_at: '2026-10-06T08:00:00.000Z', ends_at: '2026-10-06T10:00:00.000Z', due_at: '2026-10-06T10:00:00.000Z' };
const flexible = { id: 'flexible', status: 'published', mode: 'flexible_remote', starts_at: null, ends_at: null, due_at: '2026-10-08T12:00:00.000Z' };

describe('organization operator presentation rules', () => {
  it('only offers operator resolution after a scheduled opportunity ends', () => {
    expect(participationAction({ id: 'p', opportunity_id: 'scheduled', student_id: 'student', status: 'joined', joined_at: null }, scheduled, now)).toBe('resolve_scheduled');
    expect(participationAction({ id: 'p', opportunity_id: 'scheduled', student_id: 'student', status: 'joined', joined_at: null }, { ...scheduled, ends_at: '2026-10-06T13:00:00.000Z' }, now)).toBe('waiting_for_scheduled_end');
  });
  it('keeps overdue and disputed records in Admin review, without an operator action', () => {
    const overdue = participationAction({ id: 'p', opportunity_id: 'scheduled', student_id: 'student', status: 'overdue', joined_at: null }, scheduled, now);
    const disputed = participationAction({ id: 'p', opportunity_id: 'scheduled', student_id: 'student', status: 'disputed', joined_at: null }, scheduled, now);
    expect(overdue).toBe('admin_review');
    expect(disputed).toBe('admin_review');
    expect(isOperatorAction(overdue)).toBe(false);
    expect(isOperatorAction(disputed)).toBe(false);
  });
  it('groups lifecycle records without inventing a new opportunity status', () => {
    expect(groupOpportunities([{ ...scheduled, status: 'draft' }, flexible, { ...scheduled, id: 'past', due_at: '2026-10-05T12:00:00.000Z' }, { ...scheduled, id: 'cancelled', status: 'cancelled' }], now)).toMatchObject({ drafts: [{ id: 'scheduled' }], current: [{ id: 'flexible' }], past: [{ id: 'past' }], cancelled: [{ id: 'cancelled' }] });
  });
});
