"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import AccountMenu from "./AccountMenu";

function titleFromPath(pathname: string) {
  const clean = pathname.split("?")[0] || "/";
  const segments = clean.split("/").filter(Boolean);

  if (segments.length === 0) return "Nova Human";

  const key = segments[0];
  switch (key) {
    case "chat":
      return "Chat";
    case "direction":
      return "Direction";
    case "habits":
      return "Action Plan";
    case "checkin":
      return "Checkin";
    case "dashboard":
      return "Dashboard";
    case "reflection":
      return "Weekly Reflection";
    case "history":
      return "History";
    case "profile":
      return "Profile";
    case "settings":
      return "Settings";
    case "forgot-password":
      return "Forgot Password";
    case "reset-password":
      return "Reset Password";
    case "login":
      return "Login";
    case "signup":
      return "Sign Up";
    default:
      return key.charAt(0).toUpperCase() + key.slice(1);
  }
}

export default function Header() {
  const pathname = usePathname();
  const title = useMemo(() => titleFromPath(pathname), [pathname]);

  return (
    <header className="shrink-0 border-b border-white/10 bg-black/40 backdrop-blur">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="text-sm font-semibold text-zinc-100 md:text-base">
          {title}
        </div>
        <div className="flex items-center gap-2">
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}
