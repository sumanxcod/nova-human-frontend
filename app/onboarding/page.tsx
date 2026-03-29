"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthGate from "../components/AuthGate";
import { apiFetch } from "../lib/api";
import { useAuth } from "../providers/AuthProvider";

type Me = {
  id?: string;
  email?: string;
  name?: string;
  onboarding_completed?: boolean;
};

export default function OnboardingPage() {
  const router = useRouter();
  const { authReady, token, user, setAuthToken } = useAuth();
  const [goal, setGoal] = useState("");
  const [situation, setSituation] = useState("");
  const [focus, setFocus] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authReady) return;
    if (user?.onboarding_completed) {
      router.replace("/chat");
    }
  }, [authReady, user?.onboarding_completed, router]);

  async function handleSubmit() {
    if (saving) return;

    setError(null);
    setSaving(true);

    try {
      await apiFetch("/user/onboarding", {
        method: "POST",
        body: JSON.stringify({ goal, situation, focus }),
      });

      try {
        const me = await apiFetch<Me>("/auth/me");
        if (token) {
          setAuthToken(token, me || user || null);
        }
      } catch {
        if (token) {
          setAuthToken(token, {
            ...(user || {}),
            onboarding_completed: true,
          });
        }
      }

      router.push("/chat");
    } catch (e: any) {
      setError(e?.message || "Could not save onboarding.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthGate>
      <div className="flex min-h-screen items-center justify-center px-6 py-8">
        <div className="w-full max-w-xl space-y-6 rounded-xl border border-white/10 bg-white/5 p-8">
          <h1 className="text-xl font-semibold text-zinc-100">Let’s set you up</h1>

          <textarea
            placeholder="What are you trying to achieve?"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="min-h-24 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none"
          />

          <textarea
            placeholder="What’s your current situation?"
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            className="min-h-24 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none"
          />

          <textarea
            placeholder="What do you need help with most?"
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            className="min-h-24 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none"
          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="w-full rounded-lg border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Continue"}
          </button>
        </div>
      </div>
    </AuthGate>
  );
}
