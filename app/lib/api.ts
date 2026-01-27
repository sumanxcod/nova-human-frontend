const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.trim() ||
  "https://nova-human-backend.onrender.com";

async function readTextSafe(res: Response) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

export async function apiGet<T = any>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    credentials: "omit", // IMPORTANT
  });

  if (!res.ok) {
    const txt = await readTextSafe(res);
    throw new Error(`GET ${path} -> ${res.status} ${txt}`);
  }
  return res.json();
}

export async function apiPost<T = any>(path: string, body: any): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "omit", // IMPORTANT
  });

  if (!res.ok) {
    const txt = await readTextSafe(res);
    throw new Error(`POST ${path} -> ${res.status} ${txt}`);
  }
  return res.json();
}
