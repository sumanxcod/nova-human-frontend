"use client";

import { useEffect, useRef, useState } from "react";
import { apiGet, apiPost } from "../lib/api";
import { useRouter, useSearchParams } from "next/navigation";
import NovaHumanLogo from "./NovaHumanLogo";
import MarkdownRenderer from "./MarkdownRenderer";
import { useAuth } from "../providers/AuthProvider";

export type Msg = {
  role: "user" | "assistant";
  content: string;
  ts?: string;
  mode?: string;
};

function generateSessionId(): string {
  return `nova_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

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
`.trim();

// --------------------
// ✅ Backend-shape-safe parsers
// --------------------
function coerceMessages(input: any): Msg[] | null {
  if (!input) return null;

  const raw =
    Array.isArray(input)
      ? input
      : Array.isArray(input?.messages)
        ? input.messages
        : Array.isArray(input?.items)
          ? input.items
          : Array.isArray(input?.data?.messages)
            ? input.data.messages
            : Array.isArray(input?.data?.items)
              ? input.data.items
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
      const mode = m?.mode ?? m?.agent?.mode ?? null;
      return {
        role,
        content: c,
        ts: ts || undefined,
        mode: typeof mode === "string" && mode.trim() ? mode : undefined,
      } as Msg;
    })
    .filter((m: any): m is Msg => Boolean(m && m.content && m.role)) as Msg[];

  return mapped.length ? mapped : null;
}

