/*
 * investor, farmer and logistics are reserved, not active roles: no schema,
 * signup config or dashboard exists for them yet. Uncomment as each gets real
 * backend support, matching @debridgers/api-client's types/auth.ts.
 *
 * hr / hiring_manager remain in the enum for a future hr_admin product
 * surface; staffing APIs currently gate on admin only. applicant / employee
 * power the candidate and hired-staff paths. Offer accept flips applicant → employee.
 */
export type UserRole =
  | "admin"
  | "agent"
  | "buyer"
  | "company"
  | "hr"
  | "hiring_manager"
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
  HR: "hr" as UserRole,
  HIRING_MANAGER: "hiring_manager" as UserRole,
  APPLICANT: "applicant" as UserRole,
  EMPLOYEE: "employee" as UserRole,
  // INVESTOR: "investor" as UserRole,
  // FARMER: "farmer" as UserRole,
  // LOGISTICS: "logistics" as UserRole,
};
