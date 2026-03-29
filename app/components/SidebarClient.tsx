"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Sidebar from "./Sidebar";
function SidebarContent() {
  return <Sidebar />;
}
export default function SidebarClient() {
  const [open, setOpen] = useState(false);
  const [startX, setStartX] = useState(0);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sid = searchParams.get("sid") || "";

  useEffect(() => {
    setOpen(false);
  }, [pathname, sid]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed left-4 top-4 z-[60] rounded-xl border border-white/10 bg-zinc-950/70 px-3 py-2 text-zinc-100 backdrop-blur"
        aria-label="Open menu"
      >
        ☰
      </button>

      <aside className="hidden md:flex w-64 flex-col border-r border-white/10 overflow-hidden">
        <Sidebar />
      </aside>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`
          md:hidden fixed top-0 left-0 h-full w-[80%] max-w-sm
          bg-black z-50 transform transition-transform duration-300
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
        onTouchStart={(e) => setStartX(e.touches[0].clientX)}
        onTouchEnd={(e) => {
          const diff = e.changedTouches[0].clientX - startX;
          if (diff < -50) setOpen(false);
        }}
      >
        <Sidebar />
      </aside>
    </>
  );
}
