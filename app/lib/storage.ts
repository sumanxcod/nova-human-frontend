export type Msg = { role: "user" | "assistant"; content: string };

export const STORAGE_KEY = "nova_human_chat_v1";

export function loadMessages(defaultMessages: Msg[]): Msg[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultMessages;

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed as Msg[];
    return defaultMessages;
  } catch {
    return defaultMessages;
  }
}

export function saveMessages(messages: Msg[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // ignore
  }
}

export function clearMessages() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
