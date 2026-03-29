"use client";

import AuthGate from "../components/AuthGate";

/**
 * Direction backend routes (/memory/direction/*) are not used in this build.
 * This page remains as a route placeholder without network calls.
 */
export default function DirectionPage() {
  return (
    <AuthGate>
      <div className="max-w-xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold text-zinc-100">Direction</h1>
        <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
          Direction sync is not available in this build. Use Chat for planning and next steps.
        </p>
      </div>
    </AuthGate>
  );
}
