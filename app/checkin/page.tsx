"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../lib/api";

/* ------------------ Types ------------------ */
type TodayResp = {
  date: string;
  checkin: null | {
    date: string;
    moved_forward: boolean;
    today_action: string;
    note?: string;
  };
  escalation_level: number;
  tone: string;
};

/* ------------------ Component ------------------ */
export default function CheckInPage() {
  const [data, setData] = useState<TodayResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [movedForward, setMovedForward] = useState<boolean | null>(null);
  const [todayAction, setTodayAction] = useState("");
  const [note, setNote] = useState("");

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const d = await apiGet<TodayResp>("/memory/checkin/today");
      setData(d);

      if (d.checkin) {
        setMovedForward(Boolean(d.checkin.moved_forward));
        setTodayAction(d.checkin.today_action || "");
        setNote(d.checkin.note || "");
      } else {
        setMovedForward(null);
        setTodayAction("");
        setNote("");
      }
    } catch (e: any) {
      setErr(e?.message || String(e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function submit() {
    if (movedForward === null) {
      setErr("Please select Yes or No.");
      return;
    }

    if (!todayAction.trim()) {
      setErr("Write your one action for today.");
      return;
    }

    setErr(null);

    try {
      await apiPost("/memory/chec-kin/today", {
        moved_forward: movedForward ? 1 : 0, // ✅ backend expects 0/1
        today_action: todayAction.trim(),
        note: note.trim(),
      });

      await load();
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  }

  if (loading) {
    return <div className="p-6 text-sm opacity-70">Loading…</div>;
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Checkin</h1>
        <p className="text-sm opacity-70">Daily execution, not motivation.</p>
      </div>

      {data && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
          <div className="text-xs uppercase tracking-wide text-zinc-400">
            Today’s tone (Level {data.escalation_level})
          </div>
          <div className="mt-1 text-sm font-medium">{data.tone}</div>
        </div>
      )}

      {err && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {err}
        </div>
      )}

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5 space-y-4">
        <div className="text-sm font-medium">
          1) Did you move forward yesterday?
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setMovedForward(true)}
            className={`rounded-xl px-4 py-2 text-sm border ${
              movedForward === true
                ? "bg-zinc-100 text-zinc-900 border-zinc-100"
                : "border-zinc-700 hover:bg-zinc-900"
            }`}
          >
            Yes
          </button>

          <button
            onClick={() => setMovedForward(false)}
            className={`rounded-xl px-4 py-2 text-sm border ${
              movedForward === false
                ? "bg-zinc-100 text-zinc-900 border-zinc-100"
                : "border-zinc-700 hover:bg-zinc-900"
            }`}
          >
            No
          </button>
        </div>

        <div className="text-sm font-medium">2) Your one action for today</div>

        <input
          value={todayAction}
          onChange={(e) => setTodayAction(e.target.value)}
          placeholder="Example: Apply to 2 internships (15 minutes)"
          className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3 text-sm outline-none focus:border-zinc-600"
        />

        <div className="text-sm font-medium">Optional: what’s weighing on you?</div>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Short note (optional)"
          className="w-full min-h-[100px] rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3 text-sm outline-none focus:border-zinc-600"
        />

        <button
          onClick={submit}
          className="rounded-xl bg-zinc-100 text-zinc-900 px-4 py-3 text-sm font-medium"
        >
          Save checkin
        </button>

        {data?.checkin && (
          <div className="text-xs text-zinc-500">
            Saved for {data.date}. You can edit and resave anytime today.
          </div>
        )}
      </div>
    </div>
  );
}
