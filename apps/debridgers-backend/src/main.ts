import "reflect-metadata";
// Must be set before libuv initialises — expand thread pool for bcrypt burst.
process.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE ?? "16";
import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./app/app.module";
import { ApiResponseInterceptor } from "./interceptors/api-response.interceptor";
import { GlobalExceptionFilter } from "./filters/http-exception.filter";

/*
 * Delivery proof photos travel as base64 inside the JSON body, which is why the
 * default 100kb ceiling had to move: a single phone photo exceeded it and the
 * whole verification failed with a 413 the admin could not interpret.
 *
 * Sized from what the client actually sends, not from what it accepts. The
 * upload control takes files up to 5MB, but downscales each one to 1600px and
 * steps JPEG quality down until it fits a 1.2MB budget, so eight photos is
 * roughly 10MB of body. The rest is margin for the fallback path, where a
 * browser without canvas encoding sends an original untouched.
 *
 * Sizing it for the raw input instead would mean a 55MB ceiling on every
 * endpoint in the API, which is a great deal of memory to hand an unauthorised
 * caller for the sake of one authenticated admin screen.
 *
 * This whole allowance disappears when proof photos move to object storage:
 * the body then carries URLs and the limit goes back to a default.
 */
const BODY_LIMIT = "20mb";

const ALLOWED_ORIGINS = (
  process.env.ALLOWED_ORIGINS ?? "https://localhost:5173"
)
  .split(",")
  .map((o) => o.trim());

async function bootstrap() {
  Logger.log("🟢 [1] Bootstrap starting...", "Bootstrap");
  const isProd = process.env.NODE_ENV === "production";
  Logger.log(
    `🟢 [2] Environment: ${isProd ? "production" : "development"}`,
    "Bootstrap",
  );

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

  Logger.log("🟢 [3] Env vars validated", "Bootstrap");

  Logger.log("🟢 [4] Creating NestFactory app...", "Bootstrap");
  /*
   * rawBody is needed by the Paystack webhook: the signature is an HMAC over
   * the exact bytes Paystack sent, and re-serialising the parsed body with
   * JSON.stringify only happens to match while key order and escaping survive
   * the round trip.
   */
  /*
   * The default body limit is 100kb, which delivery verification exceeded on a
   * single photo: proof images are posted as base64 data URLs, and base64 adds
   * roughly a third on top of the file size. The upload control accepts several
   * photos at up to 5MB each, so the request needs real headroom or the whole
   * flow fails with a 413 the admin cannot interpret.
   *
   * Sized for the control's own limits rather than picked round: MAX_PHOTOS
   * files at MAX_PHOTO_MB each, encoded, plus a margin for the rest of the body.
   * If either limit changes in photo-upload-field.tsx, change it here too.
   */
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    rawBody: true,
  });
  Logger.log("🟢 [5] App created, setting up middleware...", "Bootstrap");

  /*
   * Deploy runs cloudflared on the host network, forwarding to this
   * container at 127.0.0.1. Without this, every request's req.ip is the
   * tunnel's own loopback connection, not the real caller - which meant the
   * Paystack webhook's IP allowlist in payment.controller.ts could never
   * match a real Paystack call, since it always saw 127.0.0.1 instead.
   *
   * "loopback" trusts only a request whose immediate peer is 127.0.0.1/::1 -
   * exactly cloudflared, nothing further out. An external caller's own TCP
   * connection is never from loopback, so a spoofed X-Forwarded-For header on
   * a direct request is ignored; only the header cloudflared itself sets,
   * carrying Cloudflare's edge-verified client IP, is trusted.
   */
  app.set("trust proxy", "loopback");

  /*
   * Both parsers are raised, not just JSON. Raising one and not the other is
   * the kind of half-fix that looks like it worked until a form post fails.
   *
   * The raw buffer the Paystack webhook verifies its signature against is
   * captured by the same parsers, so it inherits this limit rather than needing
   * its own.
   */
  app.useBodyParser("json", { limit: BODY_LIMIT });
  app.useBodyParser("urlencoded", { limit: BODY_LIMIT, extended: true });

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
    // Added X-Admin-Key for two-tier admin authentication
    allowedHeaders: ["Content-Type", "Authorization", "X-Admin-Key"],
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

  Logger.log("🟢 [6] Middleware setup complete", "Bootstrap");
  const port = process.env.PORT || 4001;

  Logger.log("🟢 [7] Starting server...", "Bootstrap");
  await app.listen(port);
  Logger.log(`✅ Server running on: http://localhost:${port}/api/v1`);
}

bootstrap().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  Logger.error(`❌ Bootstrap failed: ${message}`, stack, "Bootstrap");
  process.exit(1);
});
