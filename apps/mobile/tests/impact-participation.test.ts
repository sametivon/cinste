import { describe, expect, it } from 'vitest';

import { canDisputeImpactParticipation, impactOpportunityFromParticipation, impactParticipationDisplay, impactParticipationFromReadModel, normalizeImpactParticipation, splitImpactParticipations } from '@/lib/impact-participation';

const unavailableTitle = 'Opportunity details are unavailable';
const unavailableOrganization = 'Your participation is still recorded.';
const ownParticipationRead = {
  participation_id: 'participation-own', participation_status: 'joined', opportunity_id: 'opportunity-own', organization_id: 'organization-own', organization_name: 'Helping Hands', title: 'Food distribution', description: 'Support a local distribution.', activity_details: 'Sort food parcels.', requirements: null, organization_provides: 'A coordinator and workspace.', coordinator_name: 'Ana', coordinator_contact: 'ana@example.invalid', accessibility_information: null, participant_contact_fields: [], category: 'community', mode: 'flexible_remote' as const, city: 'București', starts_at: null, ends_at: null, due_at: '2026-10-12T10:00:00Z', expected_eligible_minutes: 60, capacity: 5, remaining_capacity: 4,
};

describe('Impact participation presentation', () => {
  it('keeps a populated participation navigable with its opportunity details', () => {
    const participation = normalizeImpactParticipation({
      id: 'participation-1', status: 'joined', opportunity_id: 'opportunity-1',
      opportunity: { title: 'Community garden', organization: { name: 'Green Team' } },
    });

    expect(impactParticipationDisplay(participation, unavailableTitle, unavailableOrganization)).toEqual({
      title: 'Community garden', organizationName: 'Green Team', canOpenOpportunity: true,
    });
  });

  it('preserves a null-relation participation without rendering through a missing opportunity', () => {
    const participation = normalizeImpactParticipation({ id: 'participation-2', status: 'completed', opportunity_id: 'opportunity-2', opportunity: null });
    const display = impactParticipationDisplay(participation, unavailableTitle, unavailableOrganization);

    expect(participation).toMatchObject({ id: 'participation-2', status: 'completed', opportunity_id: 'opportunity-2', opportunity: null });
    expect(display).toEqual({ title: unavailableTitle, organizationName: unavailableOrganization, canOpenOpportunity: false });
  });

  it('handles a join refresh before and after the nested opportunity relation is available', () => {
    const immediatelyAfterJoin = normalizeImpactParticipation({ id: 'participation-3', status: 'joined', opportunity_id: 'opportunity-3', opportunity: null });
    const refreshed = normalizeImpactParticipation({
      id: 'participation-3', status: 'joined', opportunity_id: 'opportunity-3',
      opportunity: { title: 'Food distribution', organization: { name: 'Helping Hands' } },
    });

    expect(impactParticipationDisplay(immediatelyAfterJoin, unavailableTitle, unavailableOrganization).canOpenOpportunity).toBe(false);
    expect(impactParticipationDisplay(refreshed, unavailableTitle, unavailableOrganization)).toMatchObject({ title: 'Food distribution', canOpenOpportunity: true });
  });

  it('uses the self-scoped participation projection for joined and historical opportunity context', () => {
    const joined = impactParticipationFromReadModel(ownParticipationRead);
    const historical = impactParticipationFromReadModel({ ...ownParticipationRead, participation_id: 'participation-history', participation_status: 'completed' });

    expect(impactParticipationDisplay(joined, unavailableTitle, unavailableOrganization)).toMatchObject({ title: 'Food distribution', canOpenOpportunity: true });
    expect(historical).toMatchObject({ id: 'participation-history', status: 'completed', opportunity: { organization: { name: 'Helping Hands' } } });
    expect(impactOpportunityFromParticipation(ownParticipationRead)).toMatchObject({ id: 'opportunity-own', title: 'Food distribution', remaining_capacity: 4 });
  });

  it('separates active work from every supported historical outcome', () => {
    const statuses = ['joined', 'overdue', 'completed', 'cancelled', 'late_cancelled', 'no_show', 'excused', 'cancelled_by_organization', 'expired_incomplete', 'disputed'];
    const items = statuses.map((status) => ({ id: status, status, opportunity_id: status, opportunity: null }));
    const { active, history } = splitImpactParticipations(items);
    expect(active.map((item) => item.status)).toEqual(['joined', 'overdue']);
    expect(history.map((item) => item.status)).toEqual(['completed', 'cancelled', 'late_cancelled', 'no_show', 'excused', 'cancelled_by_organization', 'expired_incomplete', 'disputed']);
  });

  it('only offers disputes for statuses accepted by the existing trusted RPC', () => {
    expect(['no_show', 'late_cancelled', 'cancelled_by_organization', 'completed', 'excused'].every(canDisputeImpactParticipation)).toBe(true);
    expect(['joined', 'overdue', 'cancelled', 'expired_incomplete', 'disputed'].some(canDisputeImpactParticipation)).toBe(false);
  });

});
