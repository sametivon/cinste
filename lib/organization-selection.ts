export type AssignedOrganization = { id: string };

export function selectAssignedOrganization<T extends AssignedOrganization>(organizations: T[], requestedId?: string) {
  return organizations.find((organization) => organization.id === requestedId) ?? organizations[0] ?? null;
}
