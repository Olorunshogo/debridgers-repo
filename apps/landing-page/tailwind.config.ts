import preset from "@debridgers/shared-theme";
import type { Config } from "tailwindcss";

const config: Config = {
  presets: [preset],
  content: ["./app/**/*.{ts,tsx}", "../../packages/ui-web/src/**/*.{ts,tsx}"],
};

export default config;
