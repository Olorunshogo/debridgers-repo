import { readFileSync } from "fs";
import { resolve } from "path";

/*
 * The backend .env carries inline comments after quoted values, e.g.
 * PAYSTACK_SECRET_KEY="sk_test_..."  # sk_test_... for testing
 * A naive `slice(idx + 1).trim().replace(/^"|"$/g, "")` keeps the comment and
 * the closing quote, which handed the spawned server a corrupted Paystack key
 * and made every deposit and every webhook signature fail. Parse the way
 * dotenv does instead: quoted value wins, otherwise cut at the first ` #`.
 */
export function parseEnvValue(rawValue: string): string {
  const value = rawValue.trim();

  const quoted = /^(['"])([\s\S]*?)\1/.exec(value);
  if (quoted) return quoted[2];

  return value.split(/\s+#/)[0].trim();
}

export function backendRootPath(): string {
  return resolve(__dirname, "../../../debridgers-backend");
}

export function readBackendEnv(): Record<string, string> {
  const raw = readFileSync(resolve(backendRootPath(), ".env"), "utf8");
  const env: Record<string, string> = {};

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

    const idx = trimmed.indexOf("=");
    const key = trimmed.slice(0, idx).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;

    env[key] = parseEnvValue(trimmed.slice(idx + 1));
  }

  return env;
}
