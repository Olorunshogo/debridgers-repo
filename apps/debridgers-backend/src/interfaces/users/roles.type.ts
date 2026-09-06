/*
 * investor, farmer and logistics are reserved, not active roles: no schema,
 * signup config or dashboard exists for them yet. Uncomment as each gets real
 * backend support, matching @debridgers/api-client's types/auth.ts.
 */
export type UserRole = "admin" | "agent" | "buyer" | "company";
// | "investor"
// | "farmer"
// | "logistics";

export const USER_ROLES = {
  ADMIN: "admin" as UserRole,
  AGENT: "agent" as UserRole,
  BUYER: "buyer" as UserRole,
  COMPANY: "company" as UserRole,
  // INVESTOR: "investor" as UserRole,
  // FARMER: "farmer" as UserRole,
  // LOGISTICS: "logistics" as UserRole,
};
