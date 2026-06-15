import { getToken } from "./auth";

const RAW_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";
export const API_BASE = RAW_BASE.replace(/\/+$/, "") || "http://localhost:8000";

type ApiError = Error & { status?: number; bodyText?: string };

/** Prefer server `error` or `detail` from JSON bodies for user-facing messages. */
export function parseApiErrorMessage(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;
  const e = err as ApiError;
  const raw = (e.bodyText || e.message || "").trim();
  if (!raw) return null;
  try {
    const j = JSON.parse(raw) as Record<string, unknown>;
    if (typeof j.error === "string" && j.error.trim()) return j.error.trim();
    const d = j.detail;
    if (typeof d === "string" && d.trim()) return d.trim();
    if (Array.isArray(d) && d[0] && typeof (d[0] as { msg?: string }).msg === "string") {
      return String((d[0] as { msg: string }).msg).trim();
    }
  } catch {
    /* not JSON */
  }
  return raw.length <= 400 ? raw : null;
}

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
