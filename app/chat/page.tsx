import { Suspense } from "react";
import ChatClient from "../components/ChatClient";

export default function ChatPage() {
  return (
    <Suspense fallback={<div style={{ padding: 16 }}>Loading…</div>}>
      <ChatClient />
    </Suspense>
  );
}
