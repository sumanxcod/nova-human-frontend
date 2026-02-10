"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../lib/api";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { usePWAInstall } from "@/app/lib/usePWAInstall";
import { getToken } from "../lib/auth";

type SessionItem = {
  sid: string;
  title: string;
  last: string;

  updated_at: string;
  count: number;
};

export default function Sidebar() {
  const [items, setItems] = useState<SessionItem[]>([]);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [modal, setModal] = useState<"about" | "privacy" | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const activeSid = searchParams.get("sid") || "";
  const isAuthRoute =
    pathname === "/login" ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password");
  
  const { canInstall, install, showIOSHint } = usePWAInstall();

  async function loadSessions() {
    try {
      if (isAuthRoute) return;

      const token = getToken();
      if (!token) return;

      await apiGet("/health");
      const data: any = await apiGet("/memory/sessions");
      const raw = (data?.items ?? data?.sessions ?? []) as any[];

      const normalized: SessionItem[] = raw
        .map((s) => ({
          sid: String(s?.sid ?? s?.id ?? ""),
          title: String(s?.title ?? "New chat"),
          last: typeof s?.last === "string" ? s.last : "",
          updated_at: typeof s?.updated_at === "string" ? s.updated_at : "",
          count: Number.isFinite(Number(s?.count)) ? Number(s.count) : 0,
        }))
        .filter((s) => s.sid.length > 0)
        .filter((s) => s.count > 0 || s.last.trim().length > 0);

      setItems(normalized);
    } catch (err: any) {
      if (err?.message?.includes("401") || err?.message?.includes("Unauthorized")) return;
    }
  }


  useEffect(() => {
    if (isAuthRoute) return;

    loadSessions();
    const t = setInterval(loadSessions, 3000);
    return () => clearInterval(t);
  }, [activeSid, isAuthRoute]);

  async function deleteSession(sid: string, title?: string) {
    const ok = window.confirm(
      `Delete this chat${title ? ` ("${title}")` : ""}?\n\nThis can't be undone.`
    );
    if (!ok) return;

    try {
      await apiPost("/memory/chat/delete", { sid });

      setItems((prev) => prev.filter((x) => x.sid !== sid));
      setOpenMenu(null);

      if (activeSid === sid) {
        router.replace("/chat");
      }
    } catch {
      alert("Couldn't delete. Is the backend running?");
    }
  }

  function goTo(href: string) {
    setOpenMenu(null);

    // ✅ close mobile drawer if open
    const nav = document.getElementById("nav") as HTMLInputElement | null;
    if (nav) nav.checked = false;

    router.push(href);
  }

  function goToSid(sid: string) {
    setOpenMenu(null);

    const nav = document.getElementById("nav") as HTMLInputElement | null;
    if (nav) nav.checked = false;

    router.replace(`/chat?sid=${encodeURIComponent(sid)}`);
  }

  return (
      <div className="h-screen flex flex-col overflow-y-auto bg-zinc-950">

        {/* Brand */}
      <div className="p-5">
        <div className="text-xl font-semibold">Nova Human</div>

        <div>
          <button
            onClick={() => {
              // Close mobile nav
              const nav = document.getElementById("nav") as HTMLInputElement | null;
              if (nav) nav.checked = false;

              // ✅ Clear any persisted sid so nothing can auto-restore old chat
              try {
                localStorage.removeItem("nova_sid");
                localStorage.removeItem("selected_chat_sid");
                localStorage.removeItem("active_chat");
              } catch {}

              // ✅ Go to fresh chat
              router.replace("/chat");
            }}
            className="mt-3 rounded-md bg-white/5 px-3 py-2 text-sm text-zinc-100"
          >
            + New chat
          </button>
        </div>
      </div>

      {/* Main nav */}
      <nav className="px-3 pb-2 flex flex-col gap-1">
        <button
          onClick={() => goTo("/chat")}
          className="text-left rounded-lg px-3 py-2 text-sm hover:bg-white/5 text-zinc-100"
        >
          Chat
        </button>
        <button
          onClick={() => goTo("/direction")}
          className="text-left rounded-lg px-3 py-2 text-sm hover:bg-white/5 text-zinc-100"
        >
          Direction
        </button>
        <button
          onClick={() => goTo("/habits")}
          className="text-left rounded-lg px-3 py-2 text-sm hover:bg-white/5 text-zinc-100"
        >
          Action Plan
        </button>
        <button
          onClick={() => goTo("/checkin")}
          className="text-left rounded-lg px-3 py-2 text-sm hover:bg-white/5 text-zinc-100"
        >
          Checkin
        </button>
        <button
          onClick={() => goTo("/dashboard")}
          className="text-left rounded-lg px-3 py-2 text-sm hover:bg-white/5 text-zinc-100"
        >
          Dashboard
        </button>
        <button
          onClick={() => goTo("/reflection")}
          className="rounded-xl px-3 py-2 text-sm text-zinc-100 hover:bg-white/5"
        >
          Weekly Reflection
        </button>
      </nav>

      {/* Divider */}
      <div className="mx-3 my-2 border-t border-white/10" />

      {/* Footer menu */}
      <nav className="px-3 pb-3 flex flex-col gap-1">
        <button
          onClick={() => setModal("about")}
          className="text-left rounded-lg px-3 py-2 text-sm hover:bg-white/5 text-zinc-100"
        >
          About Nova Human
        </button>
        <button
          onClick={() => setModal("privacy")}
          className="text-left rounded-lg px-3 py-2 text-sm hover:bg-white/5 text-zinc-100"
        >
          Privacy
        </button>
      </nav>

      {/* Divider */}
      <div className="mx-3 my-2 border-t border-white/10" />

      {/* Chat sessions list */}
      <div className="px-3 pb-3 flex flex-col gap-1">
        {items.map((it) => {
          const isActive = activeSid === it.sid;

          return (
            <div
              key={it.sid}
              className={[
                "group flex items-center justify-between rounded-lg px-2 py-2 hover:bg-white/5",
                isActive ? "bg-white/10" : "",
              ].join(" ")}
            >
              <button
                onClick={() => goToSid(it.sid)}
                className="flex-1 text-left min-w-0"
                title={it.title}
              >
                <div className="text-sm text-zinc-100 truncate">
                  {it.title || "New chat"}
                </div>
                <div className="text-[11px] text-zinc-400 truncate">
                  {it.last || ""}
                </div>
              </button>

              {/* 3-dot menu */}
              <div className="relative">
                <button
                  className="opacity-100 md:opacity-0 md:group-hover:opacity-100 px-2 text-zinc-400 hover:text-zinc-200"
                  title="More"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setOpenMenu(openMenu === it.sid ? null : it.sid);
                  }}
                >
                  ⋯
                </button>

                {openMenu === it.sid && (
                  <div className="absolute right-0 z-50 mt-1 w-32 rounded-lg border border-white/10 bg-zinc-950 shadow-lg">
                    <button
                      onClick={() => deleteSession(it.sid, it.title)}
                      className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-white/5"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal backdrop */}
      {modal && (
        <div
          className="fixed inset-0 bg-black/60 z-40"
          onClick={() => setModal(null)}
        />
      )}

      {/* Modal: slides up from bottom */}
      {modal && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 border-t border-white/10 rounded-t-2xl max-h-[80vh] overflow-y-auto flex flex-col">
          <div className="flex-1 px-6 py-6">
            {modal === "about" && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-zinc-100">🧠 About Nova Human</h2>
                <div className="text-sm text-zinc-300 leading-relaxed space-y-3">
                  <p>
                    Nova Human is an AI life-partner designed to help people think clearly,
                    take action, and move forward one step at a time.
                  </p>
                  <p>
                    It is not a chatbot and not therapy.
                    Nova focuses on direction, planning, and daily progress through calm,
                    human guidance.
                  </p>
                  <p>
                    Nova Human was created by Suman Singh Dhami
                    as an independent project focused on human-centered decision making.
                  </p>
                </div>
              </div>
            )}

            {modal === "privacy" && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-zinc-100">🔒 Privacy</h2>
                <div className="text-sm text-zinc-300 leading-relaxed space-y-3">
                  <p>
                    Your conversations are stored to maintain continuity and context.
                  </p>
                  <p>
                    Your data is not sold or shared with third parties.
                    There is no advertising and no data brokerage.
                  </p>
                  <p>
                    You can delete chats at any time.
                    Nova Human is designed to minimize data usage
                    and respect user privacy.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-white/10 px-6 py-4 space-y-3">
            {canInstall && (
              <button
                onClick={install}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-100 hover:bg-white/10"
              >
                Install Nova Human
              </button>
            )}

            {showIOSHint && (
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-zinc-300">
                iPhone: Share → Add to Home Screen
              </div>
            )}

            <button
              onClick={() => setModal(null)}
              className="w-full rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-white/15"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
