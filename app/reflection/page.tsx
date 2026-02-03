"use client";

import { useEffect, useMemo, useState } from "react";

type WeeklyItem = {
  id: number;
  sid: string;
  week_start: string;
  week_end: string;
  created_at: string;
  content: string;
};

function cleanReflectionText(s: string) {
  let t = (s || "").trim();

  // Remove common markdown noise
  t = t.replace(/\*\*/g, "");            // bold markers
  t = t.replace(/^-\s+/gm, "");          // leading "- "
  t = t.replace(/^>\s+/gm, "");          // blockquotes
  t = t.replace(/^\d+\)\s+/gm, "");      // "1) "
  t = t.replace(/^\d+\.\s+/gm, "");      // "1. "
  t = t.replace(/`+/g, "");              // backticks

  // Tighten extra blank lines
  t = t.replace(/\n{3,}/g, "\n\n");
  return t;
}

function apiBase() {
  return process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
}

export default function WeeklyReflectionPage() {
  const API = useMemo(() => apiBase(), []);
  const [sid] = useState("default");

  const [item, setItem] = useState<WeeklyItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function loadLatest() {
    setErr("");
    try {
      const r = await fetch(`${API}/memory/reflection/weekly/latest?sid=${encodeURIComponent(sid)}`, {
        cache: "no-store",
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.detail || "Failed to load latest reflection.");
      setItem(j?.item || null);
    } catch (e: any) {
      setErr(e?.message || "Failed to load latest reflection.");
    }
  }

  async function generate(force: boolean) {
    setErr("");
    setLoading(true);
    try {
      const r = await fetch(`${API}/memory/reflection/weekly/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sid, days: 7, force }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.detail || "Generate failed.");
      setItem(j?.item || null);
    } catch (e: any) {
      setErr(e?.message || "Generate failed.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLatest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const raw = cleanReflectionText(item?.content || "");
  const text = raw
    .replace(/\n(Wins:|Patterns:|Hard truths:|One change for next 7 days:|Next Up:|Micro-plan \(Mon–Sun\):)\n/g, "\n\n$1\n");

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xl font-semibold text-zinc-100">Weekly Reflection</div>
          <p className="mt-1 text-sm text-zinc-400">
            7-day synthesis from Direction + Action Plan + Next Up.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => generate(false)}
            disabled={loading}
            className="rounded-2xl px-4 py-2 text-sm font-medium bg-white/5 border border-white/10 text-zinc-100 hover:bg-white/10 disabled:opacity-60"
          >
            {loading ? "Generating…" : "Generate"}
          </button>

          <button
            onClick={() => generate(true)}
            disabled={loading}
            className="rounded-2xl px-4 py-2 text-sm font-medium bg-white/5 border border-white/10 text-zinc-100 hover:bg-white/10 disabled:opacity-60"
          >
            Regenerate
          </button>
        </div>
      </div>

      {err ? (
        <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          {err}
        </div>
      ) : null}

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
        {item ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-zinc-100">Latest</div>
              <div className="text-xs text-zinc-400">
                {item.week_start} → {item.week_end}
              </div>
            </div>

            <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">
              {text || "Reflection is empty. (Backend returned no content.)"}
            </div>

            <div className="mt-4 text-xs text-zinc-500">Created: {item.created_at}</div>
          </>
        ) : (
          <div className="text-sm text-zinc-400">
            No reflection yet. Click <span className="text-zinc-200 font-medium">Generate</span>.
          </div>
        )}
      </div>

      <div className="mt-6 flex gap-2">
        <button
          onClick={loadLatest}
          disabled={loading}
          className="rounded-2xl px-4 py-2 text-sm font-medium bg-white/5 border border-white/10 text-zinc-100 hover:bg-white/10 disabled:opacity-60"
        >
          Refresh
        </button>
      </div>
    </div>
  );
}
