const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.trim() ||
  "https://nova-human-backend.onrender.com";

function withTimeout(ms: number) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  return { signal: c.signal, cancel: () => clearTimeout(t) };
}

async function readTextSafe(res: Response) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

export async function apiGet<T = any>(path: string): Promise<T> {
  const { signal, cancel } = withTimeout(15000);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      credentials: "omit",
      signal,
    });

    if (!res.ok) {
      const txt = await readTextSafe(res);
      throw new Error(`GET ${path} -> ${res.status} ${txt}`);
    }
    return res.json();
  } finally {
    cancel();
  }
}

export async function apiPost<T = any>(path: string, body: any): Promise<T> {
  const { signal, cancel } = withTimeout(15000);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "omit",
      signal,
    });

    if (!res.ok) {
      const txt = await readTextSafe(res);
      throw new Error(`POST ${path} -> ${res.status} ${txt}`);
    }
    return res.json();
  } finally {
    cancel();
  }
}
