/*
 * investor, farmer and logistics are reserved, not active roles: no schema,
 * signup config or dashboard exists for them yet. Uncomment as each gets real
 * backend support, matching @debridgers/api-client's types/auth.ts.
 *
 * Careers is a subdomain app, not a role: staffing APIs gate on admin only.
 * applicant / employee power the candidate and hired-staff paths.
 * Offer accept flips applicant → employee.
 */
export type UserRole =
  | "admin"
  | "agent"
  | "buyer"
  | "company"
  | "applicant"
  | "employee";
// | "investor"
// | "farmer"
// | "logistics";

export const USER_ROLES = {
  ADMIN: "admin" as UserRole,
  AGENT: "agent" as UserRole,
  BUYER: "buyer" as UserRole,
  COMPANY: "company" as UserRole,
  APPLICANT: "applicant" as UserRole,
  EMPLOYEE: "employee" as UserRole,
  // INVESTOR: "investor" as UserRole,
  // FARMER: "farmer" as UserRole,
  // LOGISTICS: "logistics" as UserRole,
};
