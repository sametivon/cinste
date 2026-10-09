import { describe, expect, it } from "vitest";
import { accountDestination, availableWorkspaces, logoDestination, parseAuthIntent, postAuthDestination, publicRoleDestinations, safeAuthReturnTo, webAuthConfirmationUrl } from "@/lib/auth-routing";

describe("authenticated account routing", () => {
  it("builds fixed web confirmation callbacks", () => {
    expect(webAuthConfirmationUrl('/student')).toBe('http://localhost:3000/auth/callback?next=%2Fstudent');
    expect(webAuthConfirmationUrl('/giver')).toBe('http://localhost:3000/auth/callback?next=%2Fgiver');
  });
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
    expect(availableWorkspaces("partner", true).map((workspace) => workspace.href)).toEqual(["/partner", "/organization"]);
    expect(availableWorkspaces("admin", true).map((workspace) => workspace.href)).toEqual(["/admin", "/organization"]);
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

  it("sends public Student and Giver journeys through the role explainer without exposing protected workspaces", () => {
    expect(publicRoleDestinations.student).toBe('/onboarding?role=student');
    expect(publicRoleDestinations.giver).toBe('/onboarding?role=giver');
    expect(Object.values(publicRoleDestinations)).not.toContain('/partner');
    expect(Object.values(publicRoleDestinations)).not.toContain('/organization');
  });

  it("keeps only supported acquisition intent", () => {
    expect(parseAuthIntent('giver')).toBe('giver');
    expect(parseAuthIntent('student')).toBe('student');
    expect(parseAuthIntent('partner')).toBeUndefined();
  });

  it("accepts only exact allowlisted internal auth return paths", () => {
    expect(safeAuthReturnTo('/giver')).toBe('/giver');
    expect(safeAuthReturnTo('/student')).toBe('/student');
    expect(safeAuthReturnTo('/account')).toBe('/account');
    expect(safeAuthReturnTo('https://evil.example/giver')).toBeUndefined();
    expect(safeAuthReturnTo('//evil.example/giver')).toBeUndefined();
    expect(safeAuthReturnTo('/partner')).toBeUndefined();
    expect(safeAuthReturnTo('/%2f%2fevil.example')).toBeUndefined();
    expect(safeAuthReturnTo('/giver%3fnext=https://evil.example')).toBeUndefined();
  });

  it("preserves matching Giver context without letting intent rewrite existing roles", () => {
    expect(postAuthDestination('giver', false, 'giver', '/giver')).toBe('/giver');
    expect(postAuthDestination('student', false, 'giver', '/giver')).toBe('/student');
    expect(postAuthDestination('partner', false, 'giver', '/giver')).toBe('/partner');
    expect(postAuthDestination('student', false, 'student', '/student')).toBe('/student');
  });

  it("keeps existing multi-workspace resolution authoritative after auth", () => {
    expect(postAuthDestination('giver', true, undefined, undefined)).toBe('/account');
    expect(postAuthDestination('giver', true, 'giver', '/giver')).toBe('/account');
    expect(postAuthDestination('student', true, 'giver', '/giver')).toBe('/account');
  });
});
