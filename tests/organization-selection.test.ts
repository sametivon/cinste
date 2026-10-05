import { describe, expect, it } from 'vitest';
import { selectAssignedOrganization } from '@/lib/organization-selection';

describe('organization workspace selection', () => {
  const assigned = [{ id: 'organization-a', name: 'Organization A' }, { id: 'organization-b', name: 'Organization B' }];

  it('defaults to the first server-authorized organization', () => {
    expect(selectAssignedOrganization(assigned)).toEqual(assigned[0]);
  });

  it('selects only an organization present in the server-authorized list', () => {
    expect(selectAssignedOrganization(assigned, 'organization-b')).toEqual(assigned[1]);
    expect(selectAssignedOrganization(assigned, 'unassigned-organization')).toEqual(assigned[0]);
  });
});
