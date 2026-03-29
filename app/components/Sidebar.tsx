"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { apiGet, apiPost } from "../lib/api";
import { getToken } from "../lib/auth";
import { useAuth } from "../providers/AuthProvider";

type SessionItem = {
  sid: string;
  title: string;
  last: string;
  updated_at: string;
  count: number;
};

export default function Sidebar() {
  const { authReady, isAuthed, logout, user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [openProfileMenu, setOpenProfileMenu] = useState(false);
  const [items, setItems] = useState<SessionItem[]>([]);
  const [query, setQuery] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeSid = searchParams.get("sid") || "";

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) =>
      `${it.title} ${it.last}`.toLowerCase().includes(q)
    );
  }, [items, query]);

  async function loadSessions() {
    try {
      const token = getToken();
      if (!token) {
        setItems([]);
        return;
      }

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
    } catch {
      // keep last known list
    }
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    void loadSessions();
    const t = window.setInterval(loadSessions, 3000);
    return () => window.clearInterval(t);
  }, [activeSid]);

  function goToSid(sid: string) {
    const nav = document.getElementById("nav") as HTMLInputElement | null;
    if (nav) nav.checked = false;
    router.replace(`/chat?sid=${encodeURIComponent(sid)}`);
  }

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
        router.replace(pathname === "/chat" ? "/chat" : "/");
      }
    } catch {
      alert("Couldn't delete. Is the backend running?");
    }
  }

  return (
    <div className="h-screen flex flex-col bg-zinc-950">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Brand */}
        <div className="p-5">
          <div className="text-xl font-semibold">Nova Human</div>

          <div className="mt-3">
            <button
              type="button"
              onClick={() => {
                const nav = document.getElementById("nav") as HTMLInputElement | null;
                if (nav) nav.checked = false;

                try {
                  localStorage.removeItem("nova_sid");
                  localStorage.removeItem("selected_chat_sid");
                  localStorage.removeItem("active_chat");
                } catch {}

                window.dispatchEvent(new CustomEvent("nova:new-chat"));
                router.replace("/chat");
              }}
              className="rounded-md bg-white/5 px-3 py-2 text-sm text-zinc-100 text-left"
            >
              + New chat
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 pt-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none"
          />
        </div>

        {/* Conversations label */}
        <div className="px-3 pt-4 pb-2 text-[11px] font-semibold tracking-[0.12em] text-amber-400/80">
          CONVERSATIONS
        </div>

        {/* Conversations list */}
        <div className="px-3 pb-3">
          <div className="flex flex-col gap-1">
            {filteredItems.map((it) => {
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
        </div>
      </div>
      {/* End of scrollable content */}

      {/* Profile section at bottom */}
      <div className="shrink-0 border-t border-white/10 p-3">
        {!mounted || !authReady ? (
          <div className="h-10 w-full animate-pulse rounded-lg bg-white/5" />
        ) : !isAuthed ? (
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-medium text-zinc-100 hover:bg-white/10"
          >
            Login
          </button>
        ) : (
          <div className="transition-all duration-200">
            <button
              type="button"
              onClick={() => setOpenProfileMenu(!openProfileMenu)}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 hover:bg-white/10 transition"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center">
                  {user?.name?.[0] || "U"}
                </div>
                <div>
                  <div className="text-sm font-medium">
                    {user?.name ?? "User"}
                  </div>
                  <div className="text-xs text-zinc-500">Free Plan</div>
                </div>
              </div>
              <span className="text-xs">{openProfileMenu ? "▲" : "▼"}</span>
            </button>

            {openProfileMenu && (
              <div className="mt-2 space-y-1 text-sm transition-all duration-200">
                <button
                  type="button"
                  onClick={() => router.push("/profile")}
                  className="w-full text-left px-3 py-2 rounded hover:bg-white/10"
                >
                  Profile
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/settings")}
                  className="w-full text-left px-3 py-2 rounded hover:bg-white/10"
                >
                  Settings
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/about")}
                  className="w-full text-left px-3 py-2 rounded hover:bg-white/10"
                >
                  About
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/upgrade")}
                  className="w-full text-left px-3 py-2 rounded hover:bg-white/10"
                >
                  Upgrade Plan
                </button>

                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setOpenProfileMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded text-red-400 hover:bg-red-500/10"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
