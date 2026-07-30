import { BASE_BACKEND_URL } from "../api";
import { ApiError } from "../apiFetch";

/*
 * Request helper for UNAUTHENTICATED endpoints (login, register, password
 * reset, email verification).
 *
 * Deliberately not built on apiFetch: that attaches a bearer token and, on a
 * 401, attempts a silent refresh and retries. Both are wrong here. A failed
 * login legitimately returns 401 and must surface as an error, not trigger a
 * refresh of a session that does not exist yet.
 *
 * Returns the envelope's `data` and throws ApiError on any non-2xx, matching
 * apiFetch's contract so callers handle both the same way.
 */
export async function publicRequest<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let res: Response;

  try {
    res = await fetch(`${BASE_BACKEND_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
      },
      credentials: "include",
    });
  } catch {
    throw new ApiError(0, "Network error. Please try again.");
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    const message =
      (body as { message?: string } | null)?.message ??
      `Request failed: ${res.status}`;
    throw new ApiError(res.status, message, body);
  }

  return (body as { data: T }).data;
}

/** Convenience wrapper for the common JSON POST case. */
export function publicPost<T = unknown>(
  path: string,
  payload: unknown,
): Promise<T> {
  return publicRequest<T>(path, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
