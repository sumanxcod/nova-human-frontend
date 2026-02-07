import { API_BASE } from "./config";
import { clearToken, getToken } from "./auth";

type RequestOptions = {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
};

function joinUrl(base: string, path: string) {
  const cleanBase = base.replace(/\/+$/, "");
  const cleanPath = path.replace(/^\/+/, "");
  return `${cleanBase}/${cleanPath}`;
}

export async function request(path: string, options: RequestOptions = {}) {
  if (!API_BASE) {
    throw new Error("API base URL is not configured. Set NEXT_PUBLIC_API_BASE_URL.");
  }

  const method = options.method || (options.body !== undefined ? "POST" : "GET");
  const url = joinUrl(API_BASE, path);
  const token = getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
    });
  } catch (err: any) {
    const msg = err?.message?.includes("Failed to fetch")
      ? "Network error: Unable to reach the backend."
      : err?.message || "Network error.";
    throw new Error(msg);
  }

  if (process.env.NODE_ENV !== "production") {
    console.log(`[api] ${method} ${url} -> ${res.status}`);
  }

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      clearToken();
      window.location.href = "/login";
    }
    throw new Error("Session expired. Please log in again.");
  }

  if (!res.ok) {
    try {
      const data = await res.json();
      const detail = data?.detail || data?.message || JSON.stringify(data);
      throw new Error(detail);
    } catch (err: any) {
      if (err instanceof Error) throw err;
      throw new Error(`${res.status} ${res.statusText}`);
    }
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return res.json();
  }
  return res.text();
}

export function apiGet(path: string) {
  return request(path, { method: "GET" });
}

export function apiPost(path: string, body?: any) {
  return request(path, { method: "POST", body: body ?? {} });
}
