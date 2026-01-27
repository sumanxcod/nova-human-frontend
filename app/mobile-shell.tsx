"use client";

import { useState } from "react";
import { Suspense } from "react";
import SidebarClient from "./components/SidebarClient";

export default function MobileShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="h-screen overflow-hidden flex relative">
      {/* Mobile hamburger */}
      <button
        className="md:hidden fixed top-3 left-3 z-[60] rounded-lg px-3 py-2 bg-zinc-900/80 border border-zinc-700"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
      >
        ☰
      </button>

      {/* Mobile backdrop */}
      {open && (
        <button
          className="md:hidden fixed inset-0 z-[50] bg-black/60"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
        />
      )}

      {/* Mobile drawer */}
      <div
        className={[
          "md:hidden fixed top-0 left-0 z-[55] h-full w-[85vw] max-w-[320px]",
          "bg-zinc-950 border-r border-zinc-800",
          "transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <div className="h-full overflow-auto">
          <div className="p-3 flex justify-end">
            <button
              className="rounded-lg px-3 py-2 bg-white/5 border border-white/10"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>

          <Suspense fallback={null}>
            {/* IMPORTANT: Sidebar itself must NOT have hidden md:flex */}
            <SidebarClient />
          </Suspense>
        </div>
      </div>

      {/* App content */}
      {children}
    </div>
  );
}
