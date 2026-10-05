export type ImpactParticipationOpportunity = {
  title: string;
  organization: { name: string } | null;
};

export type ImpactParticipation = {
  id: string;
  status: string;
  opportunity_id: string;
  opportunity: ImpactParticipationOpportunity | null;
};

type ImpactParticipationRow = Omit<ImpactParticipation, 'opportunity'> & {
  opportunity?: (ImpactParticipationOpportunity & { organization?: { name: string } | { name: string }[] | null }) | (ImpactParticipationOpportunity & { organization?: { name: string } | { name: string }[] | null })[] | null;
};

export function normalizeImpactParticipation(row: ImpactParticipationRow): ImpactParticipation {
  const candidate = Array.isArray(row.opportunity) ? row.opportunity[0] : row.opportunity;
  const organization = candidate && (Array.isArray(candidate.organization) ? candidate.organization[0] : candidate.organization);
  return {
    id: row.id,
    status: row.status,
    opportunity_id: row.opportunity_id,
    opportunity: candidate?.title ? { title: candidate.title, organization: organization?.name ? { name: organization.name } : null } : null,
  };
}

export function impactParticipationDisplay(participation: ImpactParticipation, unavailableTitle: string, unavailableOrganization: string) {
  return {
    title: participation.opportunity?.title ?? unavailableTitle,
    organizationName: participation.opportunity?.organization?.name ?? unavailableOrganization,
    canOpenOpportunity: participation.opportunity !== null,
  };
}

const activeImpactStatuses = new Set(['joined', 'overdue']);
export function splitImpactParticipations(participations: ImpactParticipation[]) {
  return { active: participations.filter((item) => activeImpactStatuses.has(item.status)), history: participations.filter((item) => !activeImpactStatuses.has(item.status)) };
}

export function canDisputeImpactParticipation(status: string) {
  return ['no_show', 'late_cancelled', 'cancelled_by_organization', 'completed', 'excused'].includes(status);
}

export function impactParticipationFromReadModel(row: ImpactParticipationRead): ImpactParticipation {
  return {
    id: row.participation_id,
    status: row.participation_status,
    opportunity_id: row.opportunity_id,
    opportunity: row.title ? { title: row.title, organization: row.organization_name ? { name: row.organization_name } : null } : null,
  };
}

export function impactOpportunityFromParticipation(row: ImpactParticipationRead): ImpactOpportunity {
  return {
    id: row.opportunity_id,
    organization_id: row.organization_id,
    organization_name: row.organization_name,
    title: row.title,
    description: row.description,
    category: row.category,
    mode: row.mode,
    city: row.city,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    due_at: row.due_at,
    expected_eligible_minutes: row.expected_eligible_minutes,
    capacity: row.capacity,
    remaining_capacity: row.remaining_capacity,
  };
}
import type { ImpactOpportunity, ImpactParticipationRead } from './queries';
