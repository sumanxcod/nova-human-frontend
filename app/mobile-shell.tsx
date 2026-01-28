"use client";

export default function MobileShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-[100dvh] overflow-hidden flex flex-col md:flex-row">
      {children}
    </div>
  );
}
