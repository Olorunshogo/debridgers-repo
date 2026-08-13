/**
 * Base URL for all backend API calls.
 * Set VITE_API_URL in your .env file.
 * Falls back to local dev server.
 */
export const BASE_BACKEND_URL: string =
  (import.meta.env["VITE_API_URL"] as string | undefined) ??
  "http://localhost:4001/api/v1";

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
