import { API_BASE } from "./config";

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("nh_token") || "";
}

async function parseError(res: Response) {
  try {
    const j = await res.json();
    return j?.detail || j?.message || JSON.stringify(j);
  } catch {
    return `${res.status} ${res.statusText}`;
  }
}

export async function apiGet(path: string) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function apiPost(path: string, body?: any) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : "{}",
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}
