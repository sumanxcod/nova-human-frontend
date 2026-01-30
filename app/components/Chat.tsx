"use client";

import { useEffect, useRef, useState } from "react";
import { apiGet, apiPost } from "../lib/api";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchTodayCheckin } from "../lib/checkinApi";
import { fetchDirection } from "../lib/directionApi";

export type Msg = {
  role: "user" | "assistant";
  content: string;
  ts?: string;
};

type DirectionResponse = {
  title?: string;
  direction?: {
    title?: string;
  };
};

type CheckinResponse = {
  tone?: string;
  today_action?: string;
  checkin?: {
    today_action?: string;
  };
};

// --------------------
// ✅ Helpers (Response Contract + Category Hint)
// --------------------
function detectCategory(text: string) {
  const t = text.toLowerCase();

  if (
    t.includes("dropship") ||
    t.includes("shopify") ||
    t.includes("supplier") ||
    t.includes("ads")
  )
    return "business_dropshipping";

  if (
    t.includes("resume") ||
    t.includes("cv") ||
    t.includes("interview") ||
    t.includes("job") ||
    t.includes("apply")
  )
    return "career_job";

  if (
    t.includes("youtube") ||
    t.includes("channel") ||
    t.includes("video") ||
    t.includes("subscribers")
  )
    return "creator_youtube";

  if (
    t.includes("anxious") ||
    t.includes("depressed") ||
    t.includes("panic") ||
    t.includes("stress") ||
    t.includes("sleep")
  )
    return "mental_health";

  if (
    t.includes("focus") ||
    t.includes("procrast") ||
    t.includes("stuck") ||
    t.includes("discipline")
  )
   return "clarity_focus";

  return "general";
}

function responseContract(category: string) {
  return `
Output format:
1) One-line reflection of the user's situation.
2) Ask ONE clarifying question OR give A/B/C choices (not both).
3) Provide a mini plan (max 3 steps).
4) End with: "Your next step: ____" (one concrete action).

Category guidance:
- business_dropshipping: ask about budget, niche, traffic source; give safe, legal steps; avoid unrealistic claims.
- career_job: ask role + deadline; deliver tailored prep plan, resume bullets, interview practice.
- creator_youtube: ask niche + upload capacity; give content plan + first 3 videos.
- mental_health: be supportive; do not diagnose; suggest professional help if self-harm or crisis; give grounding + practical next step.
- clarity_focus: reduce overwhelm; shrink task; commit to 10-minute action.

Detected category: ${category}
`.trim();
}

// ✅ Nova system prompt (sent to backend)
const NOVA_SYSTEM = `
You are Nova Human: calm, direct, and practical.
Your job is to reduce confusion and convert talk into action.

Rules:
- Ask at most ONE clarifying question at a time.
- Give 1–3 steps max.
- End with ONE next action the user can do now.
- If user is overwhelmed, narrow to one choice (A/B/C).
- If mental/health concern: be supportive, recommend professional help when appropriate, do not diagnose.
- When direction context exists, align advice with it.
`.trim();

