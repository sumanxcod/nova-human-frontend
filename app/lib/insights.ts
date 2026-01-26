type Habit = { id: string; name: string; days: Record<string, number> };
type Mood = "happy" | "neutral" | "anxious" | "angry" | "sad";
type MoodEntry = { date: string; mood: Mood };

function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return todayKey(d);
}

function countHabitsDoneOnDate(habits: Habit[], date: string) {
  return habits.filter((h) => (h.days?.[date] ?? 0) > 0).length;
}

function getMoodOnDate(moods: MoodEntry[], date: string): Mood | null {
  return moods.find((m) => m.date === date)?.mood ?? null;
}

function moodRun(moods: MoodEntry[], mood: Mood, maxDays = 14) {
  // consecutive days ending today that match mood
  let run = 0;
  for (let i = 0; i < maxDays; i++) {
    const d = daysAgo(i);
    const m = getMoodOnDate(moods, d);
    if (m === mood) run++;
    else break;
  }
  return run;
}

export type Insight = {
  title: string;
  body: string;
  type: "good" | "warn" | "neutral";
  cta?: { label: string; messageToChat: string };
};

export function generateInsights(habits: Habit[], moods: MoodEntry[]): Insight[] {
  const insights: Insight[] = [];
  const today = todayKey();

  const totalHabits = habits.length;
  const doneToday = countHabitsDoneOnDate(habits, today);

  const moodToday = getMoodOnDate(moods, today);

  // 1) If anxious streak
  const anxiousStreak = moodRun(moods, "anxious", 10);
  if (anxiousStreak >= 3) {
    insights.push({
      title: "You’ve been anxious for a few days",
      body: `I noticed “anxious” for ${anxiousStreak} days in a row. Want to talk about what’s causing it?`,
      type: "warn",
      cta: { label: "Talk to Nova", messageToChat: "I’ve been feeling anxious lately. Help me unpack it." },
    });
  }

  // 2) Habits low today
  if (totalHabits > 0 && doneToday === 0) {
    insights.push({
      title: "No habits completed yet today",
      body: "Want a 5-minute win? Pick one habit and do the smallest possible version right now.",
      type: "neutral",
      cta: { label: "Plan my next step", messageToChat: "I did 0 habits today. Give me one tiny step I can do in 5 minutes." },
    });
  }

  // 3) Habits strong today
  if (totalHabits > 0 && doneToday >= Math.max(1, Math.ceil(totalHabits * 0.6))) {
    insights.push({
      title: "Strong day",
      body: `You’ve completed ${doneToday}/${totalHabits} habits today. Keep momentum—one more small action will lock the win.`,
      type: "good",
      cta: { label: "Ask Nova for a boost", messageToChat: "I’m doing well today. Give me one more small action to finish strong." },
    });
  }

  // 4) Mood missing
  if (!moodToday) {
    insights.push({
      title: "No check-in today",
      body: "Your mood data helps Nova support you better. Do a quick check-in?",
      type: "neutral",
    });
  }

  // 5) Mood + habits correlation (simple heuristic)
  // Compare last 7 days: average habits on “happy” days vs “anxious/sad” days
  const last7 = Array.from({ length: 7 }, (_, i) => daysAgo(i));
  const happyDays: number[] = [];
  const lowDays: number[] = [];

  for (const d of last7) {
    const m = getMoodOnDate(moods, d);
    const c = countHabitsDoneOnDate(habits, d);
    if (m === "happy") happyDays.push(c);
    if (m === "anxious" || m === "sad") lowDays.push(c);
  }

  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
  const happyAvg = avg(happyDays);
  const lowAvg = avg(lowDays);

  if (happyAvg !== null && lowAvg !== null && happyAvg >= lowAvg + 1) {
    insights.push({
      title: "Habits seem to lift your mood",
      body: `In the last 7 days, you did more habits on “happy” days than on “anxious/sad” days. When your mood dips, a tiny habit might help.`,
      type: "good",
      cta: { label: "Make a rescue plan", messageToChat: "When I feel low/anxious, what is a simple rescue routine I can do in 10 minutes?" },
    });
  }

  // If nothing else
  if (insights.length === 0) {
    insights.push({
      title: "You’re steady",
      body: "Keep it simple: check in once, complete one habit, and talk when you feel stuck.",
      type: "neutral",
    });
  }

  return insights.slice(0, 3); // keep it calm (max 3)
}
