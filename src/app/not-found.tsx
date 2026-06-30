import Link from "next/link";

export default function NotFound() {
  return (
    <div className="circuit-grid relative flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center bg-slate-950 px-4 text-center text-slate-50">
      <div className="relative z-10 space-y-6">
        <div className="font-data text-8xl font-bold text-emerald-300/20">404</div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Page not found</h1>
          <p className="mt-2 text-sm text-slate-400">
            This route doesn&apos;t exist. The bot is still running though.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="rounded-full bg-gradient-to-r from-purple-500 to-emerald-400 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:scale-[1.05]"
          >
            Go home
          </Link>
          <Link
            href="/trading"
            className="rounded-full border border-slate-700 px-5 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
          >
            Open trading
          </Link>
        </div>
      </div>
    </div>
  );
}
