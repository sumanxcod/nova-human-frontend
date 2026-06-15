"use client";

import { FormEvent, useState } from "react";

const API_BASE = "http://127.0.0.1:8000";

type SafetyDecision = {
  risk_level: string;
  primary_action: string;
  emergency_number: string | null;
  should_call_llm: boolean;
  steps: string[];
  reason: string;
};

type FormState = {
  danger_type: string;
  country_code: string;
  battery_level: string;
  network_status: string;
  location_available: boolean;
  trusted_contact_available: boolean;
  user_can_talk: boolean;
  message: string;
};

const INITIAL_FORM: FormState = {
  danger_type: "unknown",
  country_code: "US",
  battery_level: "",
  network_status: "online",
  location_available: false,
  trusted_contact_available: false,
  user_can_talk: true,
  message: "",
};

function riskBadgeClass(risk: string) {
  switch (risk) {
    case "critical":
      return "bg-red-500/20 text-red-200 border-red-500/30";
    case "high":
      return "bg-orange-500/20 text-orange-200 border-orange-500/30";
    case "medium":
      return "bg-yellow-500/20 text-yellow-200 border-yellow-500/30";
    default:
      return "bg-emerald-500/20 text-emerald-200 border-emerald-500/30";
  }
}

export default function SafetyPage() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [decision, setDecision] = useState<SafetyDecision | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setDecision(null);

    const payload: Record<string, unknown> = {
      danger_type: form.danger_type,
      country_code: form.country_code,
      network_status: form.network_status,
      location_available: form.location_available,
      trusted_contact_available: form.trusted_contact_available,
      user_can_talk: form.user_can_talk,
    };

    if (form.message.trim()) {
      payload.message = form.message.trim();
    }

    if (form.battery_level !== "") {
      payload.battery_level = Number(form.battery_level);
    }

    try {
      const response = await fetch(`${API_BASE}/safety/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Request failed (${response.status})`);
      }

      const data = (await response.json()) as SafetyDecision;
      setDecision(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-[16px] outline-none focus:border-white/20";

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-6 pb-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Safety Check</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Describe your situation. Nova will return a deterministic safety decision.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="nova-panel space-y-4 p-5">
        <label className="block space-y-2">
          <span className="text-sm text-zinc-300">Danger type</span>
          <select
            className={inputClass}
            value={form.danger_type}
            onChange={(e) => setForm((prev) => ({ ...prev, danger_type: e.target.value }))}
          >
            <option value="unknown">Unknown</option>
            <option value="medical">Medical</option>
            <option value="violence">Violence</option>
            <option value="lost">Lost</option>
            <option value="panic">Panic</option>
          </select>
        </label>

        <label className="block space-y-2">
          <span className="text-sm text-zinc-300">Country code</span>
          <select
            className={inputClass}
            value={form.country_code}
            onChange={(e) => setForm((prev) => ({ ...prev, country_code: e.target.value }))}
          >
            <option value="US">US</option>
            <option value="NP">NP</option>
            <option value="IN">IN</option>
            <option value="UK">UK</option>
            <option value="EU">EU</option>
          </select>
        </label>

        <label className="block space-y-2">
          <span className="text-sm text-zinc-300">Battery level (%)</span>
          <input
            type="number"
            min={0}
            max={100}
            placeholder="Optional"
            className={inputClass}
            value={form.battery_level}
            onChange={(e) => setForm((prev) => ({ ...prev, battery_level: e.target.value }))}
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm text-zinc-300">Network status</span>
          <select
            className={inputClass}
            value={form.network_status}
            onChange={(e) => setForm((prev) => ({ ...prev, network_status: e.target.value }))}
          >
            <option value="online">Online</option>
            <option value="weak">Weak</option>
            <option value="offline">Offline</option>
          </select>
        </label>

        <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-4">
          <label className="flex items-center gap-3 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={form.location_available}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, location_available: e.target.checked }))
              }
              className="h-4 w-4 rounded border-white/20"
            />
            Location available
          </label>

          <label className="flex items-center gap-3 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={form.trusted_contact_available}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, trusted_contact_available: e.target.checked }))
              }
              className="h-4 w-4 rounded border-white/20"
            />
            Trusted contact available
          </label>

          <label className="flex items-center gap-3 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={form.user_can_talk}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, user_can_talk: e.target.checked }))
              }
              className="h-4 w-4 rounded border-white/20"
            />
            User can talk
          </label>
        </div>

        <label className="block space-y-2">
          <span className="text-sm text-zinc-300">Message (optional)</span>
          <textarea
            rows={4}
            placeholder="What is happening right now?"
            className={`${inputClass} resize-y`}
            value={form.message}
            onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-white py-3 font-medium text-black disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Checking..." : "Get Safety Decision"}
        </button>
      </form>

      {error && (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {decision && (
        <div className="nova-panel mt-6 space-y-4 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">Decision</h2>
            <span
              className={`rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide ${riskBadgeClass(
                decision.risk_level
              )}`}
            >
              {decision.risk_level}
            </span>
          </div>

          <div className="space-y-2 text-sm">
            <p>
              <span className="text-zinc-400">Primary action:</span>{" "}
              <span className="font-medium">{decision.primary_action}</span>
            </p>
            <p>
              <span className="text-zinc-400">Emergency number:</span>{" "}
              <span className="font-medium">{decision.emergency_number ?? "—"}</span>
            </p>
            <p>
              <span className="text-zinc-400">Should call LLM:</span>{" "}
              <span className="font-medium">{decision.should_call_llm ? "Yes" : "No"}</span>
            </p>
            <p>
              <span className="text-zinc-400">Reason:</span> {decision.reason}
            </p>
          </div>

          {decision.steps.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-zinc-300">Steps</h3>
              <ol className="list-decimal space-y-2 pl-5 text-sm text-zinc-200">
                {decision.steps.map((step, index) => (
                  <li key={`${index}-${step.slice(0, 24)}`}>{step}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
