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

/*
 * Sorting, without a column name ever reaching SQL.
 *
 * Each endpoint declares its own map of a public sort key to the Drizzle column
 * it sorts by, so adding a sortable column is one entry in that map rather than
 * a new branch here. An unknown key is a 400, not a 500 from Postgres, and a
 * client cannot sort by a column the endpoint never meant to expose.
 */
export type SortDirection = "asc" | "desc";

export interface ParsedSort<TColumn> {
  column: TColumn;
  direction: SortDirection;
  /** The public key that was applied, echoed back so the client can reflect it. */
  key: string;
}

export function parseSort<TMap extends Record<string, unknown>>(
  sort: string | undefined,
  order: string | undefined,
  allowed: TMap,
  fallbackKey: keyof TMap & string,
  fallbackDirection: SortDirection = "desc",
): ParsedSort<TMap[keyof TMap]> {
  const keys = Object.keys(allowed);

  let key: string = fallbackKey;
  if (sort !== undefined && sort !== "") {
    if (!keys.includes(sort)) {
      throw new BadRequestException(
        `sort must be one of ${keys.join(", ")}, received "${sort}".`,
      );
    }
    key = sort;
  }

  let direction: SortDirection = fallbackDirection;
  if (order !== undefined && order !== "") {
    if (order !== "asc" && order !== "desc") {
      throw new BadRequestException(
        `order must be "asc" or "desc", received "${order}".`,
      );
    }
    direction = order;
  }

  return { column: allowed[key] as TMap[keyof TMap], direction, key };
}
