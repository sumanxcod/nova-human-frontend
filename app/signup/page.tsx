"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, apiGet } from "../lib/api";
import { API_BASE } from "../lib/config";
import { useAuth } from "../providers/AuthProvider";

export default function SignupPage() {
  console.log("API_BASE_DEBUG", process.env.NEXT_PUBLIC_API_BASE_URL);
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  async function testBackend() {
    setTestResult("Testing...");
    try {
      await apiGet("/health");
      setTestResult("✅ Backend reachable");
    } catch (err: any) {
      setTestResult(`❌ ${err?.message || "Backend unreachable"}`);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return setError("Email is required.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");

    setLoading(true);
    try {
      const data = await apiFetch<{ token?: string; access_token?: string }>(
        "/auth/signup",
        {
          method: "POST",
          auth: false,
          body: JSON.stringify({ email: cleanEmail, password }),
        }
      );

      // Store token and redirect
      const token = data?.token || data?.access_token;
      if (!token) {
        setError("Signup failed: token missing.");
        return;
      }

      login(token);
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

        {/* Test Backend Button */}
        <div className="mt-4 text-center">
          <button
            onClick={testBackend}
            type="button"
            className="text-xs text-zinc-400 hover:text-zinc-200 underline"
          >
            Test backend connection
          </button>
          {testResult && (
            <div className="mt-2 text-xs text-zinc-300">{testResult}</div>
          )}
          {API_BASE && (
            <div className="mt-1 text-xs text-zinc-600">API: {API_BASE}</div>
          )}
        </div>

        <div className="mt-6 text-center text-xs text-zinc-500">Protected by Nova Human</div>
      </div>
    </div>
  );
}
