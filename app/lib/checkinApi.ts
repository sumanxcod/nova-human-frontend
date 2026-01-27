import { apiGet, apiPost } from "./api";

export const fetchTodayCheckin = () => apiGet("/memory/checkin/today");
export const saveTodayCheckin = (body: any) => apiPost("/memory/checkin/today", body);
export const fetchCheckinHistory = () => apiGet("/memory/checkin/history");
export const fetchEscalationLevels = () => apiGet("/memory/checkin/escalation-levels");