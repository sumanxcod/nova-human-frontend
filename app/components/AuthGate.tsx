"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../providers/AuthProvider";

type AuthGateProps = {
  children: React.ReactNode;
};

export default function AuthGate({ children }: AuthGateProps) {
  const { authReady, isAuthed } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!authReady) return;

    const isPublic = pathname === "/login" || pathname === "/signup";
    if (!isAuthed && !isPublic) {
      router.replace("/login");
    }
    if (isAuthed && (pathname === "/login" || pathname === "/signup")) {
      router.replace("/chat");
    }
  }, [authReady, isAuthed, pathname, router]);

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center text-zinc-400">
        Loading…
      </div>
    );
  }

  const isPublic = pathname === "/login" || pathname === "/signup";
  if (!isAuthed && !isPublic) return null;

  return <>{children}</>;
}
