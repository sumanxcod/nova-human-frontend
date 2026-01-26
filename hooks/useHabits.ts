"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchHabits, toggleHabit, setHabitEffort, type Habit } from "../app/lib/habitsApi";


function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);

  const today = todayKey();

  async function refresh() {
    setLoading(true);
    try {
      const h = await fetchHabits();
      setHabits(h);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const stats = useMemo(() => {
    const total = habits.length;
    const done = habits.reduce((acc, h) => acc + (h.days?.[today] ? 1 : 0), 0);
    return { total, done, today };
  }, [habits, today]);

  async function setHabitValue(habit: { id: string; name: string }, value: 0 | 1) {
    // optimistic UI
    setHabits((prev) =>
      prev.map((h) =>
        h.id === habit.id
          ? { ...h, days: { ...(h.days || {}), [today]: value } }
          : h
      )
    );

    try {
      await toggleHabit({
        habit_id: habit.id,
        habit_name: habit.name,
        value,
      });
    } catch (e) {
      // if backend fails, refresh from source of truth
      await refresh();
      throw e;
    }
  }

  return { habits, loading, refresh, stats, setHabitValue };
}
