import type { AppRole } from "@/lib/types";

export type Workspace = "admin" | "partner" | "giver" | "organization" | "student";

export type WorkspaceOption = { workspace: Workspace; href: string; label: string; description: string };

export function accountDestination(role: AppRole | null | undefined) {
  if (role === "admin") return "/admin";
  if (role === "partner") return "/partner";
  if (role === "giver") return "/giver";
  return "/student";
}

const profileWorkspace = (role: AppRole | null | undefined): Workspace => role === "admin" || role === "partner" || role === "giver" ? role : "student";

const details: Record<Workspace, Omit<WorkspaceOption, "workspace">> = {
  admin: { href: "/admin", label: "Admin", description: "Manage CINSTE operations." },
  partner: { href: "/partner", label: "Partner", description: "Scan and redeem CINSTE experiences." },
  giver: { href: "/giver", label: "Give an experience", description: "Fund an experience for a student." },
  organization: { href: "/organization", label: "Organization Operator", description: "Manage your organization’s Impact opportunities." },
  student: { href: "/student", label: "Student app", description: "Continue in the CINSTE mobile app." },
};

export function availableWorkspaces(role: AppRole | null | undefined, hasOrganizationAssignment: boolean): WorkspaceOption[] {
  const workspaces: Workspace[] = [profileWorkspace(role)];
  if (hasOrganizationAssignment) {
    if (workspaces[0] === "student") workspaces.unshift("organization");
    else workspaces.push("organization");
  }

  return workspaces.map((workspace) => ({ workspace, ...details[workspace] }));
}