// ✅ Session helper
function newSid() {
  return `chat_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

// --------------------
// ✅ Backend-shape-safe parsers
// --------------------
function coerceMessages(input: any): Msg[] | null {
  if (!input) return null;

  const raw = Array.isArray(input)
    ? input
    : Array.isArray(input?.messages)
      ? input.messages
      : null;

  if (!raw) return null;

  const mapped: Msg[] = raw
    .map((m: any) => {
      const role = m?.role;
      const content = m?.content ?? m?.message ?? m?.text ?? "";
      if (
        (role !== "user" && role !== "assistant") ||
        typeof content !== "string"
      )
        return null;

      const c = content.trim();
      if (!c) return null;

      const ts = m?.ts ?? m?.created_at ?? null;
      return { role, content: c, ts: ts || undefined } as Msg;
    })
    .filter((m: any): m is Msg => Boolean(m && m.content && m.role)) as Msg[];

  return mapped.length ? mapped : null;
}

function extractAssistantText(res: any): string {
  if (!res) return "";

  const msgs = coerceMessages(res);
  if (msgs?.length) {
    const lastAssistant = [...msgs].reverse().find((m) => m.role === "assistant");
    if (lastAssistant?.content) return lastAssistant.content;
  }

  const s =
    res?.assistant_message ??
    res?.assistant_text ??
    res?.content ??
    res?.message ??
    res?.text ??
    "";

  if (typeof s === "string" && s.trim()) return s.trim();

  const a = res?.assistant;
  if (typeof a === "string" && a.trim()) return a.trim();
  if (
    typeof a === "object" &&
    a?.content &&
    typeof a.content === "string" &&
    a.content.trim()
  )
    return a.content.trim();

  const inner = res?.data;
  if (inner) return extractAssistantText(inner);

  if (typeof res === "string" && res.trim()) return res.trim();

  return "";
}

export default function Chat() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ✅ SID comes ONLY from URL (no auto create on mount)
  const sid = searchParams.get("sid") || "";

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Execution context state
  const [direction, setDirection] = useState<string | null>(null);
  const [todayAction, setTodayAction] = useState<string | null>(null);
  const [tone, setTone] = useState<string | null>(null);

  const didNudgeRef = useRef(false);
  const sendingRef = useRef(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollRef = useRef(true);

  // --------------------
  // ✅ Helper (inside component): wake + sleep
  // --------------------
  async function wakeBackendOnce() {
    try {
      await apiGet("/health");
      return true;
    } catch {
      return false;
    }
  }

  async function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  // --------------------
  // ✅ Load chat history with retry (sid-based)
  // --------------------
  useEffect(() => {
    if (!sid) return;

    let cancelled = false;

    async function loadChatWithRetry() {
      setErr(null);

      for (const delay of [0, 1500, 3500]) {
        if (delay) await sleep(delay);
        if (cancelled) return;

        try {
          await wakeBackendOnce();

          const data = await apiGet<any>(
            `/memory/chat?sid=${encodeURIComponent(sid)}`
          );
          const list = coerceMessages(data);

          if (cancelled) return;
          setMessages(list?.length ? list : []);
          setErr(null);
          return;
        } catch (e: any) {
          if (cancelled) return;
          setErr(
            delay === 3500 ? (e?.message || String(e)) : "Waking backend… retrying…"
          );
        }
      }
    }

    loadChatWithRetry();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sid]);

  // ---- Load direction + today checkin (execution header) ----
  useEffect(() => {
    (async () => {
      try {
        const d = (await fetchDirection()) as DirectionResponse;
        setDirection(d.title ?? d.direction?.title ?? null);
      } catch {}

      try {
        const c = (await fetchTodayCheckin()) as CheckinResponse;
        setTone(c.tone ?? null);
        setTodayAction(c.today_action ?? c.checkin?.today_action ?? null);
      } catch {}
    })();
  }, []);

  // Prefill from dashboard CTA (/?prefill=...)
  useEffect(() => {
    const prefill = searchParams.get("prefill");
    if (prefill) setInput(prefill);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Auto-scroll within message list (mobile = instant, desktop = smooth)
  useEffect(() => {
    if (!shouldAutoScrollRef.current) return;

    const isMobile =
      typeof window !== "undefined" &&
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    bottomRef.current?.scrollIntoView({
      behavior: isMobile ? "auto" : "smooth",
    });
  }, [messages, loading]);

  // --------------------
  // ✅ send(): create sid only on first real message
  // --------------------
  async function send() {
    const text = input.trim();
    if (!text) return; // 🔒 DO NOTHING if empty
    if (sendingRef.current) return; // 🔒 HARD LOCK

    sendingRef.current = true;
    setInput("");
    setLoading(true);
    setErr(null);

    let effectiveSid = sid;

    // ✅ create session ONLY when user sends first message
    if (!effectiveSid) {
      effectiveSid = newSid();
      router.replace(`/?sid=${encodeURIComponent(effectiveSid)}`);
    }

    // Optimistic UI
    setMessages((prev) => [...prev, { role: "user", content: text }]);

    try {
      const category = detectCategory(text);
      const contract = responseContract(category);

      const res: any = await apiPost("/memory/chat", {
        sid: effectiveSid,
        message: text,
        system: NOVA_SYSTEM + "\n\n" + contract,
        context: { direction, todayAction, tone, category },
      });

      const full = coerceMessages(res);
      if (full?.length) {
        setMessages(full);
      } else {
        const assistantText = extractAssistantText(res);

        setMessages((prev) => {
          const next: Msg[] = [
            ...prev,
            {
              role: "assistant",
              content:
                assistantText || "I’m here. What do you want to work on next?",
            },
          ];

          if (!didNudgeRef.current && (todayAction || direction)) {
            next.push({
              role: "assistant",
              content: todayAction
                ? `Quick anchor: your one action today is "${todayAction}". Want me to make it smaller?`
                : `Quick anchor: your direction is "${direction}". What’s the smallest next step today?`,
            });
            didNudgeRef.current = true;
          }

          return next;
        });
      }
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I couldn’t reach the backend. Please hit Retry or refresh the page.",
        },
      ]);
      setErr(e?.message || "Backend not reachable.");
    } finally {
      sendingRef.current = false;
      setLoading(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  async function clearChat() {
    try {
      if (!sid) return;
      await apiPost("/memory/chat/clear", { sid });
      setMessages([]);
      setErr(null);
      didNudgeRef.current = false;
    } catch (e: any) {
      setErr(e?.message || "Couldn’t clear backend memory.");
    }
  }

  return (
    <div className="flex flex-col h-full">
      <header className="shrink-0 border-b border-white/10 bg-black/40 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="font-semibold text-lg">Nova Human</div>

          {(direction || todayAction || tone) && (
            <div className="hidden md:flex items-center gap-4 text-xs text-zinc-400">
              {direction && (
                <span>
                  <span className="uppercase tracking-wide">Direction:</span>{" "}
                  <span className="text-zinc-200">{direction}</span>
                </span>
              )}
              {todayAction && (
                <span>
                  <span className="uppercase tracking-wide">Today:</span>{" "}
                  <span className="text-zinc-200">{todayAction}</span>
                </span>
              )}
              {!todayAction && tone && (
                <span>
                  <span className="uppercase tracking-wide">Mood:</span>{" "}
                  <span className="text-zinc-200">{tone}</span>
                </span>
              )}
            </div>
          )}

          <div className="text-sm text-zinc-400">
            Days left <span className="text-zinc-200 font-medium">30</span>
          </div>
        </div>
      </header>

      <main
        ref={scrollerRef}
        className="flex-1 overflow-y-auto"
        onScroll={() => {
          const el = scrollerRef.current;
          if (!el) return;
          const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
          shouldAutoScrollRef.current = distance < 160;
        }}
      >
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-2">
          {messages.length === 0 && !loading && (
            <div className="mt-24 text-center text-sm text-zinc-400">
              Say the problem you’re avoiding. We’ll work from there.
            </div>
          )}

          {messages
            .filter((m) => (m?.content ?? "").trim().length > 0)
            .map((m, i) => {
              const prev = messages[i - 1];
              const next = messages[i + 1];

              const isUser = m.role === "user";
              const prevSame = prev?.role === m.role;
              const nextSame = next?.role === m.role;

              const showAvatar = !isUser && !prevSame;

              const bubbleRadius = isUser
                ? [
                    "rounded-2xl",
                    prevSame ? "rounded-tr-md" : "",
                    nextSame ? "rounded-br-md" : "",
                  ].join(" ")
                : [
                    "rounded-2xl",
                    prevSame ? "rounded-tl-md" : "",
                    nextSame ? "rounded-bl-md" : "",
                  ].join(" ");

              return (
                <div key={i}>
                  <div
                    className={`flex items-end ${
                      isUser ? "justify-end" : "justify-start"
                    } gap-2`}
                  >
                    {!isUser && (
                      <div className="w-8">
                        {showAvatar ? (
                          <div className="h-8 w-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs text-zinc-300">
                            N
                          </div>
                        ) : (
                          <div className="h-8 w-8" />
                        )}
                      </div>
                    )}

                    <div
                      className={[
                        "max-w-[85%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
                        bubbleRadius,
                        isUser
                          ? "bg-blue-600 text-white"
                          : "bg-white/5 text-zinc-100 border border-white/10",
                      ].join(" ")}
                    >
                      {m.content}
                    </div>
                  </div>

                  {!nextSame && m.ts && (
                    <div
                      className={`mt-1 text-[10px] text-zinc-500 ${
                        isUser ? "text-right pr-2" : "text-left pl-10"
                      }`}
                    >
                      {new Date(m.ts).toLocaleString()}
                    </div>
                  )}
                </div>
              );
            })}

          {loading && (
            <div className="flex items-start justify-start">
              <div className="mr-2 mt-1 h-8 w-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs text-zinc-300">
                N
              </div>
              <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm bg-white/5 border border-white/10 text-zinc-300">
                Nova is thinking…
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </main>

      {/* ✅ Error + Retry button */}
      {err && (
        <div className="shrink-0 max-w-2xl mx-auto w-full px-4 py-2 text-xs text-red-400 flex items-center justify-between gap-3">
          <span className="break-words">{err}</span>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-white/10 border border-white/10 px-3 py-1 text-xs text-zinc-100"
          >
            Retry
          </button>
        </div>
      )}

      <footer className="shrink-0 border-t border-white/10 bg-black/40 backdrop-blur">
        <div className="max-w-2xl mx-auto px-4 py-4">
          {(direction || todayAction) && (
            <div className="mb-2 text-xs text-zinc-400">
              {direction ? (
                <>
                  Direction: <span className="text-zinc-200">{direction}</span>
                </>
              ) : null}
              {direction && todayAction ? " • " : null}
              {todayAction ? (
                <>
                  Today: <span className="text-zinc-200">{todayAction}</span>
                </>
              ) : null}
            </div>
          )}

          <div className="flex gap-2 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Stuck? Talk it through… (Enter to send, Shift+Enter for a new line)"
              className="flex-1 resize-none rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-[16px] outline-none focus:border-white/20 min-h-[48px] max-h-40"
            />
            <button
              onClick={send}
              disabled={loading || sendingRef.current || !input.trim()}
              className="rounded-2xl px-4 py-3 text-sm font-medium bg-zinc-100 text-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>

          <div className="mt-2 text-[11px] text-zinc-500">
            Session:{" "}
            <span className="text-zinc-300">{sid ? sid : "not created yet"}</span>
          </div>

          {/* <button onClick={clearChat} className="mt-2 text-xs underline text-zinc-400">Clear chat</button> */}
        </div>
      </footer>
    </div>
  );
}
