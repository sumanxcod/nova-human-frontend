import type { Metadata } from "next";
import "./globals.css";
import { Suspense } from "react";
import SidebarClient from "./components/SidebarClient";

export const metadata: Metadata = {
  title: "Nova Human",
  description: "Nova Human — chat-first personal OS",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="text-zinc-100">
        <div className="h-screen overflow-hidden flex">
          {/* Toggle (mobile) */}
          <input id="nav" type="checkbox" className="hidden peer" />

          {/* Hamburger button (mobile) */}
          <label
            htmlFor="nav"
            className="md:hidden fixed top-3 left-3 z-50 rounded-lg px-3 py-2 bg-zinc-900/80 border border-zinc-700"
          >
            ☰
          </label>

          {/* Backdrop (mobile) */}
          <label
            htmlFor="nav"
            className="md:hidden fixed inset-0 z-40 bg-black/50 hidden peer-checked:block"
          />

          {/* Sidebar (desktop) */}
          <div className="hidden md:block">
            <Suspense fallback={null}>
              <SidebarClient />
            </Suspense>
          </div>

          {/* Sidebar drawer (mobile) */}
          <div className="md:hidden fixed top-0 left-0 z-50 h-full w-[85vw] max-w-[320px] bg-zinc-950 border-r border-zinc-800 -translate-x-full transition-transform duration-200 peer-checked:translate-x-0">
            <div className="h-full overflow-auto">
              <Suspense fallback={null}>
                <SidebarClient />
              </Suspense>
            </div>
          </div>

          {/* Main */}
          <main className="flex-1 flex flex-col overflow-hidden w-full">
            <div className="flex-1 overflow-hidden">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
