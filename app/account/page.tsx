import { redirect } from "next/navigation";
import Link from "next/link";
import { availableWorkspaces } from "@/lib/auth-routing";
import { activeOrganizationWorkspaces } from "@/lib/organization-workspace";
import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/types";

export default async function Account() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = profile?.role as AppRole | undefined;
  const organizations = await activeOrganizationWorkspaces(db, user.id, role);
  const workspaces = availableWorkspaces(role, organizations.length > 0);

  if (workspaces.length === 1) redirect(workspaces[0].href);

  return <main className="shell max-w-xl py-12"><span className="tag">CINSTE</span><h1 className="mt-4 text-4xl font-black">Choose your workspace</h1><p className="mt-3 text-stone-600">This account can access more than one CINSTE surface.</p><div className="mt-6 grid gap-3">{workspaces.map((workspace) => <Link className="card block transition hover:border-coral" href={workspace.href} key={workspace.workspace}><h2 className="text-xl font-black">{workspace.label}</h2><p className="mt-2 text-stone-600">{workspace.description}</p></Link>)}</div></main>;
}
