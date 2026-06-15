const SAFETY_API_BASE = "http://127.0.0.1:8000";

export type SafetyDecisionPayload = {
  message: string;
  danger_type: string;
  country_code: string;
  battery_level: null;
  network_status: string;
  location_available: boolean;
  trusted_contact_available: boolean;
  user_can_talk: boolean;
};

export type SafetyDecision = {
  risk_level: string;
  primary_action: string;
  emergency_number: string | null;
  should_call_llm: boolean;
  steps: string[];
  reason: string;
};

const MEDICAL_PHRASES = [
  "chest pain",
  "bleeding",
  "can't breathe",
  "cannot breathe",
  "fainted",
  "injured",
];

const VIOLENCE_PHRASES = [
  "following me",
  "attacked",
  "someone is chasing",
  "unsafe",
  "danger",
];

const LOST_PHRASES = ["lost", "can't find my way", "where am i"];

const PANIC_PHRASES = ["panic", "panicking", "scared", "terrified", "anxiety"];

function basePayload(message: string, danger_type: string): SafetyDecisionPayload {
  return {
    message,
    danger_type,
    country_code: "US",
    battery_level: null,
    network_status: "online",
    location_available: false,
    trusted_contact_available: false,
    user_can_talk: true,
  };
}

export function detectSafetyFromMessage(message: string): SafetyDecisionPayload | null {
  const text = (message || "").trim();
  if (!text) return null;

  const lower = text.toLowerCase();

  if (MEDICAL_PHRASES.some((phrase) => lower.includes(phrase))) {
    return basePayload(text, "medical");
  }
  if (VIOLENCE_PHRASES.some((phrase) => lower.includes(phrase))) {
    return basePayload(text, "violence");
  }
  if (LOST_PHRASES.some((phrase) => lower.includes(phrase))) {
    return basePayload(text, "lost");
  }
  if (PANIC_PHRASES.some((phrase) => lower.includes(phrase))) {
    return basePayload(text, "panic");
  }

  return null;
}

export async function fetchSafetyDecision(
  payload: SafetyDecisionPayload
): Promise<SafetyDecision> {
  const response = await fetch(`${SAFETY_API_BASE}/safety/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Safety check failed (${response.status})`);
  }

  return response.json() as Promise<SafetyDecision>;
}
