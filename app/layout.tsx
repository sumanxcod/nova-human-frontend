import type { Metadata } from "next";
import "./globals.css";
import { Suspense } from "react";
import SidebarClient from "./components/SidebarClient";
import MobileShell from "./mobile-shell";

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
        <MobileShell>
          {/* Desktop sidebar */}
          <div className="hidden md:block">
            <Suspense fallback={null}>
              <SidebarClient />
            </Suspense>
          </div>

          {/* Main */}
          <main className="flex-1 flex flex-col overflow-hidden w-full">
            <div className="flex-1 overflow-hidden">{children}</div>
          </main>
        </MobileShell>
      </body>
    </html>
  );
}
