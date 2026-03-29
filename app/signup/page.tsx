"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../lib/api";
import { useAuth } from "../providers/AuthProvider";

export default function SignupPage() {
  const router = useRouter();
  const { setAuthToken } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return setError("Email is required.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");

    setLoading(true);
    try {
      const data = await apiFetch<{ token?: string; access_token?: string; user?: any }>(
        "/auth/signup",
        {
          method: "POST",
          auth: false,
          body: JSON.stringify({
            name: cleanName || undefined,
            email: cleanEmail,
            password,
          }),
        }
      );

      // Store token and redirect
      const token = data?.token || data?.access_token;
      if (!token) {
        setError("Signup failed: token missing.");
        return;
      }

      setAuthToken(token, data?.user || { name: cleanName || undefined, email: cleanEmail });
      router.replace("/chat");
    } catch (err: any) {
      setError(err?.message || "Signup failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 shadow-xl">
        <div className="text-center">
          <div className="text-2xl font-semibold text-zinc-100">Nova Human</div>
          <div className="mt-1 text-sm text-zinc-400">Create your account</div>
        </div>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label className="text-sm text-zinc-300">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              type="text"
              autoComplete="name"
              className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-white/20"
              placeholder="Your name"
            />
          </div>

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

          <div>
            <label className="text-sm text-zinc-300">Phone (optional)</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
              autoComplete="tel"
              className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-white/20"
              placeholder="+1 555 123 4567"
            />
          </div>

          <div>
            <label className="text-sm text-zinc-300">Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="new-password"
              className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-white/20"
              placeholder="At least 8 characters"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <button
            disabled={loading}
            className="w-full rounded-xl bg-white/10 border border-white/10 px-4 py-3 text-sm font-medium text-zinc-100 hover:bg-white/15 disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create account"}
          </button>

          <div className="text-center text-sm text-zinc-400">
            Already have an account?{" "}
            <a href="/login" className="text-zinc-100 hover:underline">
              Log in
            </a>
          </div>
        </form>

        <div className="mt-6 text-center text-xs text-zinc-500">Protected by Nova Human</div>
      </div>
    </div>
  );
}
