import { redirect } from "next/navigation";
import { accountDestination } from "@/lib/auth-routing";
import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/types";

export default async function Account() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
  redirect(accountDestination(profile?.role as AppRole | undefined));
}
