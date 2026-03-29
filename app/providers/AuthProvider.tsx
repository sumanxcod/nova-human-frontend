"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { clearToken, getToken, setToken as persistToken } from "../lib/auth";
import { apiFetch } from "../lib/api";

type User = {
  id?: string;
  email?: string;
  name?: string;
  onboarding_completed?: boolean;
  /** When returned by API, used for personalized chat suggestions */
  goal?: string;
  situation?: string;
  focus?: string;
};

type AuthState = {
  token: string | null;
  user: User | null;
  authReady: boolean;
  isAuthed: boolean;
  login: (email: string, password: string) => Promise<void>;
  setAuthToken: (token: string, user?: User | null) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      const t = getToken();

      if (!t) {
        setAuthReady(true);
        return;
      }

      setToken(t);

      try {
        const me = await apiFetch<User>("/auth/me");
        setUser(me || null);
      } catch {
        clearToken();
        setToken(null);
        setUser(null);
      } finally {
        setAuthReady(true);
      }
    };

    void initAuth();
  }, []);

  const value = useMemo<AuthState>(() => {
    return {
      token,
      user,
      authReady,
      isAuthed: !!token,
      login: async (email: string, password: string) => {
        const data = await apiFetch<any>("/auth/login", {
          method: "POST",
          auth: false,
          body: JSON.stringify({ email, password }),
        });
        const newToken = data?.token || data?.access_token;
        if (!newToken) throw new Error("Missing token from server.");

        persistToken(newToken);
        setToken(newToken);

        try {
          const me = await apiFetch<User>("/auth/me");
          setUser(me || null);
        } catch {
          clearToken();
          setToken(null);
          setUser(null);
          throw new Error("Login session is invalid.");
        }
      },
      setAuthToken: (newToken: string, userData?: User | null) => {
        persistToken(newToken);
        setToken(newToken);
        setUser(userData || null);
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
