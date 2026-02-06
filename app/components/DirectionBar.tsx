"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet } from "../lib/api";

/* ------------------ Types ------------------ */
type Direction = {
  title: string;
  why: string;
  duration_days: number;
  start_date?: string | null;
  end_date?: string | null;
  locked: boolean;
};

type DirectionResponse = {
  direction: Direction | null;
};

/* ------------------ Safe helpers ------------------ */
function safeInt(n: any, fallback = 0) {
  const x = typeof n === "number" ? n : Number(n);
  return Number.isFinite(x) ? x : fallback;
}

function parseISODate(s?: string | null) {
  if (!s) return null;
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d : null;
}

function daysBetween(a: Date, b: Date) {
  const ms = 24 * 60 * 60 * 1000;
  return Math.ceil((b.getTime() - a.getTime()) / ms);
}

/* ------------------ Component ------------------ */
export default function DirectionBar() {
  const [direction, setDirection] = useState<Direction | null>(null);

  useEffect(() => {
    apiGet("/memory/direction")
      .then((res) => setDirection((res as DirectionResponse).direction ?? null))
      .catch(() => setDirection(null));
  }, []);

  const left = useMemo(() => {
    if (!direction) return 0;

    const duration = safeInt(direction.duration_days, 30);
    const start = parseISODate(direction.start_date);
    const end = parseISODate(direction.end_date);

    let daysLeft = duration;

    if (direction.locked && start && end) {
      const today = new Date();
      daysLeft = Math.max(0, daysBetween(today, end));
    } else {
      daysLeft = Math.max(0, duration);
    }

    return daysLeft;
  }, [direction]);

  if (!direction) return null;

  return (
    <div className="border-b border-zinc-800 bg-zinc-950/60">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-zinc-400">
            Current Direction {direction.locked ? "(locked)" : ""}
          </div>
          <div className="text-sm font-semibold mt-1">
            {direction.title}
          </div>
          <div className="text-xs text-zinc-400 mt-1 line-clamp-1">
            {direction.why}
          </div>
        </div>

        <div className="text-right">
          <div className="text-[11px] text-zinc-400">Days left</div>
          <div className="text-xl font-semibold">{String(left)}</div>
        </div>
      </div>
    </div>
  );
}
