import { apiGet, apiPost } from "./api";

export type Habit = {
  id: string;
  name: string;
  days?: Record<string, 0 | 1>;
  effort?: Record<string, number>; // 1..5
};

export async function fetchHabits(): Promise<Habit[]> {
  const res = await apiGet<any>("/memory/habits");

  // HARD GUARANTEE: always return an array
  if (Array.isArray(res)) return res as Habit[];
  if (Array.isArray(res?.habits)) return res.habits as Habit[];

  return [];
}

export async function toggleHabit(payload: {
  habit_id: string;
  habit_name: string;
  value: 0 | 1;
}): Promise<{ ok: boolean }> {
  return apiPost("/memory/habits/toggle", payload);
}

export async function setHabitEffort(payload: {
  habit_id: string;
  day: string;
  effort: 1 | 2 | 3 | 4 | 5;
}): Promise<{ ok: boolean }> {
  return apiPost("/memory/habits/effort", payload);
}
