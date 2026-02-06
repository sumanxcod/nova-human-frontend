"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    apiGet("/auth/me")
      .then((data: any) => {
        if (!mounted) return;
        if (data?.email) setEmail(String(data.email));
      })
      .catch(() => {
        // ignore if not logged in
      });

    return () => {
      mounted = false;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setMessage("Email is required.");
      return;
    }

    setLoading(true);
    try {
      await apiPost("/auth/forgot-password", { email: cleanEmail });
      setMessage("If the account exists, a reset link was sent.");
    } catch {
      setMessage("If the account exists, a reset link was sent.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 shadow-xl">
        <div className="text-center">
          <div className="text-2xl font-semibold text-zinc-100">Forgot password</div>
          <div className="mt-1 text-sm text-zinc-400">
            We will email you a reset link.
          </div>
        </div>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label className="text-sm text-zinc-300">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-white/20"
              placeholder="you@example.com"
            />
          </div>

          {message && (
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-200">
              {message}
            </div>
          )}

          <button
            disabled={loading}
            className="w-full rounded-xl bg-white/10 border border-white/10 px-4 py-3 text-sm font-medium text-zinc-100 hover:bg-white/15 disabled:opacity-60"
          >
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-zinc-500">Protected by Nova Human</div>
      </div>
    </div>
  );
}
