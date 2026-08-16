import { BadRequestException, PipeTransform } from "@nestjs/common";
import { ZodSchema, ZodError } from "zod";

export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const zErr = result.error as ZodError;
      const issues =
        zErr.issues ??
        (zErr as unknown as { errors: typeof zErr.issues }).errors ??
        [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errors = issues.map((e: any) => ({
        field: Array.isArray(e.path) ? e.path.join(".") : String(e.path ?? ""),
        message: e.message as string,
      }));

      /*
       * Must be an HttpException. GlobalExceptionFilter only reads a status off
       * HttpException; a plain Error fell through to 500, so bad input was
       * indistinguishable from a crash and the field errors never reached the
       * client.
       */
      throw new BadRequestException({ message: "Validation failed", errors });
    }
    return result.data;
  }
}
