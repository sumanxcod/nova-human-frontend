"use client";

import { useEffect, useState } from "react";
import { apiGet } from "./../../lib/api";

type Msg = { role: "user" | "assistant"; content: string; ts?: string };

type Props = {
  params: Promise<{ day: string }>;
};

export default async function HistoryDayPage({ params }: Props) {
  const { day } = await params;
  
  return (
    <HistoryDayContent day={day} />
  );
}

function HistoryDayContent({ day }: { day: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiGet<Msg[]>(`/memory/history/${day}`);
        setMessages(Array.isArray(data) ? data : []);
      } catch {
        setErr("Couldn't load day history.");
      }
    })();
  }, [day]);

  return (
    <div className="h-full overflow-hidden flex flex-col">
      <div className="shrink-0 px-6 py-4 border-b border-white/10 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">{day}</h1>
          <p className="text-xs text-zinc-400 mt-1">Read-only history</p>
        </div>
        <a href="/history" className="text-sm text-zinc-300 hover:underline">
          Back
        </a>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-3">
        {err && <div className="text-sm text-red-400">{err}</div>}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={[
                "max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap",
                m.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gradient-to-r from-amber-400/80 to-amber-300/80 text-zinc-900 hover:bg-amber-400/90",
                  "hover:opacity-95"
              ].join(" ")}
            >
              {m.content}
            </div>
          </div>
        ))}
        {messages.length === 0 && !err && (
          <div className="text-sm text-emerald-300/80 line-through">No messages for this day.</div>
        )}
      </div>
    </div>
  );
}
