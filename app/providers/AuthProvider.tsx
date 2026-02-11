"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { clearToken, getToken, setToken as persistToken } from "../lib/auth";

type AuthState = {
  token: string | null;
  authReady: boolean;
  isAuthed: boolean;
  login: (token: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const t = getToken();
    setToken(t);
    setAuthReady(true);
  }, []);

  const value = useMemo<AuthState>(() => {
    return {
      token,
      authReady,
      isAuthed: !!token,
      login: (newToken: string) => {
        persistToken(newToken);
        setToken(newToken);
      },
      logout: () => {
        clearToken();
        setToken(null);
      },
    };
  }, [token, authReady]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
