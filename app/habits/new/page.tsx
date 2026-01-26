"use client";

import { useState, useEffect } from "react";
import { apiPost } from "../../lib/api";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";

export default function NewHabitPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");

  const [cue, setCue] = useState("");
  const [action, setAction] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "direction") return;

    (async () => {
      try {
        const sid = new URL(window.location.href).searchParams.get("sid") || "default";
        const res: any = await apiPost("/memory/habits/suggest_from_direction", { sid });
        if (res?.ok) {
          if (res.cue) setCue(res.cue.replace(/^After\s*/i, "").trim());
          if (res.action) setAction(res.action.trim());
        }
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  async function save() {
    const c = cue.trim();
    const a = action.trim();
    if (!c || !a) {
      setErr("Cue and action are required.");
      return;
    }

    setLoading(true);
    setErr(null);

    try {
      const res: any = await apiPost("/memory/habits/create", { cue: c, action: a, note });
      if (!res?.ok) throw new Error(res?.error || "Could not create habit");
      router.replace("/habits");
    } catch (e: any) {
      setErr(e?.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="text-lg font-semibold text-zinc-100">Add Supporting Habit</div>
        <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
          Habits exist to reduce effort in service of your Direction. Keep it small and repeatable.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Cue</div>
            <input
              value={cue}
              onChange={(e) => setCue(e.target.value)}
              placeholder="After I close my laptop…"
              className="w-full rounded-2xl bg-black/30 border border-white/10 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-white/20"
            />
          </div>

          <div>
            <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Action</div>
            <input
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder="…I will do 10 pushups."
              className="w-full rounded-2xl bg-black/30 border border-white/10 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-white/20"
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-200">
            <span className="text-zinc-400">Formula:</span>{" "}
            <span className="font-medium">After {cue || "[cue]"}, I will {action || "[action]"}</span>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Optional note</div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why this habit supports your direction (optional)"
              className="w-full min-h-[90px] rounded-2xl bg-black/30 border border-white/10 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-white/20"
            />
          </div>

          {err && <div className="text-xs text-red-400">{err}</div>}

          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={loading}
              className="rounded-2xl px-4 py-3 text-sm font-medium bg-zinc-100 text-zinc-900 disabled:opacity-50"
            >
              {loading ? "Saving…" : "Save habit"}
            </button>

            <button
              onClick={() => router.replace("/habits")}
              className="rounded-2xl px-4 py-3 text-sm font-medium bg-white/5 border border-white/10 text-zinc-100 hover:bg-white/10"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
