import { Suspense } from "react";
import ChatClient from "../components/ChatClient";
import AuthGate from "../components/AuthGate";

export default function ChatPage() {
  return (
    <AuthGate>
      <Suspense fallback={<div className="p-4">Loading…</div>}>
        <ChatClient />
      </Suspense>
    </AuthGate>
  );
}
