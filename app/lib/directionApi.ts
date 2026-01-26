// lib/directionApi.ts
import { apiGet, apiPost } from "./api";

/** Core types */
export type Direction = {
  title: string;
  why: string;
  duration_days: number;
  start_date: string; // ISO date
  end_date: string;   // ISO date
  locked: boolean;
};

export type TodayStep = {
  text: string;
  estimate_min: number;
  done: boolean;
  date: string; // ISO date
};

/**
 * One stable response type you can use everywhere in the UI.
 * (Matches your "future-proof" idea.)
 */
export type DirectionResponse = {
  direction: Direction | null;
  today_step?: TodayStep | null;
  metric_progress?: number;
  // If you later add more fields, add them here once.
};

/** GET direction (and any optional extras if backend returns them) */
export function fetchDirection() {
  return apiGet<DirectionResponse>("/memory/direction");
}

/** Save draft (typed body, predictable response) */
export function saveDirectionDraft(body: Pick<Direction, "title" | "why" | "duration_days">) {
  return apiPost<DirectionResponse>("/memory/direction/draft", body);
}

/** Lock direction (optional duration override, predictable response) */
export function lockDirection(body?: { duration_days?: number }) {
  return apiPost<DirectionResponse>("/memory/direction/lock", body ?? {});
}

/**
 * Finalize direction.
 * If your backend returns DirectionResponse, keep it as-is.
 * If it returns something else, change the generic type here to match.
 */
export function finalizeDirection() {
  return apiPost<DirectionResponse>("/memory/direction/finalize", {});
}

/** Metric progress helpers */
export function addDirectionProgress(delta: number) {
  return apiPost<{ metric_progress: number }>(
    "/memory/direction/progress/add",
    { delta }
  );
}

export function resetDirectionProgress() {
  return apiPost<{ metric_progress: number }>(
    "/memory/direction/progress/reset",
    {}
  );
}

/** Today step (typed body + typed return) */
export function setTodayStep(body: Pick<TodayStep, "text" | "estimate_min">) {
  return apiPost<{ today_step: TodayStep }>(
    "/memory/direction/today_step",
    body
  );
}

export function doneTodayStep() {
  return apiPost<{ today_step: TodayStep }>(
    "/memory/direction/today_step/done",
    {}
  );
}
