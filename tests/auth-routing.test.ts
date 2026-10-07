import { describe, expect, it } from "vitest";
import { accountDestination, availableWorkspaces, logoDestination } from "@/lib/auth-routing";

describe("authenticated account routing", () => {
  it("routes every CINSTE role to its protected workspace", () => {
    expect(accountDestination("student")).toBe("/student");
    expect(accountDestination("giver")).toBe("/giver");
    expect(accountDestination("partner")).toBe("/partner");
    expect(accountDestination("admin")).toBe("/admin");
  });
  it("uses student onboarding/account as the safe fallback", () => {
    expect(accountDestination(undefined)).toBe("/student");
  });

  it("adds the organization workspace without mutating the profile role", () => {
    expect(availableWorkspaces("giver", true).map((workspace) => workspace.href)).toEqual(["/giver", "/organization"]);
    expect(availableWorkspaces("student", true).map((workspace) => workspace.href)).toEqual(["/organization", "/student"]);
  });

  it("keeps one direct destination for accounts without an active organization assignment", () => {
    expect(availableWorkspaces("admin", false)).toHaveLength(1);
    expect(availableWorkspaces("partner", false)[0].href).toBe("/partner");
    expect(availableWorkspaces("giver", false)[0].href).toBe("/giver");
    expect(availableWorkspaces("student", false)[0].href).toBe("/student");
  });

  it("keeps the logo in the correct authenticated workspace", () => {
    expect(logoDestination(false, undefined, false)).toBe("/");
    expect(logoDestination(true, "giver", false)).toBe("/giver");
    expect(logoDestination(true, "partner", false)).toBe("/partner");
    expect(logoDestination(true, "admin", false)).toBe("/admin");
    expect(logoDestination(true, "student", false)).toBe("/student");
  });

  it("sends an assignment-aware multi-workspace account to its existing chooser", () => {
    expect(logoDestination(true, "student", true)).toBe("/account");
    expect(logoDestination(true, "giver", true)).toBe("/account");
  });
});
