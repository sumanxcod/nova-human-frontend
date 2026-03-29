"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/app/lib/api";

export default function SettingsPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await apiFetch<{ email?: string; name?: string }>("/auth/me");
        setEmail(data?.email || "");
        setName(data?.name || "");
      } catch {
        setEmail("");
        setName("");
      }
    }
    void load();
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen px-6">
      <div className="max-w-xl w-full bg-white/5 border border-white/10 rounded-xl p-8 space-y-6">

        <h1 className="text-2xl font-semibold">Settings</h1>

        <div>
          <label className="text-sm text-zinc-400">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded bg-white/5 border border-white/10"
          />
        </div>

        <div>
          <label className="text-sm text-zinc-400">Email</label>
          <input
            value={email}
            disabled
            className="w-full mt-1 px-3 py-2 rounded bg-white/5 border border-white/10 opacity-60"
          />
        </div>

        <button className="w-full py-2 rounded bg-white text-black font-medium">
          Save Changes (coming soon)
        </button>

      </div>
    </div>
  );
}
