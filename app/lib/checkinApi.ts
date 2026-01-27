import { apiGet, apiPost } from "./api";

export function fetchTodayCheckin() {
  return apiGet("/memory/checkin/today");
}

export function saveTodayCheckin(body: {
  moved_forward: number;
  today_action: string;
  note?: string;
}) {
  return apiPost("/memory/checkin/today", body);
}
