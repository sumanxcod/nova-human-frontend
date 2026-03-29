"use client";

import { useEffect, useState } from "react";
import { apiFetch, apiGet } from "../lib/api";
import { getToken } from "../lib/auth";

type Me = {
  id: number | string;
  name?: string;
  email?: string;
  created_at?: string;
};

export default function ProfilePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

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
        const profile = data as Me;
        setMe(profile);
        setName(profile?.name || "");
        setEmail(profile?.email || "");
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

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!me) return;

    const nextName = name.trim();
    const nextEmail = email.trim();
    if (!nextEmail) {
      setErr("Email is required.");
      setMsg(null);
      return;
    }

    setSaving(true);
    setErr(null);
    setMsg(null);

    try {
      const res = await apiFetch<{ status?: string }>("/user/profile", {
        method: "PUT",
        body: JSON.stringify({ name: nextName || undefined, email: nextEmail }),
      });
      console.log("profile save success:", res);

      const updated = await apiFetch<Me>("/auth/me");
      setMe(updated);
      setName(updated?.name || "");
      setEmail(updated?.email || nextEmail);
      setMsg("Profile updated.");
    } catch (error: any) {
      console.error("profile save error:", error);
      setErr(error?.message || "Could not update profile.");
    } finally {
      setSaving(false);
    }
  }

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
            <form
              onSubmit={saveProfile}
              className="space-y-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
            >
              <div>
                <div className="text-xs text-zinc-400">Name</div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-zinc-100 placeholder:text-zinc-500 outline-none"
                  placeholder="Your name"
                />
              </div>
              <div>
                <div className="text-xs text-zinc-400">Email</div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-zinc-100 placeholder:text-zinc-500 outline-none"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-100 hover:bg-white/10 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                {msg && <div className="text-xs text-green-400">{msg}</div>}
              </div>
              {err && <div className="text-xs text-red-400">{err}</div>}
            </form>
          )}

          {!loading && me && (
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="text-xs text-zinc-400">Created at</div>
              <div className="mt-1 text-zinc-100">{me.created_at || "—"}</div>
            </div>
          )}
        </div>

        <div className="mt-6 text-center text-xs text-zinc-500">
          Protected by Nova Human
        </div>
      </div>
    </div>
  );
}
