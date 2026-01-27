"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { apiGet, apiPost } from "../lib/api";

type SessionItem = {
  sid: string;
  title: string;
  last: string;
  updated_at: string;
  count: number;
};

function newSid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `chat_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function NavItem({ href, label, onClick }: { href: string; label: string; onClick?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="rounded-lg px-3 py-2 text-sm hover:bg-white/5 text-zinc-100"
    >
      {label}
    </Link>
  );
}

function SidebarContent({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
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
    const t = setInterval(loadSessions, 4000);
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

      if (activeSid === sid) {
        const sid2 = newSid();
        const base = pathname === "/chat" ? "/chat" : "/";
        router.replace(`${base}?sid=${encodeURIComponent(sid2)}`);
      }
    } catch (e: any) {
      alert(e?.message || "Couldn't delete. Is the backend running?");
    }
  }

  function goNewChat() {
    const sid = newSid();
    const base = pathname === "/chat" ? "/chat" : "/";
    router.replace(`${base}?sid=${encodeURIComponent(sid)}`);
    onNavigate?.();
  }

  function openChatSid(sid: string) {
    const base = pathname === "/chat" ? "/chat" : "/";
    router.replace(`${base}?sid=${encodeURIComponent(sid)}`);
    onNavigate?.();
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Brand */}
      <div className="p-5">
        <div className="text-xl font-semibold">Nova Human</div>

        <button
          onClick={goNewChat}
          className="mt-3 w-full rounded-md bg-white/5 px-3 py-2 text-sm text-zinc-100 hover:bg-white/10"
        >
          + New chat
        </button>
      </div>

      {/* Nav */}
      <nav className="px-3 pb-2 flex flex-col gap-1">
        <NavItem href="/" label="Chat" onClick={onNavigate} />
        <NavItem href="/direction" label="Direction" onClick={onNavigate} />
        <NavItem href="/habits" label="Habits" onClick={onNavigate} />
        <NavItem href="/check-in" label="Check-in" onClick={onNavigate} />
        <NavItem href="/dashboard" label="Dashboard" onClick={onNavigate} />
      </nav>

      <div className="mx-3 my-2 border-t border-white/10" />

      {/* Sessions */}
      <div className="px-3 pb-3 flex-1 overflow-y-auto flex flex-col gap-1">
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
                onClick={() => openChatSid(it.sid)}
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
  );
}

export default function SidebarClient() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // close drawer when route changes
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed left-4 top-4 z-50 rounded-xl border border-white/10 bg-zinc-950/70 px-3 py-2 text-zinc-100 backdrop-blur"
        aria-label="Open menu"
      >
        ☰
      </button>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-white/10 overflow-hidden">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <aside className="md:hidden fixed left-0 top-0 bottom-0 z-50 w-72 border-r border-white/10 bg-zinc-950">
            <SidebarContent onNavigate={() => setOpen(false)} />
          </aside>
        </>
      )}
    </>
  );
}
