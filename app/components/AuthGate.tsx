"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type AuthGateProps = {
  children: React.ReactNode;
};

export default function AuthGate({ children }: AuthGateProps) {
  const router = useRouter();
  const [isAuthed, setIsAuthed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const token = localStorage.getItem("nh_token");
      if (!token || !token.trim()) {
        router.push("/login");
        return;
      }
      setIsAuthed(true);
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
    }
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
