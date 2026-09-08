import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    passWithNoTests: true,
    /*
     * DB suites create and drop their own Postgres db in a hook.
     * Those run in parallel, so teardown regularly overruns the 10s default.
     */
    hookTimeout: 120000,
  },
});
