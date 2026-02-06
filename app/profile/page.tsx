"use client";

import { useEffect, useState } from "react";
import { apiGet } from "../lib/api";
import { getToken } from "../lib/auth";

type Me = {
  id: number | string;
  email?: string;
  created_at?: string;
};

export default function ProfilePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    let mounted = true;
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

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 shadow-xl">
        <div className="text-center">
          <div className="text-2xl font-semibold text-zinc-100">Profile</div>
          <div className="mt-1 text-sm text-zinc-400">Your account details</div>
        </div>

        <div className="mt-8 space-y-3 text-sm text-zinc-200">
          {loading && <div className="text-zinc-400">Loading...</div>}

          {!loading && !me && (
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              You are not logged in.
            </div>
          )}

          {!loading && me && (
            <>
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-xs text-zinc-400">Email</div>
                <div className="mt-1 text-zinc-100">{me.email || "—"}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-xs text-zinc-400">Created at</div>
                <div className="mt-1 text-zinc-100">{me.created_at || "—"}</div>
              </div>
            </>
          )}
        </div>

        <div className="mt-6 text-center text-xs text-zinc-500">Protected by Nova Human</div>
      </div>
    </div>
  );
}
