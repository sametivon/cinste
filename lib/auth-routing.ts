import type { AppRole } from "@/lib/types";

export function accountDestination(role: AppRole | null | undefined) {
  if (role === "admin") return "/admin";
  if (role === "partner") return "/partner";
  if (role === "giver") return "/giver";
  return "/student";
}
