// lib/api.ts
const RAW_API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || "";

// ✅ Fail early if API_BASE_URL is missing in production
if (typeof window !== "undefined" && !RAW_API_BASE && process.env.NODE_ENV === "production") {
  console.error("❌ NEXT_PUBLIC_API_BASE_URL is not set in production!");
}

// ✅ Default to localhost only in development
export const API_BASE = RAW_API_BASE 
  ? RAW_API_BASE.replace(/\/+$/, "") 
  : (process.env.NODE_ENV === "production" ? "" : "http://localhost:8000");

// Log API_BASE on load (helps debugging)
if (typeof window !== "undefined") {
  console.log("🌐 API_BASE:", API_BASE || "(not configured)");
}

// ✅ Get auth token from localStorage
function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("nh_token");
  } catch {
    return null;
  }
}

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
  // ✅ Guard: if API_BASE is not configured, fail immediately
  if (!API_BASE) {
    throw new Error("Server not configured. NEXT_PUBLIC_API_BASE_URL is missing.");
  }

  const fullUrl = url(path);
  console.log(`🔗 ${method} ${fullUrl}`, body ? { body } : "");

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    // ✅ Add Authorization header if token exists
    const token = getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // ✅ Add Content-Type for POST
    if (method === "POST") {
      headers["Content-Type"] = "application/json";
    }

    const init: RequestInit = {
      method,
      signal: controller.signal,
      headers,
      body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
    };

    const res = await fetch(fullUrl, init);
    const payload = await readBody(res);

    if (!res.ok) {
      const msg =
        typeof payload === "string"
          ? payload
          : payload?.detail || payload?.message || JSON.stringify(payload);

      console.error(`❌ ${method} ${fullUrl} failed:`, msg);
      throw new Error(`${res.status} ${res.statusText} — ${msg}`);
    }

    console.log(`✅ ${method} ${fullUrl} success`);
    return payload as T;
  } catch (e: any) {
    if (e?.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    
    // ✅ Better error messages for common issues
    if (e?.message === "Failed to fetch") {
      console.error(`❌ ${method} ${fullUrl} - Network error. Possible causes:`, {
        "Backend not running": `Is your backend running at ${API_BASE}?`,
        "CORS issue": "Backend needs CORS headers for cross-origin requests",
        "Wrong URL": `Check NEXT_PUBLIC_API_BASE_URL is correct: ${API_BASE}`,
      });
      throw new Error(
        `Cannot reach backend at ${API_BASE}. ` +
        `Check: (1) Backend is running, (2) CORS is configured, (3) URL is correct.`
      );
    }
    
    console.error(`❌ ${method} ${fullUrl} error:`, e);
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
