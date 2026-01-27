"use client";
import { useEffect, useState } from "react";
import { apiGet, apiPost } from ".././lib/api";

export default function TestPage() {
  const [health, setHealth] = useState<any>(null);
  const [reply, setReply] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    apiGet("/health")
      .then(setHealth)
      .catch((e) => setErr(String(e)));
  }, []);

  async function send() {
    setErr(null);
    try {
      const r = await apiPost("/memory/chat", { sid: "demo", message: "Hello Nova" });
      setReply(r);
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Nova Human API Test</h1>
      <pre>{JSON.stringify(health, null, 2)}</pre>

      <button onClick={send} style={{ padding: 10, marginTop: 10 }}>
        Send Chat Test
      </button>

      {err && <pre style={{ marginTop: 10 }}>{err}</pre>}
      <pre style={{ marginTop: 10 }}>{JSON.stringify(reply, null, 2)}</pre>
    </div>
  );
}
