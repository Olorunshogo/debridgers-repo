export default {
  displayName: "debridgers-backend-e2e",
  globalSetup: "<rootDir>/src/support/global-setup.ts",
  testEnvironment: "node",
  testMatch: ["**/*.spec.ts"],
  transform: {
    "^.+\\.[tj]s$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.json" }],
  },
  moduleFileExtensions: ["ts", "js", "html"],
  testTimeout: 30000,
};
