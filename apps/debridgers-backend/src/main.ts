import "reflect-metadata";
// Must be set before libuv initialises — expand thread pool for bcrypt burst.
process.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE ?? "16";
import { Logger, VersioningType, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
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

  // === Fail fast on missing secrets
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
  /*
   * PAYMENTS_SIMULATED marks orders paid without taking any money, which is
   * what makes checkout testable without Paystack. In production it would mint
   * paid orders for free, so refuse to boot rather than trust a deploy config.
   */
  if (isProd && process.env.PAYMENTS_SIMULATED === "true") {
    Logger.error(
      "PAYMENTS_SIMULATED must not be enabled in production: it marks orders paid with no payment taken",
      "Bootstrap",
    );
    process.exit(1);
  }

  /*
   * A test key in production takes real checkouts to a sandbox that will never
   * settle, and the failure is silent from the buyer's side.
   */
  if (isProd && process.env.PAYSTACK_SECRET_KEY?.startsWith("sk_test_")) {
    Logger.error(
      "PAYSTACK_SECRET_KEY is a test key but NODE_ENV is production",
      "Bootstrap",
    );
    process.exit(1);
  }

  console.log("🟢 [3] Env vars validated");

  console.log("🟢 [4] Creating NestFactory app...");
  /*
   * rawBody is needed by the Paystack webhook: the signature is an HMAC over
   * the exact bytes Paystack sent, and re-serialising the parsed body with
   * JSON.stringify only happens to match while key order and escaping survive
   * the round trip.
   */
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    rawBody: true,
  });
  console.log("🟢 [5] App created, setting up middleware...");

  // === Security headers (Helmet)
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false, // allow Cloudinary images
      contentSecurityPolicy: isProd
        ? {
            directives: {
              defaultSrc: ["'self'"],
              imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
            },
          }
        : false,
    }),
  );

  // === CORS — explicit allowlist, never reflect origin
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Allow server-to-server / curl (no origin) only in non-prod
      if (!origin) return callback(null, !isProd);
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    /*
     * The five static key headers were removed with F7. Nothing reads them any
     * more: authorisation is the JWT plus RolesGuard. Do not re-add a header
     * secret the browser has to carry, since a browser cannot keep one.
     */
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });

  app.setGlobalPrefix("api/v1");

  // SECURITY FIX: Global validation pipe with strict whitelisting
  // Prevents mass assignment attacks by rejecting unknown properties
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remove unknown properties
      forbidNonWhitelisted: true, // Throw error if unknown properties sent
      transform: true, // Auto-transform to DTO class
      transformOptions: {
        enableImplicitConversion: true,
      },
      stopAtFirstError: false, // Report all validation errors at once
      skipMissingProperties: false, // Require all properties per DTO
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ApiResponseInterceptor());

  // === Swagger — dev/staging only
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
      `Swagger UI available at: http://localhost:${process.env.PORT ?? 4001}/api/docs`,
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
