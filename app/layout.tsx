import type { Metadata } from "next";
import "./globals.css";
import PreviewGate from "./components/PreviewGate";
import { Suspense } from "react";
import SidebarClient from "./components/SidebarClient";
import MobileShell from "./mobile-shell";
import MobileTabs from "./components/MobileTabs";

export const metadata: Metadata = {
  title: "Nova Human",
  description: "AI life-partner / thinking agent",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Nova Human",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="text-zinc-100" suppressHydrationWarning>
        <MobileShell>
          <Suspense fallback={null}>
            <SidebarClient />
          </Suspense>

         <main className="flex-1 flex flex-col min-h-0 w-full">
         <div className="flex-1 min-h-0 overflow-y-auto pb-16 md:pb-0">
         {children}
       </div>
       </main>


          <MobileTabs />
        </MobileShell>
      </body>
    </html>
  );
}

