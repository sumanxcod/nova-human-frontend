"use client";


import { useHabits } from "@/hooks/useHabits";
import { useRouter } from "next/navigation";

export default function HabitsPage() {
  const { habits, loading, stats, setHabitValue } = useHabits();
  const router = useRouter();

  const onGenerateFromDirection = () => {
    router.push("/habits/new?mode=direction");
  };

  const onAddSupportingHabit = () => {
    router.push("/habits/new");
  };

  if (loading) {
    return <div className="p-6 text-sm opacity-70">Loading habits…</div>;
  }

  // Empty state
  if (habits.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="text-lg font-semibold text-zinc-100">Habits (Support System)</div>

          <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
            Habits reduce cognitive effort in service of your Direction. Add only what supports follow-through.
          </p>

          <div className="mt-5 flex flex-col sm:flex-row gap-2">
            <button
              onClick={onGenerateFromDirection}
              className="rounded-2xl px-4 py-3 text-sm font-medium bg-zinc-100 text-zinc-900 hover:opacity-95"
            >
              Generate from Direction
            </button>

            <button
              onClick={onAddSupportingHabit}
              className="rounded-2xl px-4 py-3 text-sm font-medium bg-white/5 border border-white/10 text-zinc-100 hover:bg-white/10"
            >
              Add Supporting Habit
            </button>
          </div>

          <div className="mt-4 text-[11px] text-zinc-500">
            Nova tracks "automaticity" (effort) instead of streaks.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Habits</h1>
        <p className="text-sm opacity-70">
          Today: {stats.done}/{stats.total} completed
        </p>
      </div>

      <div className="space-y-2">
        {habits.map((h) => {
          const doneToday = !!h.days?.[stats.today];
          return (
            <button
              key={h.id}
              onClick={() => setHabitValue({ id: h.id, name: h.name }, doneToday ? 0 : 1)}
              className="w-full flex items-center justify-between rounded-2xl border px-4 py-3 text-left hover:bg-white/5"
            >
              <span className="text-sm">{h.name}</span>
              <span className={`text-xs ${doneToday ? "opacity-100" : "opacity-50"}`}>
                {doneToday ? "Done" : "Not yet"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
