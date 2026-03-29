import Link from "next/link";

export default function Page() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-xl rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
        <h1 className="text-3xl font-semibold text-zinc-100">Nova Human</h1>
        <p className="mt-3 text-zinc-400">Your AI Life Partner</p>
        <Link
          href="/signup"
          className="mt-6 inline-flex rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-black"
        >
          Try Now
        </Link>
      </div>
    </main>
  );
}
