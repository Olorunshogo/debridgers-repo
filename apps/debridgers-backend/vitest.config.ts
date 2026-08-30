import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    passWithNoTests: true,
    /*
     * Every database-backed suite creates and drops its own Postgres database
     * in a hook. Those run in parallel across suites, so teardown regularly
     * overruns the 10s default and fails a suite whose tests all passed.
     */
    hookTimeout: 120000,
  },
});
