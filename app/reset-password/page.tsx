"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiPost } from "../lib/api";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Reset token is missing.");
    }
  }, [token]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!token) {
      setError("Reset token is missing.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await apiPost("/auth/reset-password", { token, password });
      setMessage("Password updated. Redirecting to login...");
      setTimeout(() => router.push("/login"), 1200);
    } catch (err: any) {
      setError(err?.message || "Reset failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 shadow-xl">
        <div className="text-center">
          <div className="text-2xl font-semibold text-zinc-100">Reset password</div>
          <div className="mt-1 text-sm text-zinc-400">Choose a new password.</div>
        </div>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label className="text-sm text-zinc-300">New password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="new-password"
              className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-white/20"
              placeholder="At least 8 characters"
            />
          </div>

          <div>
            <label className="text-sm text-zinc-300">Confirm password</label>
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              type="password"
              autoComplete="new-password"
              className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-white/20"
              placeholder="Repeat password"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {message && (
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-200">
              {message}
            </div>
          )}

          <button
            disabled={loading}
            className="w-full rounded-xl bg-white/10 border border-white/10 px-4 py-3 text-sm font-medium text-zinc-100 hover:bg-white/15 disabled:opacity-60"
          >
            {loading ? "Updating..." : "Update password"}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-zinc-500">Protected by Nova Human</div>
      </div>
    </div>
  );
}
