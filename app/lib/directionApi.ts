import { apiGet, apiPost } from "./api";

export function fetchDirection() {
  return apiGet("/memory/direction");
}

export function saveDirectionDraft(body: any) {
  return apiPost("/memory/direction/draft", body);
}

export function lockDirection(body: any) {
  return apiPost("/memory/direction/lock", body);
}

export function finalizeDirection() {
  return apiPost("/memory/direction/finalize", {});
}

export function setTodayStep(body: any) {
  return apiPost("/memory/direction/today_step", body);
}

export function doneTodayStep() {
  return apiPost("/memory/direction/today_step/done", {});
}
