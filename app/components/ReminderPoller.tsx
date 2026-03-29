"use client";

import { useEffect, useRef, useState } from "react";
import { apiGet } from "../lib/api";

const POLL_INTERVAL_MS = 30_000;
const TOAST_DURATION_MS = 10_000;
const SEEN_STORAGE_KEY = "nova_reminder_seen_v1";

type DueReminder = {
  id: number | string;
  text: string;
  due_at?: string;
};

type DueResponse = { due?: DueReminder[] };

type Toast = {
  id: string;
  text: string;
};

function canNotify(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export default function ReminderPoller() {
  const intervalRef = useRef<number | null>(null);
  const runningRef = useRef(false);

  // Deduplicate to prevent repeat toasts/notifications if backend keeps returning the same items.
  const lastSeenRef = useRef<Map<string, number>>(new Map());

  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeoutsRef = useRef<Map<string, number>>(new Map());

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const handle = timeoutsRef.current.get(id);
    if (handle) window.clearTimeout(handle);
    timeoutsRef.current.delete(id);
  };

  const addToast = (reminder: DueReminder) => {
    const id = String(reminder.id);
    const text = String(reminder.text ?? "").trim();
    if (!id || !text) return;

    // Don't stack the same reminder toast multiple times.
    setToasts((prev) => {
      if (prev.some((t) => t.id === id)) return prev;
      return [...prev, { id, text }];
    });

    if (timeoutsRef.current.has(id)) return;
    const handle = window.setTimeout(() => removeToast(id), TOAST_DURATION_MS);
    timeoutsRef.current.set(id, handle);
  };

  useEffect(() => {
    // Seed dedupe cache from localStorage so refreshes don't spam reminders.
    try {
      const raw = localStorage.getItem(SEEN_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, number>;
        for (const [k, v] of Object.entries(parsed)) {
          if (typeof v === "number" && Number.isFinite(v)) lastSeenRef.current.set(k, v);
        }
      }
    } catch {
      // ignore
    }

    if (canNotify() && Notification.permission === "default") {
      void Notification.requestPermission();
    }

    const checkReminders = async () => {
      if (runningRef.current) return;
      runningRef.current = true;

      try {
        const data = (await apiGet<DueResponse>("/reminders/due")) || {};
        const due = Array.isArray(data.due) ? data.due : [];
        if (!due.length) return;

        const now = Date.now();
        // Dedupe window: allow re-notify after 10 minutes.
        const DEDUPE_WINDOW_MS = 10 * 60_000;

        for (const r of due) {
          const id = String(r?.id ?? "");
          const text = String(r?.text ?? "").trim();
          if (!id || !text) continue;

          const lastSeen = lastSeenRef.current.get(id) || 0;
          if (now - lastSeen < DEDUPE_WINDOW_MS) continue;
          lastSeenRef.current.set(id, now);

          // Persist for refresh resilience.
          try {
            const obj: Record<string, number> = {};
            for (const [k, v] of lastSeenRef.current.entries()) obj[k] = v;
            localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(obj));
          } catch {
            // ignore
          }

          addToast({ id, text, due_at: r?.due_at });

          if (canNotify() && Notification.permission === "granted") {
            new Notification("Nova Reminder", {
              body: text,
              icon: "/favicon.ico",
              tag: `reminder-${id}`,
              requireInteraction: true,
            });
          }
        }
      } catch {
        // Silently fail — don't spam console.
      } finally {
        runningRef.current = false;
      }
    };

    void checkReminders();
    intervalRef.current = window.setInterval(checkReminders, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      for (const handle of timeoutsRef.current.values()) window.clearTimeout(handle);
      timeoutsRef.current.clear();
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-slide-in flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-zinc-100 shadow-lg min-w-[300px] max-w-[400px] backdrop-blur"
        >
          <div className="h-8 w-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs text-zinc-300 flex-shrink-0">
            N
          </div>
          <div className="flex-1">
            <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wide mb-1">Reminder</p>
            <p className="text-sm text-zinc-100">{t.text}</p>
          </div>
          <button
            onClick={() => removeToast(t.id)}
            className="text-zinc-400 hover:text-zinc-200 text-lg leading-none flex-shrink-0"
            aria-label="Dismiss reminder"
            type="button"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

