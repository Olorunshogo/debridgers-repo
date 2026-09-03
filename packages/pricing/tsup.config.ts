import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  /*
   * Deliberately not cleaning. `clean: true` empties dist before writing it,
   * so anything watching the package during a rebuild sees a window with no
   * output at all and reports the module as missing. Overwriting in place
   * closes that window.
   */
  clean: false,
});
