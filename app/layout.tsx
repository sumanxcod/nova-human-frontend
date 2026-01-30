import type { Metadata } from "next";
import "./globals.css";
import PreviewGate from "./components/PreviewGate";
import { Suspense } from "react";
import SidebarClient from "./components/SidebarClient";
import MobileShell from "./mobile-shell";
import MobileTabs from "./components/MobileTabs";

export const metadata: Metadata = {
  title: "Nova Human",
  description: "Nova Human — chat-first personal OS",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="text-zinc-100">
        <MobileShell>
          <Suspense fallback={null}>
            <SidebarClient />
          </Suspense>

          <main className="flex-1 flex flex-col overflow-hidden w-full">
            <div className="flex-1 overflow-hidden pb-16 md:pb-0">
              {children}
            </div>
           </main>
           <PreviewGate>
           {children}
           </PreviewGate>

          <MobileTabs />
        </MobileShell>
      </body>
    </html>
  );
}

