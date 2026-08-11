import "reflect-metadata";
// Must be set before libuv initialises — expand thread pool for bcrypt burst.
process.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE ?? "16";
import { Logger, VersioningType } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import * as express from "express";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import { spawnSync } from "child_process";
import { AppModule } from "./app/app.module";
import { ApiResponseInterceptor } from "./interceptors/api-response.interceptor";
import { GlobalExceptionFilter } from "./filters/http-exception.filter";

const ALLOWED_ORIGINS = (
  process.env.ALLOWED_ORIGINS ?? "https://localhost:5173"
)
  .split(",")
  .map((o) => o.trim());

function generateSelfSignedCert(
  certPath: string,
  keyPath: string,
): { cert: Buffer; key: Buffer } {
  const certDir = path.dirname(certPath);

  // Create directory if it doesn't exist
  if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir, { recursive: true });
  }

  // Check if certs already exist
  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    console.log("✅ Using existing certificates");
    return {
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath),
    };
  }

  console.log("🔧 Generating self-signed certificate...");
  const result = spawnSync("openssl", [
    "req",
    "-x509",
    "-newkey",
    "rsa:2048",
    "-keyout",
    keyPath,
    "-out",
    certPath,
    "-days",
    "365",
    "-nodes",
    "-subj",
    "/CN=localhost/O=Debridgers/C=NG",
  ]);

  if (result.error) {
    throw new Error(`Failed to generate certificate: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(
      `OpenSSL error: ${result.stderr?.toString() || "Unknown error"}`,
    );
  }

  console.log("✅ Self-signed certificate generated");
  return {
    cert: fs.readFileSync(certPath),
    key: fs.readFileSync(keyPath),
  };
}
async function bootstrap() {
  console.log("🟢 [1] Bootstrap starting...");
  const isProd = process.env.NODE_ENV === "production";
  console.log("🟢 [2] Environment:", isProd ? "production" : "development");

  const requiredEnv = [
    "ACCESS_TOKEN_SECRET",
    "REFRESH_TOKEN_SECRET",
    "DATABASE_URL",
  ];
  for (const key of requiredEnv) {
    if (!process.env[key]) {
      Logger.error(`Missing required env var: ${key}`, "Bootstrap");
      process.exit(1);
    }
  }
  console.log("🟢 [3] Env vars validated");

  console.log("🟢 [4] Creating NestFactory app...");
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  console.log("🟢 [5] App created, setting up middleware...");

  // ─── Body parsing — MUST be before CORS ─────────────────────────────────
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  // ─── CORS ──────────────────────────────────────────────────────────────
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) return callback(null, !isProd);
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Request-Key",
      "X-Payment-Key",
      "X-Payment-Key-2",
      "X-Admin-Key-1",
      "X-Admin-Key-2",
    ],
    credentials: true,
  });

  app.setGlobalPrefix("api/v1");

  // Zod schemas provide validation and whitelisting via ZodValidationPipe on each route
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ApiResponseInterceptor());

  // ─── Swagger — dev/staging only ───────────────────────────────────────────
  if (!isProd) {
    const config = new DocumentBuilder()
      .setTitle("Debridgers API")
      .setDescription(
        "Farm-to-door commodity delivery platform: agent, admin, auth, and buyer endpoints",
      )
      .setVersion("1.0")
      .addBearerAuth(
        { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        "access-token",
      )
      .addApiKey(
        {
          type: "apiKey",
          name: "Authorization",
          in: "header",
          description: "Enter: Refresh <token>",
        },
        "refresh-token",
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api/docs", app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
    Logger.log(
      `Swagger UI available at: http://localhost:${process.env.PORT ?? 4000}/api/docs`,
    );
  }

  console.log("🟢 [6] Middleware setup complete");
  const port = process.env.PORT || 4001;

  console.log("🟢 [7] Starting server...");
  await app.listen(port);
  Logger.log(`✅ Server running on: http://localhost:${port}/api/v1`);
}

bootstrap().catch((err) => {
  console.error("❌ Bootstrap failed:", err);
  process.exit(1);
});
