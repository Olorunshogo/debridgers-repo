import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { resolve } from "path";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  root: __dirname,
  optimizeDeps: {
    include: [
      "framer-motion",
      "framer-motion/dom",
      "@iconify/react",
      "lucide-react",
    ],
  },
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
    dedupe: ["react", "react-dom", "react-router", "react-router/dom"],
    alias: {
      "@debridgers/ui-app": resolve(__dirname, "../../packages/ui-app/src"),
      "@debridgers/ui-web": resolve(__dirname, "../../packages/ui-web/src"),
      "@debridgers/api-client": resolve(
        __dirname,
        "../../packages/api-client/src",
      ),
      "@debridgers/pricing": resolve(__dirname, "../../packages/pricing/dist"),
    },
  },
  server: {
    /*
     * 5173 matches the deployed test backend's ALLOWED_ORIGINS - a different
     * port here means every local request gets CORS-blocked, not the "port in
     * use" a bare mismatch usually looks like. --port still overrides this.
     */
    port: Number(process.env.PORT) || 5173,
  },
});
