"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet } from "../lib/api";
import { getToken, logout } from "../lib/auth";

type Me = {
  id: number | string;
  email?: string;
  created_at?: string;
};

function getInitial(email?: string) {
  if (!email) return "?";
  const trimmed = email.trim();
  return trimmed ? trimmed[0]!.toUpperCase() : "?";
}

export default function AccountMenu() {
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setMe(null);
      return;
    }

    let mounted = true;
    setLoading(true);
    apiGet("/auth/me")
      .then((data) => {
        if (!mounted) return;
        setMe(data as Me);
      })
      .catch(() => {
        if (!mounted) return;
        setMe(null);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeydown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeydown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeydown);
    };
  }, []);

  const token = getToken();

  if (!token) {
    return (
      <div className="absolute right-4 top-4 z-[60]">
        <button
          onClick={() => router.push("/login")}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-100 hover:bg-white/10"
        >
          Login
        </button>
      </div>
    );
  }

  return (
    <div className="absolute right-4 top-4 z-[60]" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold text-zinc-100 hover:bg-white/10"
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
      >
        {loading ? "…" : getInitial(me?.email)}
      </button>

      {open && (
        <div className="mt-2 w-56 rounded-xl border border-white/10 bg-zinc-950/95 p-2 shadow-xl backdrop-blur">
          {me?.email && (
            <div className="px-3 py-2 text-xs text-zinc-400">
              {me.email}
            </div>
          )}

          <button
            onClick={() => {
              setOpen(false);
              router.push("/profile");
            }}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-100 hover:bg-white/5"
          >
            Profile
          </button>
          <button
            onClick={() => {
              setOpen(false);
              router.push("/settings");
            }}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-100 hover:bg-white/5"
          >
            Settings
          </button>
          <button
            onClick={() => {
              setOpen(false);
              router.push("/forgot-password");
            }}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-100 hover:bg-white/5"
          >
            Forgot password
          </button>

          <div className="my-2 border-t border-white/10" />

          <button
            onClick={() => logout()}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-300 hover:bg-white/5"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
