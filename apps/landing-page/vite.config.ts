import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { resolve } from "path";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  root: __dirname,
  plugins: [
    tailwindcss(),
    reactRouter(),
    tsconfigPaths({ root: __dirname }),
    {
      name: "silence-chrome-devtools-probe",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === "/.well-known/appspecific/com.chrome.devtools.json") {
            res.writeHead(404).end();
            return;
          }
          next();
        });
      },
    },
  ],
  resolve: {
    alias: {
      "@debridgers/ui-app": resolve(__dirname, "../../packages/ui-app/src"),
      "@debridgers/ui-web": resolve(__dirname, "../../packages/ui-web/src"),
    },
  },
  server: {
    port: 3000,
  },
});
