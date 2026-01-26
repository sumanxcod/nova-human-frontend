export type Direction = {
  title: string;
  why: string;
  duration_days: number;
  start_date: string;   // ISO
  end_date: string;     // ISO
  locked: boolean;
};

export type DirectionUIState =
  | "empty"          // no direction exists
  | "draft"          // user is writing setup
  | "locked";        // committed

export function getDirectionState(d: Direction | null): DirectionUIState {
  if (!d) return "empty";
  return d.locked ? "locked" : "draft";
}

export function canEditSetup(d: Direction | null) {
  return !d || !d.locked;
}

export function daysLeft(d: Direction) {
  const end = new Date(d.end_date).getTime();
  const now = Date.now();
  const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

export function lockLabel(d: Direction) {
  return d.locked ? "Locked" : "Not locked";
}
