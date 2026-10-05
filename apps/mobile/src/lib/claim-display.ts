/**
 * PostgREST returns nullable embedded relations when the linked record is
 * unavailable to the current reader. Claims remain valid history either way.
 */
export function offerFromClaimRelation<TOffer>(campaign: { offers: TOffer | null } | null): TOffer | null {
  return campaign?.offers ?? null;
}
