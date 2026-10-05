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
