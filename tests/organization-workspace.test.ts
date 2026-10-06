import { describe, expect, it } from 'vitest';

import { activeOrganizationWorkspaces } from '@/lib/organization-workspace';

const organizationQuery = (rows: unknown[]) => ({ select: () => ({ order: async () => ({ data: rows, error: null }) }) });
const assignmentQuery = (rows: unknown[]) => ({ select: () => ({ eq: async () => ({ data: rows, error: null }) }) });

describe('organization workspace authorization lookup', () => {
  it('uses only active direct assignments for an Admin, not broad Admin organization visibility', async () => {
    const db = { from: () => assignmentQuery([{ organizations: { id: 'active', name: 'Active organization', status: 'active' } }, { organizations: { id: 'suspended', name: 'Suspended organization', status: 'suspended' } }]) };

    await expect(activeOrganizationWorkspaces(db, 'admin-user', 'admin')).resolves.toEqual([{ id: 'active', name: 'Active organization', status: 'active' }]);
  });

  it('keeps an unassigned Admin out of the Organization workspace', async () => {
    const db = { from: () => assignmentQuery([]) };

    await expect(activeOrganizationWorkspaces(db, 'admin-user', 'admin')).resolves.toEqual([]);
  });

  it('uses the existing RLS-scoped organization read for a non-Admin operator', async () => {
    const db = { from: () => organizationQuery([{ id: 'assigned', name: 'Assigned organization', status: 'active' }]) };

    await expect(activeOrganizationWorkspaces(db, 'operator-user', 'student')).resolves.toEqual([{ id: 'assigned', name: 'Assigned organization', status: 'active' }]);
  });
});
