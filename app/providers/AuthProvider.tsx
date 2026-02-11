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
  setAuthToken: (token: string, user?: User | null) => void;
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
        const url = `${base}/auth/login`;
        const requestBody = { email, password };

        // DIAGNOSTIC LOGGING
        console.group("🔐 LOGIN REQUEST DIAGNOSTIC");
        console.log("Base URL:", base);
        console.log("Full URL:", url);
        console.log("Email (exact):", JSON.stringify(email));
        console.log("Password length:", password.length);
        console.log("Request body:", JSON.stringify(requestBody));
        console.log("Request body keys:", Object.keys(requestBody));
        console.groupEnd();

        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        const responseText = await res.text();
        
        // DIAGNOSTIC LOGGING - RESPONSE
        console.group("🔐 LOGIN RESPONSE DIAGNOSTIC");
        console.log("Status:", res.status);
        console.log("Status Text:", res.statusText);
        console.log("Response body:", responseText);
        console.groupEnd();

        let data: any = {};
        try {
          data = JSON.parse(responseText);
        } catch {
          console.error("Failed to parse response as JSON");
        }

        if (!res.ok) {
          throw new Error(data?.detail || responseText || "Invalid email or password.");
        }

        const newToken = data?.token;
        if (!newToken) throw new Error("Missing token from server.");

        persistToken(newToken);
        setToken(newToken);
        setUser(data?.user || null);
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
