/**
 * Base URL for all backend API calls.
 * Set VITE_API_URL in your .env file.
 * Falls back to local dev server.
 */
export const BASE_BACKEND_URL: string =
  (import.meta.env["VITE_API_URL"] as string | undefined) ??
  "http://localhost:4000/api/v1";

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

/** Error shape thrown when a request fails */
export interface ApiError {
  statusCode: number;
  message: string;
  errors?: ApiFieldError[];
}
