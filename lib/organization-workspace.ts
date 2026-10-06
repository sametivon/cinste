import type { AppRole } from '@/lib/types';

export type OrganizationWorkspace = { id: string; name: string; status: string };

export async function activeOrganizationWorkspaces(db: any, userId: string, role: AppRole | undefined): Promise<OrganizationWorkspace[]> {
  if (role !== 'admin') {
    const { data, error } = await db.from('organizations').select('id,name,status').order('name');
    return error ? [] : data ?? [];
  }

  const { data, error } = await db.from('organization_users').select('organization_id,organizations(id,name,status)').eq('user_id', userId);
  if (error) return [];

  return (data ?? []).flatMap((assignment: any) => {
    const organization = Array.isArray(assignment.organizations) ? assignment.organizations[0] : assignment.organizations;
    return organization?.status === 'active' ? [organization] : [];
  });
}
