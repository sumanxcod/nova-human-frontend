"use client";

import { useMemo, useState } from "react";
import { apiPost } from "../lib/api";

export default function ResetPasswordClient({ initialToken }: { initialToken: string }) {
  const token = useMemo(() => (initialToken || "").trim(), [initialToken]);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);

    if (!token) return setErr("Missing reset token. Please use the link from your email.");
    if (password.length < 8) return setErr("Password must be at least 8 characters.");
    if (password !== confirm) return setErr("Passwords do not match.");

    setLoading(true);
    try {
      await apiPost("/auth/reset-password", { token, new_password: password });

      setMsg("Password updated. Redirecting to login…");
      setTimeout(() => (window.location.href = "/login"), 900);
    } catch (e: any) {
      setErr(e?.message || "Reset failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="text-xl font-semibold text-zinc-100">Reset password</div>
        <p className="mt-1 text-sm text-zinc-400">
          Set a new password for your Nova Human account.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="New password"
            className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 text-sm outline-none focus:border-white/20 text-zinc-100"
          />
          <input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            type="password"
            placeholder="Confirm new password"
            className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 text-sm outline-none focus:border-white/20 text-zinc-100"
          />

          {err && <div className="text-sm text-red-400">{err}</div>}
          {msg && <div className="text-sm text-emerald-400">{msg}</div>}

          <button
            disabled={loading}
            className="w-full rounded-xl px-4 py-3 text-sm font-medium bg-white/10 border border-white/10 text-zinc-100 hover:bg-white/15 disabled:opacity-60"
          >
            {loading ? "Updating…" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
