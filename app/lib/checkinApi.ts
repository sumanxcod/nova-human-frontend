import { apiGet } from "./api";

export type TodayCheckin = {
  date: string;
  checkin: null | {
    date: string;
    moved_forward: boolean;
    today_action: string;
    note?: string;
  };
  escalation_level: number;
  tone: string;
};

export async function fetchTodayCheckin() {
  return apiGet<TodayCheckin>("/memory/checkin/today");
}
