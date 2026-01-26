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
          <Suspense fallback={null}>
            <SidebarClient />
          </Suspense>

          <main className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-hidden">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
