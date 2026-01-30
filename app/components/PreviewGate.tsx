"use client";

import { useEffect, useMemo, useState } from "react";

export default function PreviewGate({ children }: { children: React.ReactNode }) {
  const required = useMemo(
    () => (process.env.NEXT_PUBLIC_PREVIEW_CODE || "").trim(),
    []
  );

  const [ok, setOk] = useState(false);
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    // If no code is set, do not gate (safe default for dev)
    if (!required) {
      setOk(true);
      return;
    }

    const saved = (localStorage.getItem("nova_preview_ok") || "").trim();
    if (saved === "1") setOk(true);
  }, [required]);

  function submit() {
    setErr(null);

    if (!required) {
      setOk(true);
      return;
    }

    if (code.trim() === required) {
      localStorage.setItem("nova_preview_ok", "1");
      setOk(true);
      return;
    }

    setErr("Wrong code.");
  }

  if (ok) return <>{children}</>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 shadow">
        <div className="text-xl font-semibold">Nova Human (Private Preview)</div>
        <p className="mt-2 text-sm text-white/70">
          Enter the access code to continue.
        </p>

        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="Access code"
          className="mt-4 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-[16px] outline-none"
        />

        {err && <div className="mt-2 text-sm text-red-300">{err}</div>}

        <button
          onClick={submit}
          className="mt-4 w-full rounded-xl bg-white text-black py-3 font-medium"
        >
          Enter
        </button>

        <button
          onClick={() => {
            localStorage.removeItem("nova_preview_ok");
            setCode("");
          }}
          className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 py-2 text-sm text-white/80"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
