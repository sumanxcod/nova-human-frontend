import { Suspense } from "react";
import HabitsNewClient from "./HabitsNewClient";

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: 16 }}>Loading…</div>}>
      <HabitsNewClient />
    </Suspense>
  );
}
