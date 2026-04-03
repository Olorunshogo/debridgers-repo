import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import { VersioningType } from "@nestjs/common";
import express, { Request, Response } from "express";
import { AppModule } from "../apps/debridgers-backend/src/app/app.module";
import { ApiResponseInterceptor } from "../apps/debridgers-backend/src/interceptors/api-response.interceptor";

const server = express();
let isInitialized = false;

async function bootstrap() {
  if (isInitialized) return server;

  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    bufferLogs: true,
  });

  app.enableCors({
    origin: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    credentials: true,
  });

  app.setGlobalPrefix("api");
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });
  app.useGlobalInterceptors(new ApiResponseInterceptor());

  await app.init();
  isInitialized = true;
  return server;
}

export default async function handler(req: Request, res: Response) {
  const app = await bootstrap();
  app(req, res);
}
