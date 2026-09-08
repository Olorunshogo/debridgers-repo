import { Module } from "@nestjs/common";
import { LoggerModule as PinoLoggerModule } from "nestjs-pino";
import path from "path";
import { createRequire } from "module";

const isDev = process.env.NODE_ENV !== "production";

/*
 * Where production logs go.
 *
 * Unset (the default) means stdout. That is what a container needs:
 * `docker compose logs` is how deploy reports a failed smoke test, and Docker's
 * json-file driver already rotates. Set LOG_DIR only for non-container hosts.
 */
const logDir = process.env.LOG_DIR;

/*
 * Resolve getStream via createRequire, not `import` / `import … from`.
 *
 * file-stream-rotator sets __esModule but has no default export. With
 * esModuleInterop, both `import X from "…"` and some Nest emit paths compile
 * to `.default.getStream`, which is undefined at runtime and crash-loops the
 * container (TypeError on boot). createRequire returns the CJS export shape
 * directly: `{ getStream }`.
 */
function rotatingFileStream(dir: string) {
  const requireRotator = createRequire(__filename);
  const { getStream } = requireRotator("file-stream-rotator") as {
    getStream: (options: Record<string, string>) => NodeJS.WritableStream;
  };
  return getStream({
    filename: path.join(dir, "app-%DATE%.log"),
    frequency: "daily",
    max_logs: "14d",
    size: "5m",
    audit_file: path.join(dir, ".audit.json"),
    date_format: "YYYY-MM-DD",
  });
}

@Module({
  imports: [
    PinoLoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || "info",
        redact: ["req.headers.authorization", "req.headers.cookie"],
        transport: isDev
          ? {
              target: "pino-pretty",
              options: { colorize: true, singleLine: false },
            }
          : undefined,
        stream: isDev || !logDir ? undefined : rotatingFileStream(logDir),
      },
    }),
  ],
  exports: [PinoLoggerModule],
})
export class LoggerModule {}
