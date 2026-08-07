import { BASE_BACKEND_URL } from "./api";
import { getAccessToken, refreshTokens, clearTokens } from "./auth";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown,
  ) {
    super(message);
  }
}

/**
 * Authenticated fetch with automatic token refresh.
 * Throws ApiError on non-2xx responses.
 * On 401, attempts one silent refresh then retries.
 * On second 401, clears tokens and throws - caller should redirect to /login.
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAccessToken();
  const requestKey = import.meta.env.VITE_REQUEST_KEY;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (requestKey) headers["X-Request-Key"] = requestKey;

  const url = `${BASE_BACKEND_URL}${path}`;
  let res = await fetch(url, { ...options, headers, credentials: "include" });

  if (res.status === 401) {
    try {
      const { accessToken } = await refreshTokens();
      headers["Authorization"] = `Bearer ${accessToken}`;
      res = await fetch(url, { ...options, headers, credentials: "include" });
    } catch {
      clearTokens();
      throw new ApiError(401, "Session expired. Please log in again.");
    }
  }

  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    const msg =
      (body as { message?: string })?.message ??
      `Request failed: ${res.status}`;
    throw new ApiError(res.status, msg, body);
  }

  const json = await res.json();
  return (json as { data: T }).data;
}
