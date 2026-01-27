import { apiGet, apiPost } from "./api";

export function fetchTodayCheckin() {
  return apiGet("/memory/checkin/today");
}

export function saveTodayCheckin(body: any) {
  return apiPost("/memory/checkin/today", body);
}
