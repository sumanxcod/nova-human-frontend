import { getToken } from "./auth";

const RAW_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";
export const API_BASE = RAW_BASE.replace(/\/+$/, "") || "http://localhost:8000";

type ApiError = Error & { status?: number; bodyText?: string };

type ApiFetchOptions = RequestInit & {
  auth?: boolean; // default true
};

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const auth = options.auth !== false;

  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  if (auth) {
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(url, { ...options, headers });
  const text = await res.text().catch(() => "");

  if (!res.ok) {
    const err: ApiError = new Error(text || res.statusText);
    err.status = res.status;
    err.bodyText = text;
    throw err;
  }

  const trimmed = text.trim();
  if (!trimmed) return {} as T;

  // Parse JSON bodies even when Content-Type omits application/json (common with proxies).
  const first = trimmed[0];
  if (first !== "{" && first !== "[") {
    return undefined as T;
  }

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const err: ApiError = new Error(
      trimmed.length > 200 ? `${trimmed.slice(0, 200)}…` : trimmed || "Invalid JSON response"
    );
    err.status = res.status;
    err.bodyText = text;
    throw err;
  }
}

export function apiGet<T>(path: string) {
  return apiFetch<T>(path, { method: "GET" });
}

export function apiPost<T>(path: string, body?: any, opts?: ApiFetchOptions) {
  return apiFetch<T>(path, {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
    ...opts,
  });
}
