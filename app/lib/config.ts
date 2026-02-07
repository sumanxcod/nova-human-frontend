const ENV_API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").trim();

function resolveApiBase() {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const isLocal = host === "localhost" || host === "127.0.0.1";

    if (isLocal) {
      return ENV_API_BASE || "http://localhost:8000";
    }

    if (!ENV_API_BASE) {
      console.error(
        "NEXT_PUBLIC_API_BASE_URL is not set. Set it to your backend URL (e.g. https://api.example.com)."
      );
      return "";
    }

    return ENV_API_BASE;
  }

  if (ENV_API_BASE) return ENV_API_BASE;
  if (process.env.NODE_ENV !== "production") return "http://localhost:8000";

  console.error(
    "NEXT_PUBLIC_API_BASE_URL is not set. Set it to your backend URL (e.g. https://api.example.com)."
  );
  return "";
}

export const API_BASE = resolveApiBase().replace(/\/+$/, "");
