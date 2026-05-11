import type { AuthTokens } from "../types/auth";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  buildClearCookieHeaders,
  parseCookie,
} from "../utils/auth-cookies";
import { BASE_BACKEND_URL } from "../utils/api";

/**
 * Store access and refresh tokens as browser cookies.
 * Note: HttpOnly cannot be set via JS - for true HttpOnly protection the server
 * must set these via Set-Cookie response headers. This client-side path is used
 * for SPA flows where SSR headers aren't available.
 */
export function storeTokens(accessToken: string, refreshToken: string): void {
  if (typeof document === "undefined") return;
  // 15 min TTL for access token
  document.cookie = `${ACCESS_TOKEN_COOKIE}=${accessToken}; Path=/; Max-Age=900; SameSite=Strict`;
  // 7 day TTL for refresh token
  document.cookie = `${REFRESH_TOKEN_COOKIE}=${refreshToken}; Path=/; Max-Age=604800; SameSite=Strict`;
}

/** Read the access token from cookies (client-side). */
export function getAccessToken(): string | null {
  if (typeof document === "undefined") return null;
  return parseCookie(document.cookie, ACCESS_TOKEN_COOKIE);
}

/** Read the refresh token from cookies (client-side). */
export function getRefreshToken(): string | null {
  if (typeof document === "undefined") return null;
  return parseCookie(document.cookie, REFRESH_TOKEN_COOKIE);
}

/** Clear both tokens by setting Max-Age=0 cookies. */
export function clearTokens(): void {
  if (typeof document === "undefined") return;
  const headers = buildClearCookieHeaders();
  for (const header of headers) {
    document.cookie = header;
  }
}

/** Call POST /api/v1/auth/logout then clear stored tokens. */
export async function logout(): Promise<void> {
  const accessToken = getAccessToken();
  if (accessToken) {
    try {
      await fetch(`${BASE_BACKEND_URL}/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
    } catch {
      // best-effort - clear tokens even if request fails
    }
  }
  clearTokens();
}

/**
 * Attempt a silent token refresh.
 * Sends the stored refresh token to POST /api/v1/auth/refresh using
 * the `Authorization: Refresh <token>` header.
 * On 401, clears all tokens and throws so the caller can redirect to /login.
 */
export async function refreshTokens(): Promise<AuthTokens> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearTokens();
    throw new Error("No refresh token available");
  }

  const res = await fetch(`${BASE_BACKEND_URL}/auth/refresh`, {
    method: "POST",
    headers: {
      Authorization: `Refresh ${refreshToken}`,
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (res.status === 401) {
    clearTokens();
    throw new Error("Refresh token expired or invalid");
  }

  if (!res.ok) {
    throw new Error(`Token refresh failed with status ${res.status}`);
  }

  const json = await res.json();
  const { accessToken, refreshToken: newRefreshToken } =
    json.data as AuthTokens;

  storeTokens(accessToken, newRefreshToken);
  return { accessToken, refreshToken: newRefreshToken };
}
