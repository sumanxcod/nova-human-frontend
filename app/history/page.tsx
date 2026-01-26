"use client";

import { useEffect, useState } from "react";
import { apiGet } from "./../lib/api";

type HistoryItem = {
  id: string;        // YYYY-MM-DD
  title: string;
  last: string;
  updated_at: string;
  count: number;
};

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiGet<HistoryItem[]>("/memory/history");
        setItems(Array.isArray(data) ? data : []);
      } catch {
        setErr("Couldn’t load history. Is backend running on https://nova-human-backend.onrender.com");
      }
    })();
  }, []);

  return (
    <div className="h-full overflow-hidden flex flex-col">
      <div className="shrink-0 px-6 py-4 border-b border-white/10">
        <h1 className="text-lg font-semibold">History</h1>
        <p className="text-xs text-zinc-400 mt-1">Chats grouped by day.</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {err && <div className="text-sm text-red-400 mb-4">{err}</div>}

        <div className="space-y-3">
          {items.map((it) => (
            <a
              key={it.id}
              href={`/history/${it.id}`}
              className="block rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 p-4"
            >
              <div className="flex items-center justify-between">
                <div className="font-medium">{it.title}</div>
                <div className="text-xs text-zinc-400">{it.count} msgs</div>
              </div>
              <div className="text-xs text-zinc-400 mt-2 line-clamp-2">
                {it.last || "—"}
              </div>
              <div className="text-[11px] text-zinc-500 mt-2">{it.id}</div>
            </a>
          ))}

          {items.length === 0 && !err && (
            <div className="text-sm text-zinc-400">No history yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
