export default {
  displayName: "debridgers-backend-e2e",
  globalSetup: "<rootDir>/src/support/global-setup.ts",
  globalTeardown: "<rootDir>/src/support/global-teardown.ts",
  testEnvironment: "node",
  testMatch: ["**/*.spec.ts"],
  /*
   * Throttling is asserted by its own target, which runs alone against a
   * deliberately tight limit. Leaving it here would exhaust the shared
   * per-IP budget and fail every suite that ran after it.
   */
  testPathIgnorePatterns: ["/node_modules/", "rate-limit.spec.ts"],
  transform: {
    "^.+\\.[tj]s$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.json" }],
  },
  moduleFileExtensions: ["ts", "js", "html"],
  testTimeout: 30000,
  forceExit: true,
};
