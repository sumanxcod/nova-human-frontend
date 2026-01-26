import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "./components/Sidebar";

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
          {/* ChatGPT-style sidebar (includes History + Settings) */}
          <Sidebar />

          {/* Main */}
          <main className="flex-1 flex flex-col overflow-hidden">
            {/* Children fill remaining height; each page controls its own scroll */}
            <div className="flex-1 overflow-hidden">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}