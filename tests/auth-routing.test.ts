import { describe, expect, it } from "vitest";
import { accountDestination } from "@/lib/auth-routing";

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
});