function extractAssistantText(res: any): string {
  if (!res) return "";

  const fromAssistantField =
    (typeof res.assistant_message === "string" && res.assistant_message.trim()) ||
    (typeof res?.data?.assistant_message === "string" &&
      res.data.assistant_message.trim()) ||
    "";
  if (fromAssistantField) return fromAssistantField;

  const msgs = coerceMessages(res);
  if (msgs?.length) {
    const lastAssistant = [...msgs].reverse().find((m) => m.role === "assistant");
    if (lastAssistant?.content) return lastAssistant.content;
  }

  const s =
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

/** True when the backend reports failure in JSON while still using HTTP 200. */
function isChatApplicationFailure(res: any): boolean {
  if (res == null || typeof res !== "object") return false;
  const hasAssistant =
    (typeof res.assistant_message === "string" && res.assistant_message.trim()) ||
    (typeof res.data?.assistant_message === "string" &&
      res.data.assistant_message.trim()) ||
    Boolean(coerceMessages(res)?.length);
  if (hasAssistant) return false;
  return res.ok === false;
}

export default function Chat() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { authReady, user } = useAuth();

  const displayName =
    user?.name?.split(" ")[0] || user?.email?.split("@")[0] || "there";

  // ✅ SID comes ONLY from URL (no auto create on mount)
  const sid = searchParams.get("sid") || "";
  const activeSidRef = useRef<string>(searchParams.get("sid") || "");

  useEffect(() => {
    const urlSid = searchParams.get("sid") || "";
    if (urlSid) {
      activeSidRef.current = urlSid;
    }
  }, [searchParams]);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [briefing, setBriefing] = useState<string | null>(null);

  const sendingRef = useRef(false);

  // --------------------
  // Voice input (Browser STT) — push-to-talk
  // --------------------
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // --------------------
  // Voice output (Browser TTS)
  // --------------------
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Explicit New Chat (sidebar): clear session ref without waiting on URL timing.
  useEffect(() => {
    const onNewChat = () => {
      console.log("[Nova] NEW CHAT CREATED (client reset)");
      activeSidRef.current = "";
      setMessages([]);
      setErr(null);
    };
    window.addEventListener("nova:new-chat", onNewChat);
    return () => window.removeEventListener("nova:new-chat", onNewChat);
  }, []);

  useEffect(() => {
    if (!authReady) return;
    if (!user?.onboarding_completed) {
      router.replace("/onboarding");
    }
  }, [authReady, user?.onboarding_completed, router]);

  useEffect(() => {
    if (!sid && !briefing) {
      apiGet("/briefing")
        .then((data: any) => {
          if (data?.briefing) setBriefing(data.briefing);
        })
        .catch(() => {});
    }
  }, [sid]);

  function stopSpeak() {
    if (typeof window === "undefined") return;
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }

  function speak(text: string) {
    if (typeof window === "undefined") return;
    if (!text?.trim()) return;

    // Stop any current speech first
    stopSpeak();

    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.0;   // 0.8–1.1 is nice
    utter.pitch = 1.0;
    utter.volume = 1.0;

    utter.onend = () => setIsSpeaking(false);
    utter.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utter);
  }

  function getSR() {
    if (typeof window === "undefined") return null;
    const w = window as any;
    return w.SpeechRecognition || w.webkitSpeechRecognition || null;
  }

  function startVoice() {
    const SR = getSR();
    if (!SR) {
      alert("Voice input is not supported in this browser. Use Chrome.");
      return;
    }

    // Always create fresh recognition to avoid duplicates
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }

    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";

    rec.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => (prev ? prev + " " + transcript : transcript).trim());
    };

    rec.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    rec.onerror = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = rec;

    try {
      rec.start();
      setIsListening(true);
    } catch (e) {
      setIsListening(false);
      recognitionRef.current = null;
    }
  }

  function stopVoice() {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  }

  function toggleVoice() {
    if (isListening) {
      stopVoice();
    } else {
      startVoice();
    }
  }

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop?.();
      } catch {}
      stopSpeak();
    };
  }, []);

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
    if (!sid) {
      // ✅ No sid = fresh empty state
      activeSidRef.current = "";
      setMessages([]);
      setErr(null);
      return;
    }

    let cancelled = false;

    async function loadChatWithRetry() {
      setErr(null);
      console.log("[Nova] FETCH HISTORY SID", sid);

      for (const delay of [0, 1500, 3500]) {
        if (delay) await sleep(delay);
        if (cancelled) return;

        try {
          await wakeBackendOnce();

          const data = await apiGet(
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
  // ✅ send(): streaming first, then regular POST; create sid on first real message
  // --------------------
  async function send() {
    const text = input.trim();
    if (!text) return;
    if (sendingRef.current) return;

    sendingRef.current = true;
    setInput("");
    setLoading(true);
    setBriefing(null);
    setErr(null);

    const effectiveSid = activeSidRef.current;

    // Optimistic UI: add user message
    setMessages((prev) => [...prev, { role: "user", content: text }]);

    const category = detectCategory(text);
    const contract = responseContract(category);
    const direction: string | undefined = undefined;
    const todayAction: string | undefined = undefined;
    const tone: string | undefined = undefined;

    const requestSid = effectiveSid || generateSessionId();
    const payload: any = {
      message: text,
      system: NOVA_SYSTEM + "\n\n" + contract,
      context: { direction, todayAction, tone, category },
      sid: requestSid,
    };

    try {
      let streamed = false;
      try {
        const RAW_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";
        const API_BASE = RAW_BASE.replace(/\/+$/, "") || "http://localhost:8000";
        const token =
          (typeof window !== "undefined" &&
            localStorage.getItem("nova_token")) ||
          "";

        const streamRes = await fetch(`${API_BASE}/memory/chat/stream`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        });

        if (streamRes.ok && streamRes.body) {
          streamed = true;
          const reader = streamRes.body.getReader();
          const decoder = new TextDecoder();
          let assistantText = "";
          let streamSid = "";
          let buffer = "";

          // Add empty assistant message to fill incrementally
          setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
          setLoading(false); // Hide "thinking" once streaming starts

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const parts = buffer.split("\n\n");
            buffer = parts.pop() || "";

            for (const part of parts) {
              let eventType = "";
              let dataStr = "";

              for (const line of part.split("\n")) {
                if (line.startsWith("event: ")) eventType = line.slice(7).trim();
                else if (line.startsWith("data: ")) dataStr = line.slice(6);
              }

              if (!dataStr) continue;

              try {
                const data = JSON.parse(dataStr);

                if (eventType === "token" && data.token) {
                  assistantText += data.token;
                  setMessages((prev) => {
                    const updated = [...prev];
                    const lastIdx = updated.length - 1;
                    if (lastIdx >= 0 && updated[lastIdx].role === "assistant") {
                      updated[lastIdx] = {
                        ...updated[lastIdx],
                        content: assistantText,
                      };
                    }
                    return updated;
                  });
                } else if (eventType === "done") {
                  if (data.full_response) assistantText = data.full_response;
                  streamSid = data.sid || "";
                  // Final update
                  setMessages((prev) => {
                    const updated = [...prev];
                    const lastIdx = updated.length - 1;
                    if (lastIdx >= 0 && updated[lastIdx].role === "assistant") {
                      updated[lastIdx] = {
                        ...updated[lastIdx],
                        content: assistantText,
                      };
                    }
                    return updated;
                  });
                }
              } catch {
                // JSON parse error, skip
              }
            }
          }

          // Update SID
          if (!effectiveSid && streamSid) {
            activeSidRef.current = streamSid;
            router.replace(`/chat?sid=${encodeURIComponent(streamSid)}`);
          }
        }
      } catch {
        streamed = false;
        setMessages((prev) => {
          const next = [...prev];
          if (next.length && next[next.length - 1].role === "assistant") {
            next.pop();
          }
          return next;
        });
      }

      // --- Fallback to regular endpoint ---
      if (!streamed) {
        const res: any = await apiPost("/memory/chat", payload);

        if (isChatApplicationFailure(res)) {
          const errText =
            (typeof res?.error === "string" && res.error.trim()) ||
            (typeof res?.message === "string" && res.message.trim()) ||
            "Something went wrong.";
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: errText },
          ]);
          setErr(errText);
          return;
        }

        if (!effectiveSid) {
          const responseSid =
            res?.sid ??
            res?.session?.sid ??
            res?.data?.sid ??
            res?.chat?.sid ??
            "";
          const nextSid =
            typeof responseSid === "string" && responseSid.trim()
              ? responseSid
              : requestSid;
          activeSidRef.current = nextSid;
          router.replace(`/chat?sid=${encodeURIComponent(nextSid)}`);
        }

        const full = coerceMessages(res);
        if (full?.length) {
          setMessages(full);
        } else {
          const assistantText = extractAssistantText(res);
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content:
                assistantText ||
                `Hey ${displayName} 👋 I'm here. What do you want to work on today?`,
            },
          ]);
        }
      }
    } catch (e: any) {
      setMessages((prev) => [
        ...prev.filter(
          (m) => !(m.role === "assistant" && m.content === "")
        ),
        {
          role: "assistant",
          content:
            "I couldn't reach the backend. Please hit Retry or refresh the page.",
        },
      ]);
      setErr(e?.message || "Backend not reachable.");
    } finally {
      sendingRef.current = false;
      setLoading(false);
    }
  }

  async function clearChat() {
    try {
      if (!sid) return;
      await apiPost("/memory/chat/clear", { sid });
      setMessages([]);
      setErr(null);
    } catch (e: any) {
      setErr(e?.message || "Couldn’t clear backend memory.");
    }
  }
  function startNewChat() {
    // 1) Clear runtime state
    setMessages([]);
    setInput("");
    setErr(null);
    // 2) Clear voice states
    stopSpeak();
    stopVoice();

    // 3) Clear persisted sid
    try {
      localStorage.removeItem("nova_sid");
      localStorage.removeItem("selected_chat_sid");
      localStorage.removeItem("active_chat");
    } catch {}

    // 4) Clear URL sid
    router.replace("/chat");
  }
  return (
    <div className="flex flex-col h-full">
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
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-2">
          {messages.length === 0 && !loading && (
            <div className="flex h-[60vh] flex-col items-center justify-center gap-6 text-center">
              <NovaHumanLogo size={80} />
              <div className="text-center text-zinc-400">
                <h2 className="text-xl font-medium text-zinc-200">
                  Welcome, {displayName} 👋
                </h2>
                <p className="mt-2">
                  {briefing || "What do you want to work on today?"}
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 max-w-lg mt-2">
                {[
                  { emoji: "🔍", text: "Find 3 trending product opportunities" },
                  { emoji: "✉️", text: "Draft an email to my professor" },
                  { emoji: "⏰", text: "Remind me to call mom at 5pm" },
                  { emoji: "🌤️", text: "Weather in New York" },
                  {
                    emoji: "💻",
                    text: "Write a Python function to reverse a string",
                  },
                ].map((prompt) => (
                  <button
                    key={prompt.text}
                    type="button"
                    onClick={() => {
                      setInput(prompt.text);
                      setTimeout(() => {
                        const sendBtn = document.querySelector(
                          '[title="Send"]'
                        ) as HTMLButtonElement;
                        if (sendBtn) sendBtn.click();
                      }, 100);
                    }}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-300 hover:bg-white/10 hover:text-zinc-100 transition-colors"
                  >
                    {prompt.emoji} {prompt.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages
            .filter(
              (m) =>
                (m?.content ?? "").trim().length > 0 ||
                (m.role === "assistant" && m.content === "")
            )
            .map((m, i) => {
              const prev = messages[i - 1];
              const next = messages[i + 1];

              const isUser = m.role === "user";
              const prevSame = prev?.role === m.role;
              const nextSame = next?.role === m.role;

              const bubbleRadius = isUser
                ? [
                    "rounded-2xl",
                    prevSame ? "rounded-tr-md" : "",
                    nextSame ? "rounded-br-md" : "",
                  ].join(" ")
                : "";

              return (
                <div key={i}>
                  <div
                    className={`flex items-end ${
                      isUser ? "justify-end" : "justify-start"
                    } gap-2`}
                  >
                    <div
                      className={[
                        "max-w-[85%] text-sm leading-relaxed",
                        isUser ? `px-4 py-3 ${bubbleRadius}` : "px-4 py-3 rounded-2xl",
                        isUser
                          ? "bg-white/5 text-zinc-100 border border-white/10 whitespace-pre-wrap"
                          : "bg-white/5 text-zinc-100 border border-white/10",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {isUser ? (
                        m.content
                      ) : (
                        <div className="flex flex-row flex-wrap items-baseline gap-x-2 gap-y-1">
                          {!isUser && (
                            <span className="text-[11px] font-medium text-zinc-500 mr-2 select-none">
                              NOVA
                            </span>
                          )}
                          <div className="min-w-0 flex-1">
                            <MarkdownRenderer content={m.content} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {!nextSame && m.ts && (
                    <div
                      className={`mt-1 text-[10px] text-zinc-500 ${
                        isUser ? "text-right pr-2" : "text-left pl-2"
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
              <div className="max-w-[85%] pt-1 text-sm text-zinc-200">
                Nova is thinking…
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </main>

      {/* ✅ Error + Retry button */}
      {err && (
        <div className="shrink-0 max-w-4xl mx-auto w-full px-4 py-2 text-xs text-red-400 flex items-center justify-between gap-3">
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
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Type your message…"
                className="flex-1 bg-transparent text-[16px] text-zinc-100 placeholder:text-zinc-500 outline-none"
              />

              {input.trim() && (
                <button
                  onClick={send}
                  disabled={loading}
                  className="h-8 w-8 rounded-lg text-zinc-100 hover:bg-white/10 disabled:opacity-50 flex items-center justify-center shrink-0"
                  title="Send"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M5 12h13M13 6l6 6-6 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={toggleVoice}
              className={`h-11 w-11 rounded-2xl border border-white/10 flex items-center justify-center ${
                isListening ? "bg-amber-300 text-zinc-900" : "bg-white/10 text-zinc-100 hover:bg-white/15"
              }`}
              title={isListening ? "Click to stop" : "Click to talk"}
            >
              {/* Mic icon */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M19 11a7 7 0 0 1-14 0"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 18v3"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => {
                // Speak the most recent assistant message
                const last = [...messages].reverse().find((m) => m.role === "assistant");
                if (!last?.content) return;
                if (isSpeaking) stopSpeak();
                else speak(last.content);
              }}
              className={`h-11 w-11 rounded-2xl border border-white/10 flex items-center justify-center ${
                isSpeaking ? "bg-amber-300 text-zinc-900" : "bg-white/10 text-zinc-100 hover:bg-white/15"
              }`}
              title={isSpeaking ? "Stop" : "Speak last reply"}
            >
              {/* Speaker icon */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M11 5 6 9H3v6h3l5 4V5Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M15 9a3 3 0 0 1 0 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M17.5 6.5a6 6 0 0 1 0 11"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          {/* <button onClick={clearChat} className="mt-2 text-xs underline text-zinc-400">Clear chat</button> */}
        </div>
      </footer>
    </div>
  );
}
