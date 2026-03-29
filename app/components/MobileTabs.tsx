"use client";

import { usePathname, useRouter } from "next/navigation";

export default function MobileTabs() {
  const router = useRouter();
  const path = usePathname();

  const chatActive =
    path === "/chat" || path === "/" || path.startsWith("/chat/");
  const profileActive = path.startsWith("/profile");

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-black">
      <div className="flex justify-around py-2">
        <button
          type="button"
          onClick={() => router.push("/chat")}
          className={`text-sm ${chatActive ? "text-white" : "text-zinc-400"}`}
        >
          Chat
        </button>

        <button
          type="button"
          onClick={() => router.push("/profile")}
          className={`text-sm ${profileActive ? "text-white" : "text-zinc-400"}`}
        >
          Profile
        </button>
      </div>
    </nav>
  );
}
