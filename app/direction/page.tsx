"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  fetchDirection,
  saveDirectionDraft,
  lockDirection,
  finalizeDirection,
  setTodayStep,
  doneTodayStep,
  addDirectionProgress,
} from "../lib/directionApi";

type DirectionStatus = "draft" | "calibration" | "locked";

type Direction = {
  title: string;
  emotion_30?: string;
  consequence?: string;
  duration_days?: number;

  status: DirectionStatus;
  created_at?: string | null;
  calibration_ends_at?: string | null;
  locked_at?: string | null;

  start_date?: string | null;
  end_date?: string | null;

  metric_name?: string;
  metric_target?: number;
  metric_progress?: number;

  today_step?: {
    text: string;
    estimate_min: number;
    done: boolean;
    date: string; // "YYYY-MM-DD"
  } | null;
};

// ---- helpers (ONLY ONCE) ----
function daysLeft(end?: string | null) {
  if (!end) return null;
  const endDate = new Date(end + "T23:59:59");
  const diff = endDate.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function pct(progress?: number, target?: number) {
  const p = Number(progress ?? 0);
  const t = Math.max(1, Number(target ?? 1));
  return Math.max(0, Math.min(100, Math.round((p / t) * 100)));
}

// ticking countdown helpers
function msLeft(iso?: string | null) {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Math.max(0, t - Date.now());
}

function formatCountdown(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h}h ${m}m ${s}s`;
}

// focus timer helpers
function formatMs(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function playBell() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 880;
    g.gain.value = 0.02;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    setTimeout(() => {
      o.stop();
      ctx.close();
    }, 350);
  } catch {}
}

const ARCHETYPES = [
  {
    title: "MVP Ship",
    emotion: "Proud because I shipped something real.",
    consequence: "I’ll stay stuck in planning.",
    duration_days: 30,
  },
  {
    title: "Career Sprint",
    emotion: "Confident because I took action daily.",
    consequence: "I’ll keep delaying opportunities.",
    duration_days: 30,
  },
  {
    title: "Discipline Reset",
    emotion: "Calm and in control again.",
    consequence: "My days will stay chaotic.",
    duration_days: 30,
  },
  {
    title: "Study Focus",
    emotion: "Clear because I studied consistently.",
    consequence: "I’ll fall behind and panic.",
    duration_days: 30,
  },
  {
    title: "Money Survival",
    emotion: "Relieved because I stabilized my finances.",
    consequence: "I’ll stay stressed and uncertain.",
    duration_days: 15,
  },
  {
    title: "Mental Clarity",
    emotion: "Light, focused, and mentally clean.",
    consequence: "I’ll stay scattered and tired.",
    duration_days: 15,
  },
];

function FocusCompanion({
  isRunning,
  timeLeftLabel,
  directionTitle,
  stepText,
  focusDone,
  debrief,
  setDebrief,
  onAskNova,
  novaSuggestion,
  onSaveDebrief,
}: {
  isRunning: boolean;
  timeLeftLabel?: string;
  directionTitle?: string;
  stepText?: string;
  focusDone: boolean;
  debrief: { summary: string; blocker: string; next: string };
  setDebrief: (d: { summary: string; blocker: string; next: string }) => void;
  onAskNova: () => void;
  novaSuggestion: string | null;
  onSaveDebrief: () => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Focus Companion</div>
        <div className="text-xs text-zinc-400">Mentor mode</div>
      </div>

      {/* Live session */}
      <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
        <div className="text-xs text-zinc-400">Current session</div>

        <div className="mt-2 text-sm text-zinc-200">
          <span className="text-zinc-400">Direction:</span>{" "}
          <span className="font-medium">{directionTitle || "—"}</span>
        </div>

        <div className="mt-1 text-sm text-zinc-200">
          <span className="text-zinc-400">Task:</span>{" "}
          <span className="font-medium">{stepText || "—"}</span>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs text-zinc-400">
            Status:{" "}
            <span className="text-zinc-200 font-medium">
              {isRunning ? "Running" : focusDone ? "Complete" : "Idle"}
            </span>
          </div>

          {isRunning && (
            <div className="text-xs text-zinc-400">
              Time left:{" "}
              <span className="text-zinc-200 font-medium">
                {timeLeftLabel || "—"}
              </span>
            </div>
          )}
        </div>

        {isRunning && (
          <div className="mt-3 text-xs text-zinc-400">
            Rule: stay with one task. No switching.
          </div>
        )}

        {focusDone && (
          <div className="mt-3 text-xs text-zinc-300">
            🔔 Session complete. Capture what happened (2 minutes).
          </div>
        )}
      </div>

      {/* Debrief */}
      <div className="mt-5">
        <div className="text-xs text-zinc-400 mb-2">Focus Debrief</div>

        <div className="space-y-3">
          <input
            value={debrief.summary}
            onChange={(e) => setDebrief({ ...debrief, summary: e.target.value })}
            className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 text-sm outline-none focus:border-white/20"
            placeholder="1) What did you do? (1–2 lines)"
            title="Summary of what you did"
          />

          <input
            value={debrief.blocker}
            onChange={(e) =>
              setDebrief({ ...debrief, blocker: e.target.value })
            }
            className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 text-sm outline-none focus:border-white/20"
            placeholder="2) What blocked you? (optional)"
          />

          <input
            value={debrief.next}
            onChange={(e) => setDebrief({ ...debrief, next: e.target.value })}
            className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 text-sm outline-none focus:border-white/20"
            placeholder="3) Next smallest step? (optional)"
          />
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={onSaveDebrief}
            className="rounded-xl px-4 py-2 text-sm bg-white/5 hover:bg-white/10 border border-white/10"
          >
            Save
          </button>

          <button
            onClick={onAskNova}
            className="rounded-xl px-4 py-2 text-sm bg-zinc-100 text-zinc-900"
          >
            Ask Nova
          </button>
        </div>

        {novaSuggestion && (
          <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-xs text-zinc-400">Nova suggests</div>
            <div className="mt-2 text-sm text-zinc-200 whitespace-pre-wrap">
              {novaSuggestion}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getLastDebriefNext() {
  try {
    const arr = JSON.parse(localStorage.getItem("nova_focus_debrief_v1") || "[]");
    return arr?.[0]?.next?.trim() ? arr[0].next.trim() : null;
  } catch {
    return null;
  }
}

export default function DirectionPage() {
  const router = useRouter();

  const [d, setD] = useState<Direction | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // draft fields
  const [title, setTitle] = useState("");
  const [emotion, setEmotion] = useState("");
  const [consequence, setConsequence] = useState("");
  const [duration, setDuration] = useState(30);

  // metric fields (premium default; no UI)
  const [metricName, setMetricName] = useState("Days completed");
  const [metricTarget, setMetricTarget] = useState(duration);

  // today step fields
  const [stepText, setStepText] = useState("");
  const [stepMin, setStepMin] = useState(25);

  // ticking calibration state
  const [tickMs, setTickMs] = useState(0);
  const [autoFinalized, setAutoFinalized] = useState(false);

  // focus timer state
  const [focusRunning, setFocusRunning] = useState(false);
  const [focusEndsAt, setFocusEndsAt] = useState<number | null>(null);
  const [focusLeftMs, setFocusLeftMs] = useState<number>(0);
  const [focusDone, setFocusDone] = useState(false);

  // debrief + local mentor
  const [debrief, setDebrief] = useState({ summary: "", blocker: "", next: "" });
  const [novaSuggestion, setNovaSuggestion] = useState<string | null>(null);

  // auto record completion
  const [autoRecorded, setAutoRecorded] = useState(false);
  const [focusMsg, setFocusMsg] = useState<string | null>(null);

  const status: DirectionStatus = (d?.status ?? "draft") as DirectionStatus;

  // keep metric target aligned to duration (only while not locked)
  useEffect(() => {
    if (status === "locked") return;
    setMetricName("Days completed");
    setMetricTarget(duration);
  }, [duration, status]);

  // keep Today Step local inputs synced to backend step (prevents drift)
  useEffect(() => {
    const ts = d?.today_step;
    if (!ts) return;
    setStepText(ts.text ?? "");
    setStepMin(ts.estimate_min ?? 25);
  }, [d?.today_step?.date]);

  const left = useMemo(() => daysLeft(d?.end_date ?? null), [d?.end_date]);

  // enforce "target = duration" even if backend drifts (display + math)
  const targetEffective = useMemo(() => {
    const dur = Number(d?.duration_days ?? duration ?? 30);
    return Math.max(1, dur);
  }, [d?.duration_days, duration]);

  const progressPct = useMemo(
    () => pct(d?.metric_progress, targetEffective),
    [d?.metric_progress, targetEffective]
  );

  const done = !!d?.today_step?.done;

  const yNext = useMemo(() => {
    if (typeof window === "undefined") return null;
    return getLastDebriefNext();
  }, [d?.today_step?.date]);

  function openThoughtPartner(prefill: string) {
    router.push(`/?prefill=${encodeURIComponent(prefill)}`);
  }

  // ---- progress: automatic once/day guard (Direction-scoped) ----
  function dayKeyFromIsoDate(iso?: string) {
    const day = (iso ?? new Date().toISOString().slice(0, 10)).slice(0, 10);
    return day;
  }

  function progressGuardKey(day: string) {
    return `nova_direction_progress_recorded_${d?.start_date ?? "na"}_${day}`;
  }

  async function completeDayOnce() {
    // Ensure today_step exists before marking done
    if (!d?.today_step && stepText.trim()) {
      const step = await setTodayStep({ text: stepText, estimate_min: stepMin });
      const ts = (step as any)?.today_step ?? step;
      setD((prev) => (prev ? { ...prev, today_step: ts } : prev));
    }

    // 1) Mark today's step done
    const stepRes = await doneTodayStep();
    const todayStep = (stepRes as any)?.today_step ?? stepRes;

    setD((prev) => (prev ? { ...prev, today_step: todayStep } : prev));

    // 2) Only add progress once per day (client guard)
    const day = dayKeyFromIsoDate(todayStep?.date);
    const key = progressGuardKey(day);

    if (typeof window !== "undefined") {
      if (localStorage.getItem(key) === "1") return;
      localStorage.setItem(key, "1");
    }

    // 3) Add +1 progress
    const res = await addDirectionProgress(1);
    setD((prev) =>
    prev ? { ...prev, metric_progress: res.metric_progress } : prev
    );
  }

  async function refresh() {
    setErr(null);
    try {
      const data = await fetchDirection();
      const dir = (data as any)?.direction ?? data; // supports both shapes
      setD(dir ?? null);

      setTitle(dir?.title ?? "");
      setEmotion(dir?.emotion_30 ?? "");
      setConsequence(dir?.consequence ?? "");
      setDuration(Number(dir?.duration_days ?? 30));

      // premium default (always)
      setMetricName("Days completed");
      setMetricTarget(Number(dir?.duration_days ?? 30));

      const ts = dir?.today_step;
      setStepText(ts?.text ?? "");
      setStepMin(ts?.estimate_min ?? 25);
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  // ticking calibration countdown
  useEffect(() => {
    if (status !== "calibration") return;

    const update = () => setTickMs(msLeft(d?.calibration_ends_at ?? null));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [status, d?.calibration_ends_at]);

  // optional: auto-lock when time hits 0 (guarded)
  useEffect(() => {
    if (status !== "calibration") {
      setAutoFinalized(false);
      return;
    }
    if (tickMs > 0) return;
    if (autoFinalized) return;

    setAutoFinalized(true);
    finalize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickMs, status, autoFinalized]);

  async function saveDraft() {
    setSaving(true);
    setErr(null);
    try {
      const payload = {
        title,
        emotion_30: emotion,
        consequence,
        duration_days: duration,
        metric_name: "Days completed",
        metric_target: duration,
      } as any;

      const updated = await saveDirectionDraft(payload);
      const dir = (updated as any)?.direction ?? updated;
      setD(dir ?? null);

      setMetricName("Days completed");
      setMetricTarget(Number(payload.duration_days ?? duration));
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function startCalibration() {
    setSaving(true);
    setErr(null);
    try {
      const payload = {
        title,
        emotion_30: emotion,
        consequence,
        duration_days: duration,
        metric_name: "Days completed",
        metric_target: duration,
      } as any;

      const updated = await lockDirection(payload);
      const dir = (updated as any)?.direction ?? updated;
      setD(dir ?? null);

      setMetricName("Days completed");
      setMetricTarget(Number(payload.duration_days ?? duration));
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function finalize() {
    setSaving(true);
    setErr(null);
    try {
      const updated = await finalizeDirection();
      setD((updated as any)?.direction ?? updated);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  // ✅ Unlock for 24h (re-open calibration window using your existing lockDirection)
  async function unlockForEdit() {
    if (!d) return;
    if (
      !confirm(
        "Unlock for 24h? Only do this if you truly need to change your Direction."
      )
    )
      return;

    setSaving(true);
    setErr(null);

    try {
      const payload: any = {
        title: d.title,
        emotion_30: d.emotion_30 ?? "",
        consequence: d.consequence ?? "",
        duration_days: Number(d.duration_days ?? duration),
        metric_name: "Days completed",
        metric_target: Number(d.duration_days ?? duration),
      };

      const updated = await lockDirection(payload);
      const dir = (updated as any)?.direction ?? updated;

      setD(dir);

      setTitle(dir?.title ?? "");
      setEmotion(dir?.emotion_30 ?? "");
      setConsequence(dir?.consequence ?? "");
      setDuration(Number(dir?.duration_days ?? 30));

      setMetricName("Days completed");
      setMetricTarget(Number(dir?.duration_days ?? 30));
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function saveTodayStepUI() {
    setSaving(true);
    setErr(null);
    try {
      const step = await setTodayStep({
        text: stepText,
        estimate_min: stepMin,
      });
      const ts = (step as any)?.today_step ?? step;
      setD((prev) => (prev ? { ...prev, today_step: ts } : prev));
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function markDone() {
    setSaving(true);
    setErr(null);
    try {
      await completeDayOnce();
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  // ---- Focus timer effect ----
  useEffect(() => {
    if (!focusRunning || !focusEndsAt) return;

    const tick = () => {
      const left = Math.max(0, focusEndsAt - Date.now());
      setFocusLeftMs(left);

      if (left === 0) {
        setFocusRunning(false);
        setFocusDone(true);
        playBell();

        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Nova Human", { body: "Focus session complete." });
        }

        if (!autoRecorded) {
          setAutoRecorded(true);
          recordFocusCompletion();
        }
      }
    };

    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRunning, focusEndsAt, autoRecorded]);

  async function startFocus() {
    if ("Notification" in window && Notification.permission === "default") {
      try {
        await Notification.requestPermission();
      } catch {}
    }

    const mins = Math.max(1, Number(stepMin || 25));
    const end = Date.now() + mins * 60 * 1000;

    setAutoRecorded(false);
    setFocusMsg(null);

    setFocusDone(false);
    setFocusEndsAt(end);
    setFocusRunning(true);
  }

  function stopFocus() {
    setFocusRunning(false);
    setFocusEndsAt(null);
    setFocusLeftMs(0);
  }

  function askNovaLocal() {
    const b = debrief.blocker.trim().toLowerCase();
    const n = debrief.next.trim();

    let out = `Top priority: do the next smallest step.\n`;

    if (!debrief.summary.trim()) {
      out += `\nFirst write a 1-line summary of what you did. Keep it simple.`;
      setNovaSuggestion(out);
      return;
    }

    if (b.includes("error") || b.includes("bug") || b.includes("import")) {
      out += `\nNext step: reproduce the issue in the smallest case, then fix ONE root cause.`;
    } else if (b.includes("time") || b.includes("late") || b.includes("tired")) {
      out += `\nNext step: cut scope. Pick a 10-minute version of the task and finish it.`;
    } else if (b.includes("confus") || b.includes("not sure")) {
      out += `\nNext step: write 3 micro tasks (10 min each). Choose the easiest and start.`;
    } else {
      out += `\nNext step: ${
        n ? n : "write the next action in one sentence and do it."
      }`;
    }

    out += `\n\nRule: one action → done → then decide the next.`;
    setNovaSuggestion(out);
  }

  function saveDebriefLocal() {
    const key = "nova_focus_debrief_v1";
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    existing.unshift({
      ts: new Date().toISOString(),
      direction: d?.title || "",
      step: stepText,
      minutes: stepMin,
      ...debrief,
      novaSuggestion,
    });
    localStorage.setItem(key, JSON.stringify(existing.slice(0, 100)));
  }

  async function recordFocusCompletion() {
    try {
      await completeDayOnce();
      setFocusMsg("✅ Focus complete. Progress recorded.");
    } catch {
      setFocusMsg("⚠️ Focus complete, but couldn’t record progress.");
    }
  }

  return (
    <div className="h-full overflow-hidden flex flex-col">
      <div className="shrink-0 px-6 py-5 border-b border-white/10">
        <h1 className="text-2xl font-semibold">Direction</h1>
        <p className="text-sm text-zinc-400 mt-1">
          One focus. {d?.duration_days ?? duration} days. Locked by default.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {/* ✅ Error UI with Retry */}
        {err && (
          <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200 flex items-center justify-between gap-3">
            <span className="break-words">{err}</span>
            <button
              onClick={refresh}
              className="shrink-0 rounded-lg bg-white/10 border border-white/10 px-3 py-1 text-xs text-zinc-100"
            >
              Retry
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_360px] gap-6">
          {/* LEFT */}
          <div className="space-y-6">
            {/* Editor card OR locked summary card */}
            {status !== "locked" ? (
              <div className="max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-zinc-400">
                    Status:{" "}
                    <span className="text-zinc-200 font-medium">
                      {status === "draft"
                        ? "Draft"
                        : status === "calibration"
                        ? "Calibration"
                        : "Locked"}
                    </span>
                  </div>

                  {status === "calibration" && (
                    <div className="text-xs text-zinc-400">
                      Editable for:{" "}
                      <span className="text-zinc-200 font-medium">
                        {formatCountdown(tickMs)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-5 space-y-4">
                  <div>
                    <label className="text-sm text-zinc-300">
                      What are you focusing on?
                    </label>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 text-sm outline-none focus:border-white/20"
                      placeholder="Example: Build Nova Human v1"
                    />
                  </div>

                  {/* Archetypes */}
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs text-zinc-400">
                          Archetypes (click to autofill)
                        </div>
                        <div className="text-xs text-zinc-500">
                          Guided starts → less fear
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {ARCHETYPES.map((a) => (
                        <button
                          key={a.title}
                          onClick={() => {
                            setTitle(a.title);
                            setEmotion(a.emotion);
                            setConsequence(a.consequence);
                            setDuration(a.duration_days);
                          }}
                          className="text-left rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 p-3"
                        >
                          <div className="text-sm font-medium">{a.title}</div>
                          <div className="text-xs text-zinc-400 mt-1 line-clamp-2">
                            {a.emotion}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-zinc-300">
                      How will you feel in {duration} days if you achieve this?
                    </label>
                    <input
                      value={emotion}
                      onChange={(e) => setEmotion(e.target.value)}
                      className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 text-sm outline-none focus:border-white/20"
                      placeholder="Example: Calm, proud, unstoppable"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-zinc-300">
                      Optional: what happens if you don’t?
                    </label>
                    <input
                      value={consequence}
                      onChange={(e) => setConsequence(e.target.value)}
                      className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 text-sm outline-none focus:border-white/20"
                      placeholder="Example: I stay stuck and distracted"
                    />
                  </div>

                  {/* Premium metric note (no inputs) */}
                  <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className="text-xs text-zinc-400">Progress metric</div>
                    <div className="mt-1 text-sm text-zinc-200">
                      {metricName} • Target = {metricTarget} days
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      Professional default: 1 completed day = 1 point.
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <label
                      className="text-sm text-zinc-300 w-40"
                      id="duration-label"
                    >
                      Duration
                    </label>
                    <select
                      aria-labelledby="duration-label"
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      className="rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm"
                    >
                      <option value={7}>7 days</option>
                      <option value={15}>15 days</option>
                      <option value={30}>30 days (recommended)</option>
                      <option value={45}>45 days</option>
                      <option value={60}>60 days</option>
                      <option value={90}>90 days</option>
                    </select>
                  </div>

                  <div className="pt-2 flex gap-2">
                    <button
                      onClick={saveDraft}
                      disabled={saving}
                      className="rounded-xl px-4 py-2 text-sm bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-50"
                    >
                      Save draft
                    </button>

                    {status === "draft" && (
                      <button
                        onClick={startCalibration}
                        disabled={saving || !title.trim()}
                        className="rounded-xl px-4 py-2 text-sm bg-zinc-100 text-zinc-900 disabled:opacity-50"
                      >
                        Start calibration (24h)
                      </button>
                    )}

                    {status === "calibration" && (
                      <button
                        onClick={finalize}
                        disabled={saving}
                        className="rounded-xl px-4 py-2 text-sm bg-zinc-100 text-zinc-900 disabled:opacity-50"
                      >
                        Finalize (lock)
                      </button>
                    )}

                    <button
                      onClick={refresh}
                      className="rounded-xl px-4 py-2 text-sm bg-transparent border border-white/10 hover:bg-white/5"
                      title="Sync latest data"
                    >
                      Sync
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* ... keep the rest of your component exactly the same ... */
              <div className="max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-5">
                {/* Locked summary + unlock */}
                {/* (UNCHANGED BELOW) */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs text-zinc-400">Direction</div>
                    <div className="mt-1 text-lg font-semibold">{d?.title}</div>

                    {d?.emotion_30 && (
                      <div className="mt-1 text-sm text-zinc-300">
                        <span className="text-zinc-400">
                          In {d?.duration_days ?? duration} days I want to feel:
                        </span>{" "}
                        <span className="font-medium">{d.emotion_30}</span>
                      </div>
                    )}

                    {left !== null && (
                      <div className="mt-1 text-sm text-zinc-400">
                        Days left:{" "}
                        <span className="text-zinc-200 font-medium">{left}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={unlockForEdit}
                      disabled={saving}
                      className="rounded-xl px-4 py-2 text-sm bg-zinc-100 text-zinc-900 disabled:opacity-50"
                      title="Open a 24h edit window"
                    >
                      Unlock for 24h
                    </button>
                  </div>
                </div>

                <div className="mt-3 text-xs text-zinc-400">
                  Locked by default. You can unlock for 24h if you truly need to
                  change the direction.
                </div>

                {/* Progress (no manual buttons) */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <div>Days completed</div>
                    <div className="text-zinc-200">
                      {(d?.metric_progress ?? 0)} / {targetEffective} ({progressPct}%)
                    </div>
                  </div>

                  <div className="mt-2 h-2 w-full rounded-full bg-black/30 border border-white/10 overflow-hidden">
                    <div
                      className={`h-full bg-white/40 progress-bar-width`}
                      data-progress={progressPct}
                    />
                  </div>

                  <div className="mt-2 text-xs text-zinc-500">
                    Auto-tracked when you complete the day.
                  </div>
                </div>
              </div>
            )}

            {/* (Everything after this stays exactly as you already have it) */}
            {/* ... */}
          </div>

          {/* RIGHT */}
          <div className="hidden md:block">
            <FocusCompanion
              isRunning={focusRunning}
              timeLeftLabel={focusRunning ? formatMs(focusLeftMs) : undefined}
              directionTitle={d?.title}
              stepText={stepText}
              focusDone={focusDone && !focusRunning}
              debrief={debrief}
              setDebrief={setDebrief}
              onAskNova={() => {
                // keep your existing handler
                const b = debrief.blocker.trim().toLowerCase();
                const n = debrief.next.trim();

                let out = `Top priority: do the next smallest step.\n`;

                if (!debrief.summary.trim()) {
                  out += `\nFirst write a 1-line summary of what you did. Keep it simple.`;
                  setNovaSuggestion(out);
                  return;
                }

                if (b.includes("error") || b.includes("bug") || b.includes("import")) {
                  out += `\nNext step: reproduce the issue in the smallest case, then fix ONE root cause.`;
                } else if (b.includes("time") || b.includes("late") || b.includes("tired")) {
                  out += `\nNext step: cut scope. Pick a 10-minute version of the task and finish it.`;
                } else if (b.includes("confus") || b.includes("not sure")) {
                  out += `\nNext step: write 3 micro tasks (10 min each). Choose the easiest and start.`;
                } else {
                  out += `\nNext step: ${
                    n ? n : "write the next action in one sentence and do it."
                  }`;
                }

                out += `\n\nRule: one action → done → then decide the next.`;
                setNovaSuggestion(out);
              }}
              novaSuggestion={novaSuggestion}
              onSaveDebrief={() => {
                const key = "nova_focus_debrief_v1";
                const existing = JSON.parse(localStorage.getItem(key) || "[]");
                existing.unshift({
                  ts: new Date().toISOString(),
                  direction: d?.title || "",
                  step: stepText,
                  minutes: stepMin,
                  ...debrief,
                  novaSuggestion,
                });
                localStorage.setItem(key, JSON.stringify(existing.slice(0, 100)));
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
