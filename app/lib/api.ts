const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.trim() ||
  "https://nova-human-backend.onrender.com";

export function getApiBase() {
  return API_BASE;
}

export async function apiGet<T = any>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`GET ${path} failed: ${res.status} ${txt}`);
  }
  return res.json();
}

export async function apiPost<T = any>(path: string, body: any): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`POST ${path} failed: ${res.status} ${txt}`);
  }
  return res.json();
}
