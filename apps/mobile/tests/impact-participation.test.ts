import { describe, expect, it } from 'vitest';

import { impactParticipationDisplay, normalizeImpactParticipation } from '@/lib/impact-participation';

const unavailableTitle = 'Opportunity details are unavailable';
const unavailableOrganization = 'Your participation is still recorded.';

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
});
