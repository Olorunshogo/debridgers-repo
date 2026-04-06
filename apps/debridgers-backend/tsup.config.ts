import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/main.ts"],
  format: ["cjs"],
  target: "node20",
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: false,
  minify: false,
  esbuildOptions(options) {
    options.keepNames = true;
  },
});
