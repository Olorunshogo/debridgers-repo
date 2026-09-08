/**
 * Base URL for all backend API calls.
 * Set VITE_API_URL in your .env file.
 * Falls back to local dev server.
 */
export const BASE_BACKEND_URL: string =
  (import.meta.env["VITE_API_URL"] as string | undefined) ??
  "http://localhost:4002/api/v1";

/*
 * A shell-exported VITE_API_URL silently overrides the .env file for that
 * mode - that's Vite's own by-design precedence, not a bug here - and the
 * only symptom used to be a failed request with no clue why. Printed once at
 * module load, on both the server render and the client, so the mode and the
 * URL it resolved to are always visible instead of discovered by accident.
 */
console.log(
  `[Debridgers] mode=${import.meta.env.MODE} apiBaseUrl=${BASE_BACKEND_URL}`,
);

/** Standard envelope returned by every backend endpoint */
export interface ApiResponse<T = unknown> {
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
  version: string;
  path: string;
}

/** Validation error shape from the backend */
export interface ApiFieldError {
  field: string;
  message: string;
}

/** Error shape returned by failed API responses */
export interface ApiResponseError {
  statusCode: number;
  message: string;
  errors?: ApiFieldError[];
}
