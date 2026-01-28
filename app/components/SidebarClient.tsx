"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import SidebarContent from "./Sidebar"; // or your SidebarContent component import

export default function SidebarClient() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // close drawer when route changes
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed left-4 top-4 z-[60] rounded-xl border border-white/10 bg-zinc-950/70 px-3 py-2 text-zinc-100 backdrop-blur"
        aria-label="Open menu"
      >
        ☰
      </button>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-white/10 overflow-hidden">
        <SidebarContent />
      </aside>

      {/* Mobile full-screen drawer */}
      {open && (
        <aside className="md:hidden fixed inset-0 z-[70] bg-zinc-950">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="text-sm font-medium text-zinc-100">Menu</div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg bg-white/10 border border-white/10 px-3 py-1 text-xs text-zinc-100"
            >
              Close
            </button>
          </div>

          <div className="h-[calc(100dvh-52px)] overflow-y-auto overscroll-contain [webkit-overflow-scrolling:touch]">
            <SidebarContent />
          </div>
        </aside>
      )}
    </>
  );
}
