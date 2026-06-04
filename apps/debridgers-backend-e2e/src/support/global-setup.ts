import "dotenv/config";
import { spawn, spawnSync, type ChildProcess } from "child_process";
import { resolve } from "path";
import { existsSync } from "fs";

// Use port 4000 (default fallback used by all spec files)
const BACKEND_PORT = 4000;
const BASE_URL = `http://localhost:${BACKEND_PORT}/api/v1`;
const HEALTH_URL = `${BASE_URL}/health`;
const MAX_WAIT_MS = 45_000;
const POLL_INTERVAL_MS = 500;

const backendRoot = resolve(__dirname, "../../../debridgers-backend");
const distMain = resolve(backendRoot, "dist/main.js");

declare global {
  var __BACKEND_PROCESS__: ChildProcess | undefined;
}

async function waitForServer(): Promise<void> {
  const deadline = Date.now() + MAX_WAIT_MS;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(HEALTH_URL);
      if (res.ok) return;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error(`Backend did not start within ${MAX_WAIT_MS / 1000}s`);
}

export default async function globalSetup() {
  process.env.NODE_ENV = "test";
  process.env.VITE_API_URL = BASE_URL;

  // Build if dist doesn't exist
  if (!existsSync(distMain)) {
    console.log("\n🔨 Building backend for e2e tests...");
    const build = spawnSync("pnpm", ["build"], {
      cwd: backendRoot,
      stdio: "inherit",
      shell: true,
    });
    if (build.status !== 0) {
      throw new Error("Backend build failed");
    }
  }

  // Load backend .env so the server gets DB credentials etc.
  const backendEnv = (() => {
    try {
      const fs = require("fs") as typeof import("fs");
      const raw = fs.readFileSync(resolve(backendRoot, ".env"), "utf8");
      const env: Record<string, string> = {};
      for (const line of raw.split("\n")) {
        if (!line.includes("=") || line.startsWith("#")) continue;
        const i = line.indexOf("=");
        env[line.slice(0, i).trim()] = line
          .slice(i + 1)
          .trim()
          .replace(/^"|"$/g, "");
      }
      return env;
    } catch {
      return {};
    }
  })();

  const server = spawn("node", [distMain], {
    env: {
      ...process.env,
      ...backendEnv,
      PORT: String(BACKEND_PORT),
      NODE_ENV: "test",
    },
    stdio: "pipe",
  });

  global.__BACKEND_PROCESS__ = server;

  server.stderr?.on("data", (d: Buffer) => {
    const msg = d.toString();
    if (msg.includes("Error") || msg.includes("error"))
      process.stderr.write(msg);
  });

  try {
    await waitForServer();
    console.log(`✓ Backend ready on port ${BACKEND_PORT}\n`);
  } catch (err) {
    server.kill();
    throw err;
  }
}
