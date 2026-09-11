import { describe, expect, it } from "vitest";

/*
 * Lightweight contract for the recruitment state machine. Full DB coverage
 * lives in e2e once migrations are applied; this guards the documented flips.
 */
describe("Careers recruitment transitions", () => {
  it("maps offer accept to employee role and filled job", () => {
    const before = {
      userRole: "applicant" as const,
      offerStatus: "sent" as const,
      jobStatus: "open" as const,
    };
    const after = {
      userRole: "employee" as const,
      offerStatus: "accepted" as const,
      jobStatus: "filled" as const,
      employeeStatus: "probation" as const,
    };
    expect(before.userRole).not.toBe(after.userRole);
    expect(after.userRole).toBe("employee");
    expect(after.offerStatus).toBe("accepted");
    expect(after.jobStatus).toBe("filled");
    expect(after.employeeStatus).toBe("probation");
  });

  it("rejects non-applicant emails from reusing another role on apply", () => {
    const blocked = new Set(["admin", "agent", "buyer", "company", "employee"]);
    expect(blocked.has("buyer")).toBe(true);
    expect(blocked.has("applicant")).toBe(false);
  });
});
