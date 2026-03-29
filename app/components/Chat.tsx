"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { API_BASE, apiGet, apiPost } from "../lib/api";
import { getToken } from "../lib/auth";
import { useRouter, useSearchParams } from "next/navigation";
import NovaHumanLogo from "./NovaHumanLogo";
import MarkdownRenderer from "./MarkdownRenderer";
import { useAuth } from "../providers/AuthProvider";

type FileTaskResult = {
  issues?: string[];
  improvements?: string[];
  improved_content?: string;
  recommendation?: string;
};

export type Msg = {
  role: "user" | "assistant";
  content: string;
  ts?: string;
  mode?: string;
  fileTaskResult?: FileTaskResult;
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

  const suggestionChips = useMemo(() => {
    const goal = (user?.goal ?? "").trim();
    const focus = (user?.focus ?? "").trim();

    if (user?.onboarding_completed && goal && focus) {
      return [
        { emoji: "✨", text: `Help me with ${goal}` },
        { emoji: "🎯", text: `What should I do about ${focus}?` },
        { emoji: "📋", text: "Give me a plan based on my situation" },
      ];
    }

    if (user?.onboarding_completed) {
      return [
        { emoji: "🧭", text: "Help me find a clear path forward" },
        { emoji: "🎯", text: "What should I focus on first?" },
        { emoji: "📋", text: "Give me a simple plan to improve my life" },
        { emoji: "💵", text: "Help me start making money" },
      ];
    }

    return [
      { emoji: "👋", text: "What can you help me with?" },
      { emoji: "🚀", text: "Help me get started" },
      { emoji: "🌿", text: "I feel stuck, guide me" },
    ];
  }, [user]);

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
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const menuWrapRef = useRef<HTMLDivElement | null>(null);

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
      setFile(null);
      setFileContent("");
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

  async function handleCamera() {
    if (typeof window === "undefined") return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((track) => track.stop());
    } catch {
      // If denied/unsupported, fallback to camera input trigger.
    }
    cameraInputRef.current?.click();
  }

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop?.();
      } catch {}
      stopSpeak();
    };
  }, []);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (menuWrapRef.current?.contains(target)) return;
      setShowMenu(false);
    };

    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
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

  const renderStructured = (data: FileTaskResult) => {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-red-400 font-semibold">Issues</h3>
          <ul className="text-sm list-disc ml-5">
            {(data.issues && data.issues.length ? data.issues : ["No issues detected"]).map((i: string, idx: number) => (
              <li key={idx}>{i}</li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-green-400 font-semibold">Improvements</h3>
          <ul className="text-sm list-disc ml-5">
            {(data.improvements && data.improvements.length ? data.improvements : ["No specific improvements provided"]).map((i: string, idx: number) => (
              <li key={idx}>{i}</li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-blue-400 font-semibold">Final Version</h3>
          <pre className="bg-black/40 p-3 rounded text-xs overflow-auto whitespace-pre-wrap">
            {data.improved_content || "—"}
          </pre>
        </div>

        <div>
          <h3 className="text-yellow-400 font-semibold">Recommendation</h3>
          <p className="text-sm">{data.recommendation || "—"}</p>
        </div>
      </div>
    );
  };

  function pushAssistantFromData(data: any) {
    if (data?.file_task_result) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Structured result",
          fileTaskResult: data.file_task_result,
        },
      ]);
      return;
    }

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: data?.answer || data?.content || "No response",
      },
    ]);
  }

  const handleFile = async (selectedFile: File | undefined) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setUploading(true);
    setErr(null);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const token = getToken();
      const res = await fetch(`${API_BASE}/agent/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const raw = await res.text();
      if (!res.ok) throw new Error(raw || res.statusText);
      const data = JSON.parse(raw);
      setFileContent(typeof data.content === "string" ? data.content : "");
    } catch (e: any) {
      setErr(e?.message || "Upload failed.");
      setFile(null);
      setFileContent("");
    } finally {
      setUploading(false);
    }
  };

  async function sendFileTask(message: string): Promise<any> {
    const token = getToken();
    const res = await fetch(`${API_BASE}/agent/file-task`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        message,
        user_message: message,
        file_content: fileContent || null,
        content: fileContent,
      }),
    });
    const raw = await res.text();
    if (!res.ok) throw new Error(raw || res.statusText);
    return JSON.parse(raw);
  }

  // --------------------
  // ✅ send(): file agent → streaming first → regular POST; create sid on first real message
  // --------------------
  async function send() {
    const typed = input.trim();
    const hasFile = Boolean(file || fileContent);
    const text = typed || (hasFile ? "Please analyze the attached file." : "");
    if (!text) return;
    if (sendingRef.current) return;
    if (uploading) return;

    // Attached file: agent structured response (no chat stream)
    if (hasFile) {
      sendingRef.current = true;
      setInput("");
      setLoading(true);
      setBriefing(null);
      setErr(null);

      setMessages((prev) => [...prev, { role: "user", content: text }]);

      try {
        const result = await sendFileTask(text);
        pushAssistantFromData(result);
        setFile(null);
        setFileContent("");
      } catch (e: any) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: e?.message || "Could not process the file task.",
          },
        ]);
        setErr(e?.message || "File task failed.");
      } finally {
        sendingRef.current = false;
        setLoading(false);
      }
      return;
    }

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
        } else if (res?.file_task_result) {
          pushAssistantFromData(res);
          setFile(null);
          setFileContent("");
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
    setFile(null);
    setFileContent("");
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
                {suggestionChips.map((prompt) => (
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
                            {m.fileTaskResult ? (
                              renderStructured(m.fileTaskResult)
                            ) : (
                              <MarkdownRenderer content={m.content} />
                            )}
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
          <span className="break-words">
            {err.toLowerCase().includes("free limit reached")
              ? "Upgrade to continue"
              : err}
          </span>
          {err.toLowerCase().includes("free limit reached") ? (
            <button
              onClick={() => router.push("/upgrade")}
              className="rounded-lg bg-white text-black px-3 py-1 text-xs"
            >
              Upgrade
            </button>
          ) : (
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-white/10 border border-white/10 px-3 py-1 text-xs text-zinc-100"
            >
              Retry
            </button>
          )}
        </div>
      )}

      <footer className="shrink-0 border-t border-white/10 bg-black/40 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex flex-col gap-2">
            {file && (
              <div className="flex items-center justify-between gap-2 text-xs text-zinc-400 px-1">
                <span>
                  Attached: {file.name}
                  {uploading ? " (reading…)" : ""}
                </span>
                <button
                  type="button"
                  className="text-zinc-500 hover:text-zinc-300"
                  onClick={() => {
                    setFile(null);
                    setFileContent("");
                  }}
                >
                  Clear
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.pdf,.jpg,.jpeg,.png"
              className="hidden"
              disabled={uploading}
              onChange={(e) => void handleFile(e.target.files?.[0])}
            />

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => void handleFile(e.target.files?.[0])}
            />

            <div
              ref={menuWrapRef}
              className="relative flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-900 px-3 py-2"
            >
              {showMenu && (
                <div className="absolute bottom-14 left-2 z-20 w-40 rounded-lg border border-white/10 bg-zinc-900 p-2 shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      fileInputRef.current?.click();
                      setShowMenu(false);
                    }}
                    className="w-full rounded px-3 py-2 text-left text-sm text-zinc-200 hover:bg-white/10"
                  >
                    📎 Upload file
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      void handleCamera();
                      setShowMenu(false);
                    }}
                    className="w-full rounded px-3 py-2 text-left text-sm text-zinc-200 hover:bg-white/10"
                  >
                    📷 Take photo
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowMenu((prev) => !prev)}
                disabled={uploading || loading}
                className="shrink-0 rounded-lg px-2 text-lg text-zinc-300 hover:bg-white/10 hover:text-zinc-100 disabled:opacity-50"
                title="More actions"
              >
                +
              </button>

              <div className="flex-1 flex items-center gap-2">
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
              </div>

              <button
                type="button"
                onClick={toggleVoice}
                disabled={loading}
                className={`h-8 w-8 shrink-0 rounded-lg flex items-center justify-center ${
                  isListening ? "bg-amber-300 text-zinc-900" : "text-zinc-300 hover:bg-white/10 hover:text-zinc-100"
                }`}
                title={isListening ? "Stop voice input" : "Start voice input"}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
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
                onClick={send}
                disabled={loading || uploading || (!input.trim() && !file && !fileContent)}
                className="h-8 w-8 shrink-0 rounded-lg text-zinc-100 hover:bg-white/10 disabled:opacity-50 flex items-center justify-center"
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
            </div>
          </div>

          {/* <button onClick={clearChat} className="mt-2 text-xs underline text-zinc-400">Clear chat</button> */}
        </div>
      </footer>
    </div>
  );
}
