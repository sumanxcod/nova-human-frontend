"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "../../lib/api";
import { setToken } from "../../lib/auth";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordValid = password.length >= 8;

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!passwordValid) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      const data = await apiPost("/auth/signup", { email, password });

      // Store token
      const token = data?.token || data?.access_token || "";
      if (token) {
        setToken(token);
      }

      // Redirect to chat
      router.push("/chat");
    } catch (err: any) {
      setError(err?.message || "An error occurred. Please try again.");
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
            <p className="mt-2 text-sm text-zinc-400">Create your account</p>
          </div>

          {error && (
            <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
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
                minLength={8}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className={`mt-2 text-xs ${passwordValid ? "text-emerald-400" : "text-zinc-500"}`}>
                {password.length > 0 ? (passwordValid ? "✓ Secure password" : "✗ Min 8 characters") : "Min 8 characters"}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !passwordValid}
              className="mt-6 w-full rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Creating account…" : "Create account"}
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
