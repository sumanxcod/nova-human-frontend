import { apiGet, apiPost } from "./api";

export const fetchDirection = () => apiGet("/memory/direction");
export const saveDirectionDraft = (body: any) => apiPost("/memory/direction/draft", body);
export const lockDirection = (body: any) => apiPost("/memory/direction/lock", body);
export const finalizeDirection = () => apiPost("/memory/direction/finalize", {});
export const setTodayStep = (body: any) => apiPost("/memory/direction/today_step", body);
export const doneTodayStep = () => apiPost("/memory/direction/today_step/done", {});
export async function addDirectionProgress(delta: number) {
  return apiPost<{ metric_progress: number }>(
    "/memory/direction/progress/add",
    { delta }
  );
}
