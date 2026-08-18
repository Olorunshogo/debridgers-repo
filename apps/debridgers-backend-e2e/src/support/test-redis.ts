import { createConnection } from "net";

/*
 * The suite's per-user counters (wallet_deposits:<userId>, auth attempts) live
 * in Redis with a 24h TTL, while the test database is truncated on every run
 * and hands out the same user ids again. Sharing Redis db 0 with the developer's
 * own backend therefore made the deposit budget accumulate across runs: after
 * roughly four runs in a day the wallet specs started failing on 429 rather
 * than on logic. The suite gets its own logical db, flushed before each run.
 */
export const TEST_REDIS_DB = 9;

export function resolveTestRedisUrl(devRedisUrl: string): string {
  const url = new URL(devRedisUrl);
  url.pathname = `/${TEST_REDIS_DB}`;
  return url.toString();
}

/* Minimal RESP request so the e2e project needs no redis client dependency. */
function encodeCommand(args: string[]): string {
  return args.reduce(
    (acc, arg) => `${acc}$${Buffer.byteLength(arg)}\r\n${arg}\r\n`,
    `*${args.length}\r\n`,
  );
}

export async function flushTestRedis(redisUrl: string): Promise<void> {
  const url = new URL(redisUrl);
  const db = url.pathname.replace("/", "") || "0";
  const password = url.password || undefined;

  const commands: string[][] = [];
  if (password) commands.push(["AUTH", password]);
  commands.push(["SELECT", db], ["FLUSHDB"], ["QUIT"]);

  await new Promise<void>((resolvePromise, rejectPromise) => {
    const socket = createConnection(
      { host: url.hostname, port: Number(url.port || 6379) },
      () => {
        socket.write(commands.map(encodeCommand).join(""));
      },
    );

    socket.setTimeout(5000);

    let response = "";
    socket.on("data", (chunk: Buffer) => {
      response += chunk.toString();
    });

    socket.on("error", rejectPromise);
    socket.on("timeout", () => {
      socket.destroy();
      rejectPromise(new Error(`Redis flush timed out for ${url.host}`));
    });

    socket.on("close", () => {
      if (response.includes("-ERR") || response.includes("-NOAUTH")) {
        rejectPromise(new Error(`Redis flush failed: ${response.trim()}`));
        return;
      }
      resolvePromise();
    });
  });
}
