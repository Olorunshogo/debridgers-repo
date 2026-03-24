import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  root: __dirname,
  plugins: [tailwindcss(), reactRouter()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./app"),
      "@debridgers/ui-app": resolve(__dirname, "../../packages/ui-app/src"),
      "@debridgers/ui-web": resolve(__dirname, "../../packages/ui-web/src"),
    },
  },
  server: {
    port: 3000,
  },
});
