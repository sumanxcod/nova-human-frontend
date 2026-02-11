"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../lib/api";
import { useAuth } from "../providers/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await apiFetch<{
        token?: string;
        access_token?: string;
        detail?: string;
      }>(
        "/auth/login",
        {
          method: "POST",
          auth: false,
          body: JSON.stringify({ email, password }),
        }
      );

      // Store token
      const token = data?.token || data?.access_token;
      if (!token) {
        throw new Error(data?.detail || "Login failed: token missing");
      }

      login(token);
      router.replace("/chat");
    } catch (err: any) {
      let message = err?.message || "An error occurred. Please try again.";

      const bodyText = err?.bodyText;
      if (typeof bodyText === "string" && bodyText.trim()) {
        try {
          const parsed = JSON.parse(bodyText) as { detail?: string };
          if (parsed?.detail) message = parsed.detail;
        } catch {
          message = bodyText;
        }
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-semibold text-zinc-100">Nova Human</h1>
            <p className="mt-2 text-sm text-zinc-400">Sign in to your account</p>
          </div>

          {error && (
            <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-300 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-300 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Logging in…" : "Log in"}
            </button>

            <div className="mt-4 text-center text-sm text-zinc-400">
              Don&apos;t have an account?{" "}
              <a href="/signup" className="text-zinc-100 hover:underline">
                Create one
              </a>
            </div>
          </form>

          <p className="mt-6 text-center text-xs text-zinc-500">
            Protected by Nova Human
          </p>
        </div>
      </div>
    </div>
  );
}
