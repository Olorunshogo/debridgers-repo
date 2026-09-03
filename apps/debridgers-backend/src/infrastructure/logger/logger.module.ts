import { Module } from "@nestjs/common";
import { LoggerModule as PinoLoggerModule } from "nestjs-pino";
/*
 * A named import, not a default one.
 *
 * file-stream-rotator marks itself __esModule but exports only { getStream },
 * with no default. TypeScript's esModuleInterop helper therefore passes the
 * module through unwrapped and `.default` is undefined, so a default import
 * compiles cleanly and then throws at runtime.
 *
 * It only ever threw in production, because the rotator is the non-dev branch
 * of the stream below. Every local run took the pino-pretty path instead, so
 * the crash was invisible until the container booted with NODE_ENV=production.
 */
import { getStream } from "file-stream-rotator";
import path from "path";

const isDev = process.env.NODE_ENV !== "production";

/*
 * Where production logs go.
 *
 * Unset, which is the default, means stdout. That is what a container needs:
 * `docker compose logs backend` is how the deploy script reports a failed smoke
 * test, and a process writing to a file inside the container makes that
 * diagnostic empty at precisely the moment it matters. Docker's json-file
 * driver already rotates, configured in deploy/docker-compose.prod.yml, so
 * rotating again in here would be doing the same job twice and losing the logs
 * when the container is replaced.
 *
 * Set LOG_DIR to write rotating files instead, for a deployment that is not a
 * container. The directory must exist and be writable by the running user.
 */
const logDir = process.env.LOG_DIR;

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
        stream:
          isDev || !logDir
            ? undefined
            : getStream({
                filename: path.join(logDir, "app-%DATE%.log"),
                frequency: "daily",
                max_logs: "14d",
                size: "5m",
                audit_file: path.join(logDir, ".audit.json"),
                date_format: "YYYY-MM-DD",
              }),
      },
    }),
  ],
  exports: [PinoLoggerModule],
})
export class LoggerModule {}
