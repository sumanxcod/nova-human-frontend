"use client";

import { useSearchParams } from "next/navigation";
// If you already have UI code in page.tsx, move it here.

export default function ActionPlanNewClient() {
  const searchParams = useSearchParams();
  const sid = searchParams.get("sid") || "default";

  return (
    <div className="p-4">
      <h1>New Action Plan</h1>
      <p>sid: {sid}</p>
      {/* paste your existing /habits/new UI here */}
    </div>
  );
}
