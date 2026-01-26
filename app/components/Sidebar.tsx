"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../lib/api";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type SessionItem = {
  sid: string;
  title: string;
  last: string;
  updated_at: string;
  count: number;
};

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="rounded-lg px-3 py-2 text-sm hover:bg-white/5 text-zinc-100"
    >
      {label}
    </a>
  );
}

function newSid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `chat_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export default function Sidebar() {
  const [items, setItems] = useState<SessionItem[]>([]);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeSid = searchParams.get("sid") || "";

  async function loadSessions() {
    try {
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
        .filter((s) => s.sid.length > 0);

      setItems(normalized);
    } catch {
      setItems([]);
    }
  }

  useEffect(() => {
    loadSessions();
    const t = setInterval(loadSessions, 3000); // refresh list every 3 seconds
    return () => clearInterval(t);
  }, [activeSid]);

  async function deleteSession(sid: string, title?: string) {
    const ok = window.confirm(
      `Delete this chat${title ? ` ("${title}")` : ""}?\n\nThis can't be undone.`
    );
    if (!ok) return;

    try {
      await apiPost("/memory/chat/delete", { sid });

      setItems((prev) => prev.filter((x) => x.sid !== sid));
      setOpenMenu(null);

      // If deleting active session, jump to new chat
      if (activeSid === sid) {
        const newOne = newSid();
        const base = pathname === "/chat" ? "/chat" : "/";
        router.replace(`${base}?sid=${encodeURIComponent(newOne)}`);
      }
    } catch {
      alert("Couldn't delete. Is the backend running?");
    }
  }

  return (
    <aside className="hidden md:flex w-64 flex-col border-r border-white/10 overflow-hidden">
      {/* Brand */}
      <div className="p-5">
        <div className="text-xl font-semibold">Nova Human</div>

        <button
          onClick={() => {
            const sid = newSid();
            router.replace(`/`);
            const base = pathname === "/chat" ? "/chat" : "/";
            router.replace(`${base}?sid=${encodeURIComponent(sid)}`);
          }}
          className="mt-3 rounded-md bg-white/5 px-3 py-2 text-sm text-zinc-100"
        >
          + New chat
        </button>
      </div>

      {/* Main nav */}
      <nav className="px-3 pb-2 flex flex-col gap-1">
        <NavLink href="/" label="Chat" />
        <NavLink href="/direction" label="Direction" />
        <NavLink href="/habits" label="Habits" />
        <NavLink href="/check-in" label="Check-in" />
        <NavLink href="/dashboard" label="Dashboard" />
      </nav>

      {/* Divider */}
      <div className="mx-3 my-2 border-t border-white/10" />

      {/* Chat sessions list */}
      <div className="px-3 pb-3 flex flex-col gap-1 overflow-y-auto">
        {items.map((it) => {
          const isActive = activeSid === it.sid;

          return (
            <div
              key={it.sid}
              className={[
                "group flex items-center justify-between rounded-lg px-2 py-2 hover:bg-white/5",
                activeSid === it.sid ? "bg-white/10" : "",
              ].join(" ")}
            >
              <button
                onClick={() => {
                  const base = pathname === "/chat" ? "/chat" : "/";
                  router.replace(`${base}?sid=${encodeURIComponent(it.sid)}`);
                }}
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
                  className="opacity-0 group-hover:opacity-100 px-2 text-zinc-400 hover:text-zinc-200"
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
    </aside>
  );
}
