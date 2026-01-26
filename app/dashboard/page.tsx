"use client";

import { useEffect, useMemo, useState } from "react";
import { generateInsights } from "../lib/insights";
// ---- types ----
type Habit = {
  id: string;
  name: string;
  days: Record<string, number>;
};

type Mood = "happy" | "neutral" | "anxious" | "angry" | "sad";

type MoodEntry = {
  date: string;
  mood: Mood;
};

// ---- storage keys ----
const HABITS_KEY = "nova_habits_v1";
const MOOD_KEY = "nova_mood_v1";

// ---- helpers ----
function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function lastNDays(n: number) {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    out.push(todayKey(d));
  }
  return out;
}

function loadJSON<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

const MOOD_COLOR: Record<Mood, string> = {
  happy: "bg-emerald-500/70",
  neutral: "bg-zinc-500/70",
  anxious: "bg-yellow-500/70",
  angry: "bg-red-500/70",
  sad: "bg-blue-500/70",
};

// ---- page ----
export default function DashboardPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [moods, setMoods] = useState<MoodEntry[]>([]);

  const today = todayKey();

  useEffect(() => {
    setHabits(loadJSON<Habit>(HABITS_KEY));
    setMoods(loadJSON<MoodEntry>(MOOD_KEY));
  }, []);

  // ---- computed ----
  const habitsDoneToday = habits.filter((h) => (h.days[today] ?? 0) > 0).length;
  const todayMood = moods.find((m) => m.date === today)?.mood;

  const days14 = useMemo(() => lastNDays(14), []);
  const moodCount = useMemo(() => {
    const map: Record<Mood, number> = {
      happy: 0,
      neutral: 0,
      anxious: 0,
      angry: 0,
      sad: 0,
    };
    for (const m of moods) map[m.mood]++;
    return map;
  }, [moods]);

  // ✅ THIS WAS MISSING IN YOUR CODE:
  const insights = useMemo(() => generateInsights(habits, moods), [habits, moods]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Overview of your habits and mood
        </p>

        {/* Today summary */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card title="Habits today">
            <div className="text-3xl font-semibold">
              {habitsDoneToday}/{habits.length || 0}
            </div>
            <div className="text-xs text-zinc-400 mt-1">completed</div>
          </Card>

          <Card title="Today's mood">
            {todayMood ? (
              <div className="flex items-center gap-3">
                <div className={`h-4 w-4 rounded ${MOOD_COLOR[todayMood]}`} />
                <div className="capitalize text-lg">{todayMood}</div>
              </div>
            ) : (
              <div className="text-sm text-zinc-400">Not checked in yet</div>
            )}
          </Card>

          <Card title="Today’s focus">
            <div className="text-sm text-zinc-300">
              Do one tiny habit and one honest check-in. Consistency beats intensity.
            </div>
          </Card>
        </div>

        {/* ✅ AI Insights (correct location) */}
        <div className="mt-10">
          <h2 className="text-lg font-medium mb-3">Nova Insights</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {insights.map((ins, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5"
              >
                <div className="text-sm text-zinc-400 mb-2">
                  {ins.type === "good"
                    ? "✅ Positive"
                    : ins.type === "warn"
                    ? "⚠️ Attention"
                    : "💡 Suggestion"}
                </div>

                <div className="text-base font-medium">{ins.title}</div>
                <div className="mt-2 text-sm text-zinc-300">{ins.body}</div>

                {ins.cta && (
                  <a
                    className="inline-block mt-4 rounded-xl px-4 py-2 text-sm font-medium bg-zinc-100 text-zinc-900"
                    href={`/?prefill=${encodeURIComponent(ins.cta.messageToChat)}`}
                  >
                    {ins.cta.label}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Habit mini heatmap */}
        <div className="mt-10">
          <h2 className="text-lg font-medium mb-3">
            Habit activity (last 14 days)
          </h2>
          <div className="grid grid-cols-14 gap-1">
            {days14.map((d) => {
              const count = habits.filter((h) => (h.days[d] ?? 0) > 0).length;
              return (
                <div
                  key={d}
                  title={`${d} • ${count} habits`}
                  className={`h-3 w-3 rounded border ${
                    count
                      ? "bg-emerald-500/70 border-emerald-500/30"
                      : "bg-zinc-900 border-zinc-800"
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Mood distribution */}
        <div className="mt-10">
          <h2 className="text-lg font-medium mb-3">
            Mood distribution
          </h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(moodCount).map(([mood, count]) => (
              <div
                key={mood}
                className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm"
              >
                <div className="capitalize">{mood}</div>
                <div className="text-xl font-semibold">{count}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 text-xs text-zinc-500">
          Next: backend memory + saving these insights per day.
        </div>
      </div>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
      <div className="text-sm text-zinc-400 mb-2">{title}</div>
      {children}
    </div>
  );
}
