import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { Request } from "express";

export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
  version: string;
  path: string;
}

@Injectable()
export class ApiResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const req = context.switchToHttp().getRequest<Request>();
    const statusCode = context.switchToHttp().getResponse().statusCode;

    return next.handle().pipe(
      map((data) => {
        const payload = data as { message?: string; data?: T } | T;
        const isWrapped =
          payload !== null &&
          typeof payload === "object" &&
          "message" in (payload as object) &&
          "data" in (payload as object);

        return {
          statusCode,
          message: isWrapped
            ? (payload as { message: string }).message
            : "Success",
          data: isWrapped ? (payload as { data: T }).data : (payload as T),
          timestamp: new Date().toISOString(),
          version: "v1",
          path: req.url,
        };
      }),
    );
  }
}
