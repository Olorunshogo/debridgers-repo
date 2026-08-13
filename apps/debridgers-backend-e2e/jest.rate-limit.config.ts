import base from "./jest.config";

/*
 * Throttling gets its own config because it is the one suite whose assertions
 * depend on exhausting a shared, per-IP budget. Run alongside the others it
 * both fails itself and poisons everything after it, so it runs alone against a
 * backend started with a tight THROTTLE_LIMIT (see the test:rate-limit script).
 */
export default {
  ...base,
  displayName: "debridgers-backend-e2e-rate-limit",
  testPathIgnorePatterns: ["/node_modules/"],
  testMatch: ["**/rate-limit.spec.ts"],
};
