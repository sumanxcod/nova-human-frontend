"use client";

import { useSearchParams } from "next/navigation";
// If you already have UI code in page.tsx, move it here.

export default function HabitsNewClient() {
  const searchParams = useSearchParams();
  const sid = searchParams.get("sid") || "default";

  return (
    <div style={{ padding: 16 }}>
      <h1>New Habit</h1>
      <p>sid: {sid}</p>
      {/* paste your existing /habits/new UI here */}
    </div>
  );
}
