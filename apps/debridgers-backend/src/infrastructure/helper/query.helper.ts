import { BadRequestException } from "@nestjs/common";

/* Three states, not two: `value === "true"` collapses absent into false and
   silently applies a filter the caller never asked for. */
export function parseOptionalBoolean(
  value: string | undefined,
  paramName: string = "boolean parameter",
): boolean | undefined {
  if (value === undefined || value === "") return undefined;
  if (value === "true") return true;
  if (value === "false") return false;

  throw new BadRequestException(
    `${paramName} must be "true" or "false", received "${value}".`,
  );
}

/* Enum query params were cast with a compile-time-only assertion, so any string
   reached the SQL layer and Postgres raised a 500 on the bad enum value. */
export function parseOptionalEnum<const T extends readonly string[]>(
  value: string | undefined,
  allowed: T,
  paramName: string,
): T[number] | undefined {
  if (value === undefined || value === "") return undefined;
  if ((allowed as readonly string[]).includes(value)) return value as T[number];

  throw new BadRequestException(
    `${paramName} must be one of ${allowed.join(", ")}, received "${value}".`,
  );
}

/* Rejects the inputs that reached SQL unchecked: a negative page became a
   negative OFFSET, and non-numeric input became NaN and dropped the LIMIT. */
export function parsePagination(
  page: string | undefined,
  limit: string | undefined,
  defaultLimit: number = 50,
  maxLimit: number = 100,
): { page: number; limit: number; offset: number } {
  const parsedPage = page === undefined ? 1 : Number(page);
  const parsedLimit = limit === undefined ? defaultLimit : Number(limit);

  if (!Number.isInteger(parsedPage) || parsedPage < 1) {
    throw new BadRequestException(
      `page must be a positive integer, received "${page}".`,
    );
  }

  if (!Number.isInteger(parsedLimit) || parsedLimit < 1) {
    throw new BadRequestException(
      `limit must be a positive integer, received "${limit}".`,
    );
  }

  const safeLimit = Math.min(parsedLimit, maxLimit);

  return {
    page: parsedPage,
    limit: safeLimit,
    offset: (parsedPage - 1) * safeLimit,
  };
}
