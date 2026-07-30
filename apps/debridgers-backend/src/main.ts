import "reflect-metadata";
// Must be set before libuv initialises — expand thread pool for bcrypt burst.
process.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE ?? "16";
import { Logger, VersioningType } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./app/app.module";
import { ApiResponseInterceptor } from "./interceptors/api-response.interceptor";
import { GlobalExceptionFilter } from "./filters/http-exception.filter";

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "http://localhost:5173")
  .split(",")
  .map((o) => o.trim());

async function bootstrap() {
  const isProd = process.env.NODE_ENV === "production";

  // ─── Fail fast on missing secrets ─────────────────────────────────────────
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

  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // ─── Security headers (Helmet) ─────────────────────────────────────────────
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

  // ─── CORS — explicit allowlist, never reflect origin ──────────────────────
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
    credentials: true,
  });

  app.setGlobalPrefix("api");
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: "1",
  });

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

  const port = process.env.PORT || 4000;
  await app.listen(port);

  Logger.log(`Application running on: http://localhost:${port}/api/v1`);
}

bootstrap();
