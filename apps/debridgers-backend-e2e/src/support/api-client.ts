/*
 * Small typed fetch wrapper shared by the payment/wallet/order-lifecycle
 * specs. Response bodies are genuinely unknown at the type level (they cross
 * a network boundary), so this is the one JSON-parse boundary where `unknown`
 * plus a cast at the call site replaces scattered `as any` reads.
 */

export interface ApiResponse<T = unknown> {
  status: number;
  body: T;
}

export async function apiFetch<T = unknown>(
  url: string,
  init?: RequestInit,
): Promise<ApiResponse<T>> {
  const res = await fetch(url, init);
  const body = (await res.json()) as T;
  return { status: res.status, body };
}

export function authHeaders(token: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export const JSON_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
};
