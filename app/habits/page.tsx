"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type ActionPlanV1 = {
  direction_title: string;
  milestones: { title: string; due_day?: number }[];
  week1_goal: string;
  week_tasks: { title: string; done?: boolean }[];
  next_up: { title: string; est_minutes?: number };
  generated_at: string;
};

export default function ActionPlanPage() {
  const router = useRouter();

  const placeholderPlan: ActionPlanV1 = useMemo(
    () => ({
      direction_title: "Lock a 30-day Direction first",
      milestones: [
        { title: "Milestone 1: Define outcome + constraints", due_day: 3 },
        { title: "Milestone 2: Build the first working version", due_day: 10 },
        { title: "Milestone 3: Make it usable end-to-end", due_day: 20 },
        { title: "Milestone 4: Polish + ship to users", due_day: 30 },
      ],
      week1_goal: "Week 1: Get momentum — finish the first end-to-end draft",
      week_tasks: [
        { title: "Write the 30-day success criteria (what ‘done’ means)", done: false },
        { title: "Break the goal into 3–5 milestones (no more)", done: false },
        { title: "Pick the first milestone and define Week 1 outcome", done: false },
        { title: "Choose the single Next Up action", done: false },
      ],
      next_up: { title: "Write 5 bullets: what ‘success’ looks like in 30 days", est_minutes: 12 },
      generated_at: new Date().toISOString(),
    }),
    []
  );

  const [plan, setPlan] = useState<ActionPlanV1 | null>(placeholderPlan);
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    async function loadPlan() {
      try {
        const base = process.env.NEXT_PUBLIC_API_BASE;
        if (!base) return;

        const res = await fetch(`${base}/memory/action_plan`);
        const data = await res.json().catch(() => ({}));
        if (data?.plan) {
          setPlan(data.plan);
        }
      } catch {
        // silent fail for now
      }
    }

    loadPlan();
  }, []);

  async function toggleWeekTask(i: number) {
    if (!plan) return;

    const task = plan.week_tasks[i];
    if (!task) return;

    // Optimistic UI update
    setPlan((prev) => {
      if (!prev) return prev;
      const copy = { ...prev };
      copy.week_tasks = prev.week_tasks.map((t, idx) =>
        idx === i ? { ...t, done: !t.done } : t
      );
      return copy;
    });

    try {
      const base = process.env.NEXT_PUBLIC_API_BASE;
      if (!base) return;

      const res = await fetch(`${base}/memory/action_plan/task`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          index: i,
          done: !task.done,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to save task");
      }
    } catch (e) {
      // rollback on failure
      setPlan((prev) => {
        if (!prev) return prev;
        const copy = { ...prev };
        copy.week_tasks = prev.week_tasks.map((t, idx) =>
          idx === i ? { ...t, done: task.done } : t
        );
        return copy;
      });
      alert("Could not save task. Try again.");
    }
  }

  async function generateManual() {
    setIsGenerating(true);
    setStatus("");
    try {
      const base = process.env.NEXT_PUBLIC_API_BASE;
      if (!base) {
        setStatus("Missing NEXT_PUBLIC_API_BASE");
        return;
      }

      const postRes = await fetch(`${base}/memory/action_plan/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });

      const postData = await postRes.json().catch(() => ({}));

      if (!postRes.ok) {
        setStatus(`Generate failed: HTTP ${postRes.status}`);
        return;
      }
      if (!postData?.ok) {
        setStatus(postData?.error || "Generate failed");
        return;
      }

      // ✅ Pull the saved plan from GET so UI always matches DB
      const getRes = await fetch(`${base}/memory/action_plan`);
      const getData = await getRes.json().catch(() => ({}));
      if (getData?.plan) setPlan(getData.plan);

      setStatus("✅ Action Plan generated");
      setTimeout(() => setStatus(""), 2000);
    } catch (e: any) {
      setStatus(e?.message || String(e));
    } finally {
      setIsGenerating(false);
    }
  }

  // ✅ derived value: plan exists if milestones exist
  const hasPlan = (plan?.milestones?.length || 0) > 0;

  // ✅ REPLACED RETURN BLOCK (ONLY)
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Title row */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xl font-semibold text-zinc-100">Action Plan</div>
          <p className="mt-1 text-sm text-zinc-400 leading-relaxed">
            Action Plan is the{" "}
            <span className="text-zinc-200 font-medium">HOW</span>. It turns your
            locked Direction into milestones + weekly tasks, with one clear{" "}
            <span className="text-zinc-200 font-medium">Next Up</span>.
          </p>
        </div>

        <button
          onClick={() => router.push("/direction")}
          className="shrink-0 rounded-2xl px-4 py-2 text-sm font-medium bg-white/5 hover:bg-white/8 border border-white/10 text-zinc-100 hover:bg-white/10"
        >
          Go to Direction
        </button>
      </div>

      {/* Next Up (hero) */}
       <div className="mt-6 rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-400/10 via-white/5 to-white/5 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
           <span className="text-amber-300">⚡</span>
          </div>
          <div className="text-xs text-zinc-400">
            {plan?.next_up?.est_minutes ? `~${plan.next_up.est_minutes} min` : ""}
          </div>
        </div>

        <div className="mt-2 text-sm text-zinc-100">
          {plan?.next_up?.title || "Generate an Action Plan to see your next action."}
        </div>

        <div className="mt-2 text-xs text-zinc-500">
          One next action only. If Nova gives you 10 steps, it’s wrong.
        </div>
      </div>

      {/* Milestones */}
      <div className="mt-6 rounded-2xl border border-white/10 bg-transparent p-0">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <span className="text-zinc-200">🎯</span> Milestones
        </div>

        <div className="mt-3 grid gap-2">
          {(plan?.milestones || []).map((m, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 px-4 py-3 flex items-center justify-between gap-3"
            >
              <div className="text-sm text-zinc-100">
                <span className="text-zinc-500 mr-2">#{idx + 1}</span>
                {m.title}
              </div>
              {typeof (m as any).due_day === "number" ? (
                <div className="text-xs text-zinc-400 shrink-0">
                  Day {(m as any).due_day}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {/* Week 1 */}
      <div className="mt-10 rounded-2xl border border-white/10 bg-transparent p-0">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <span className="text-zinc-200">📅</span> Week 1
        </div>
        <div className="mt-1 text-xs text-zinc-400">One weekly outcome + 3–5 tasks.</div>

        <div className="mt-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 px-4 py-3">
          <div className="text-xs text-zinc-400">Week 1 goal</div>
          <div className="mt-1 text-sm text-zinc-100">
            {plan?.week1_goal || "—"}
          </div>
        </div>

        <div className="mt-3 grid gap-2">
          {(plan?.week_tasks || []).map((t, idx) => (
            <label
              key={idx}
              className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 px-4 py-3 flex items-center gap-3 cursor-pointer"
            >
              <input
                type="checkbox"
                className="h-4 w-4 accent-zinc-200"
                checked={!!t.done}
                onChange={() => toggleWeekTask(idx)}
              />
              <span
                className={
                  t.done
                    ? "text-sm text-zinc-400 line-through"
                    : "text-sm text-zinc-100"
                }
              >
                {t.title}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Buttons */}
      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={generateManual}
          disabled={isGenerating}
          className="rounded-2xl px-4 py-2 text-sm font-medium bg-white/10 border border-white/10 text-zinc-100 hover:bg-white/15 disabled:opacity-60"
        >
          {isGenerating ? "Generating..." : (hasPlan ? "Regenerate Action Plan" : "Generate Action Plan")}
        </button>

        <button
          onClick={() => router.push("/direction")}
          className="rounded-2xl px-4 py-2 text-sm font-medium bg-transparent border border-white/10 text-zinc-100 hover:bg-white/5"
        >
          Edit Direction
        </button>
      </div>

      {/* Status */}
      {typeof status === "string" && status ? (
        <div className="mt-3 text-xs text-zinc-400">✅ {status}</div>
      ) : null}
    </div>
  );
}
