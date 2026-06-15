"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../providers/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signupHint = Boolean(error && /sign up/i.test(error));

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const email = (emailRef.current?.value || "").trim().toLowerCase();
      const password = passwordRef.current?.value || "";

      await login(email, password);

      router.replace("/"); // or /chat or /today
    } catch (err: any) {
      setError(err?.message || "Login failed. Please try again.");
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
            <div
              className={
                signupHint
                  ? "mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100"
                  : "mb-6 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300"
              }
              role="alert"
            >
              <p className={signupHint ? "font-medium text-amber-50" : undefined}>{error}</p>
              {signupHint && (
                <a
                  href="/signup"
                  className="mt-3 inline-block text-sm font-medium text-blue-400 hover:text-blue-300 hover:underline"
                >
                  Go to sign up
                </a>
              )}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-300 mb-2">Email</label>
              <input
                ref={emailRef}
                type="email"
                name="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
                className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-300 mb-2">Password</label>
              <input
                ref={passwordRef}
                type="password"
                name="password"
                autoComplete="current-password"
                placeholder="••••••••"
                required
                className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="flex justify-between text-sm mt-2">
                <a href="/forgot-password" className="text-blue-600 hover:underline">
                  Forgot password?
                </a>

                <a href="/signup" className="text-blue-600 hover:underline">
                  Create account
                </a>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Logging in…" : "Log in"}
            </button>

          </form>

          <p className="mt-6 text-center text-xs text-zinc-500">
            Protected by Nova Human
          </p>
        </div>
      </div>
    </div>
  );
}
