"use client";

import { useEffect, useState } from "react";
import AuthGate from "../components/AuthGate";

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

const STORAGE_KEY = "nova_checkin_local_v1";

function todayDateStr() {
  return new Date().toISOString().slice(0, 10);
}

function loadLocal(): TodayResp | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TodayResp;
    if (!parsed?.date) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveLocal(data: TodayResp) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

/* ------------------ Component ------------------ */
export default function CheckInPage() {
  return (
    <AuthGate>
      <CheckInPageContent />
    </AuthGate>
  );
}

function CheckInPageContent() {
  const [data, setData] = useState<TodayResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [movedForward, setMovedForward] = useState<boolean | null>(null);
  const [todayAction, setTodayAction] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    const today = todayDateStr();
    const d = loadLocal();
    if (d && d.date === today) {
      setData(d);
      if (d.checkin) {
        setMovedForward(Boolean(d.checkin.moved_forward));
        setTodayAction(d.checkin.today_action || "");
        setNote(d.checkin.note || "");
      }
    } else {
      setData({
        date: today,
        checkin: null,
        escalation_level: 0,
        tone: "—",
      });
    }
    setLoading(false);
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

    const today = todayDateStr();
    const next: TodayResp = {
      date: today,
      escalation_level: data?.escalation_level ?? 0,
      tone: data?.tone ?? "—",
      checkin: {
        date: today,
        moved_forward: movedForward,
        today_action: todayAction.trim(),
        note: note.trim(),
      },
    };
    saveLocal(next);
    setData(next);
  }

  if (loading) {
    return <div className="p-6 text-sm opacity-70">Loading…</div>;
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Checkin</h1>
        <p className="text-sm opacity-70">Daily execution, not motivation.</p>
        <p className="mt-2 text-xs text-zinc-500">
          Saved on this device only (no server sync).
        </p>
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
