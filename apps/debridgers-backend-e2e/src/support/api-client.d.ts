export interface ApiResponse<T = unknown> {
  status: number;
  body: T;
}
export declare function apiFetch<T = unknown>(
  url: string,
  init?: RequestInit,
): Promise<ApiResponse<T>>;
export declare function authHeaders(token: string): Record<string, string>;
export declare const JSON_HEADERS: Record<string, string>;
