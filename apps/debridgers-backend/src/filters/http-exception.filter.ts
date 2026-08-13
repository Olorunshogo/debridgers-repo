import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const isProd = process.env.NODE_ENV === "production";

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Internal server error";
    let errors: unknown = undefined;
    let code: string | undefined = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === "string") {
        message = body;
      } else if (typeof body === "object" && body !== null) {
        const b = body as Record<string, unknown>;
        message = (b.message as string) ?? message;
        if (b.errors) errors = b.errors;
        /*
         * Forwarded explicitly rather than by spreading the body: callers branch
         * on this (UNVERIFIED_EMAIL routes to the OTP screen), and an allow-list
         * keeps an exception's internals from reaching the client by accident.
         */
        if (typeof b.code === "string") code = b.code;
      }
    } else if (exception instanceof Error) {
      // Log the real error server-side but never expose stack to clients
      const err = exception as Error & {
        code?: string;
        detail?: string;
        constraint?: string;
      };
      this.logger.error(
        `Unhandled: ${exception.message}`,
        isProd ? undefined : exception.stack,
      );

      // Log PostgreSQL errors with constraint details
      if (err.code || err.detail) {
        this.logger.error(
          `[DB Error] Code: ${err.code}, Detail: ${err.detail}, Constraint: ${err.constraint}`,
        );
      }
    }

    const payload: Record<string, unknown> = {
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: req.url,
    };
    if (errors !== undefined) payload.errors = errors;
    if (code !== undefined) payload.code = code;

    res.status(status).json(payload);
  }
}
