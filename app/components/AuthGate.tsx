"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet } from "../lib/api";
import { getToken } from "../lib/auth";

type AuthGateProps = {
  children: React.ReactNode;
};

export default function AuthGate({ children }: AuthGateProps) {
  const router = useRouter();
  const [isAuthed, setIsAuthed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const token = getToken();
    if (!token || !token.trim()) {
      router.push("/login");
      setLoading(false);
      return;
    }

    apiGet("/auth/me")
      .then(() => {
        if (!mounted) return;
        setIsAuthed(true);
      })
      .catch(() => {
        if (!mounted) return;
        setIsAuthed(false);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-sm text-zinc-400">Loading…</div>
      </div>
    );
  }

  return isAuthed ? <>{children}</> : null;
}
