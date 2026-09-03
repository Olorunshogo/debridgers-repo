import { Module } from "@nestjs/common";
import { LoggerModule as PinoLoggerModule } from "nestjs-pino";
import path from "path";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let FileStreamRotator: any;
try {
  FileStreamRotator = require("file-stream-rotator");
} catch {
  FileStreamRotator = null;
}

const isDev = process.env.NODE_ENV !== "production";

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
          isDev || !FileStreamRotator
            ? undefined
            : FileStreamRotator.getStream({
                filename: path.join(process.cwd(), "logs", "app-%DATE%.log"),
                frequency: "daily",
                max_logs: "14d",
                size: "5m",
                audit_file: path.join(process.cwd(), "logs", ".audit.json"),
                date_format: "YYYY-MM-DD",
              }),
      },
    }),
  ],
  exports: [PinoLoggerModule],
})
export class LoggerModule {}
