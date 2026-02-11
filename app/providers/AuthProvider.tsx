"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { clearToken, getToken, setToken as persistToken } from "../lib/auth";

type User = {
  id?: string;
  email?: string;
  name?: string;
};

type AuthState = {
  token: string | null;
  user: User | null;
  authReady: boolean;
  isAuthed: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const t = getToken();
    setToken(t);
    setAuthReady(true);
  }, []);

  const value = useMemo<AuthState>(() => {
    return {
      token,
      user,
      authReady,
      isAuthed: !!token,
      login: async (email: string, password: string) => {
        const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");
        const res = await fetch(`${base}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.detail || "Invalid email or password.");
        }

        const newToken = data?.token;
        if (!newToken) throw new Error("Missing token from server.");

        persistToken(newToken);
        setToken(newToken);
        setUser(data?.user || null);
      },
      logout: () => {
        clearToken();
        setToken(null);
        setUser(null);
      },
    };
  }, [token, user, authReady]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
