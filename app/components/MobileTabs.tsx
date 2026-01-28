"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Chat" },
  { href: "/direction", label: "Direction" },
  { href: "/habits", label: "Habits" },
  { href: "/checkin", label: "Checkin" },
  { href: "/dashboard", label: "Dashboard" },
];

export default function MobileTabs() {
  const path = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-black/70 backdrop-blur">
      <div className="mx-auto max-w-xl grid grid-cols-5">
        {tabs.map((t) => {
          const active =
            path === t.href || (t.href !== "/" && path.startsWith(t.href));
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`py-3 text-center text-[12px] ${
                active ? "text-white" : "text-zinc-400"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
