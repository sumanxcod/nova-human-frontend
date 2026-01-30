// lib/api.ts
const RAW_API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
export const API_BASE = RAW_API_BASE.replace(/\/+$/, "");


// Build a clean URL no matter if path has / or not
function url(path: string) {
  if (!path.startsWith("/")) path = "/" + path;
  return `${API_BASE}${path}`;
}

// Read response safely (json OR text)
async function readBody(res: Response) {
  const contentType = res.headers.get("content-type") || "";
  const text = await res.text();

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch {
      // fall through
    }
  }
  return text;
}

async function request<T>(
  method: "GET" | "POST",
  path: string,
  body?: any,
  timeoutMs = 20000
): Promise<T> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const init: RequestInit = {
      method,
      signal: controller.signal,
      // IMPORTANT:
      // - do NOT send Content-Type on GET (avoids CORS preflight)
      // - do NOT use credentials unless you truly need cookies
      headers:
        method === "POST"
          ? { "Content-Type": "application/json", Accept: "application/json" }
          : { Accept: "application/json" },
      body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
    };

    const res = await fetch(url(path), init);
    const payload = await readBody(res);

    if (!res.ok) {
      const msg =
        typeof payload === "string"
          ? payload
          : payload?.detail || payload?.message || JSON.stringify(payload);

      throw new Error(`${res.status} ${res.statusText} — ${msg}`);
    }

    return payload as T;
  } catch (e: any) {
    if (e?.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw new Error(e?.message || String(e));
  } finally {
    clearTimeout(t);
  }
}

export function apiGet<T>(path: string, timeoutMs?: number) {
  return request<T>("GET", path, undefined, timeoutMs);
}

export function apiPost<T>(path: string, body?: any, timeoutMs?: number) {
  return request<T>("POST", path, body, timeoutMs);
}
