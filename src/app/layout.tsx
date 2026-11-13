"use client";
import NavUserButton from "@/components/NavUserButton";
import "./globals.css";
import Link from "next/link";
import DataProvider from "@/lib/DataProvider";
import EquityRecorder from "@/components/equity-recorder";
import SessionController from "@/components/SessionController";
import GaBotRunner from "@/components/GaBotRunner";
import { Toaster } from "@/components/ui/toaster";
import { KraferSimLogo } from "@/components/icons";
import { useState } from "react";
import { Menu, X, ChevronDown } from "lucide-react";


const navItems = [
  { href: "/", label: "Home" },
  { href: "/trading", label: "Trading" },
  { href: "/ga-dashboard", label: "GA Dashboard" },
  { href: "/ga-demo", label: "Judge Demo" },
  { href: "/history", label: "Bot History" },
  { href: "/about", label: "About" },
  { href: "/guide", label: "Guide" },
  { href: "/contact", label: "Contact" },

];

const learnItems = [
  { href: "/learn/genetic-algorithm", label: "🧬 Genetic Algorithms" },
  { href: "/learn/crypto-trading", label: "₿ How Crypto Trading Works" },
  { href: "/learn/order-book", label: "📖 The Order Book" },
  { href: "/learn/rsi", label: "📈 RSI Indicator" },
  { href: "/learn/how-egy-ai-works", label: "⚙️ How EGY-AI Works" },
  { href: "/learn/glossary", label: "📚 Glossary" },
];

function Nav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [learnOpen, setLearnOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* LOGO */}
        <Link href="/" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400/20 to-purple-500/20 border border-emerald-500/30">
            <KraferSimLogo className="h-5 w-5 text-emerald-300" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">EGY-AI</div>
            <div className="text-[11px] text-slate-400">Live GA trading engine</div>
          </div>
        </Link>

        {/* DESKTOP NAV */}
        <nav className="hidden items-center gap-1 sm:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3 py-1 text-[11px] font-medium text-slate-300 transition-all hover:bg-slate-800/80 hover:text-white"
            >
              {item.label}
            </Link>
          ))}

          {/* LEARN DROPDOWN */}
          <div className="relative">
            <button
              onClick={() => setLearnOpen(!learnOpen)}
              className="flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium text-emerald-300 transition-all hover:bg-emerald-500/10"
            >
              Learn
              <ChevronDown className={`h-3 w-3 transition-transform ${learnOpen ? "rotate-180" : ""}`} />
            </button>
            {learnOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setLearnOpen(false)} />
                <div className="absolute right-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-xl border border-slate-700 bg-slate-900/95 shadow-xl backdrop-blur">
                  <div className="border-b border-slate-800 px-3 py-2">
                    <Link
                      href="/learn"
                      onClick={() => setLearnOpen(false)}
                      className="font-data text-[10px] uppercase tracking-wide text-emerald-300 hover:text-emerald-200 transition"
                    >
                      All topics →
                    </Link>
                  </div>
                  {learnItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setLearnOpen(false)}
                      className="block px-3 py-2 text-xs text-slate-300 transition hover:bg-slate-800 hover:text-white"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>

          <NavUserButton />
          <Link
            href="/trading"
            className="ml-2 rounded-full bg-gradient-to-r from-purple-500 to-emerald-400 px-5 py-2 text-xs font-semibold text-slate-950 shadow-lg transition-all hover:scale-[1.05]"
          >
            Launch Trading
          </Link>
        </nav>

        {/* MOBILE HAMBURGER */}
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-300 transition hover:bg-slate-800 sm:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {/* MOBILE MENU */}
      {mobileOpen && (
        <div className="border-t border-slate-800 bg-slate-950/95 px-4 py-4 sm:hidden">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-1 border-t border-slate-800 pt-2">
              <p className="px-3 pb-1 font-data text-[10px] uppercase tracking-wide text-emerald-300">Learn</p>
              <Link href="/learn" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/10">
                All topics
              </Link>
              {learnItems.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white">
                  {item.label}
                </Link>
              ))}
            </div>
            <Link href="/trading" onClick={() => setMobileOpen(false)} className="mt-2 rounded-full bg-gradient-to-r from-purple-500 to-emerald-400 px-5 py-2.5 text-center text-sm font-semibold text-slate-950">
              Launch Trading
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <script type="text/javascript" src="https://s3.tradingview.com/tv.js" async></script>
      </head>
      <body className="font-body antialiased min-h-screen bg-slate-950 text-slate-50">
        <SessionController />
        <GaBotRunner />
        <Nav />
        <DataProvider>
          <EquityRecorder />
          <main className="pt-20">{children}</main>
        </DataProvider>
        <footer className="border-t border-slate-800 bg-slate-950/95">
          <div className="mx-auto max-w-6xl px-4 py-6 text-[11px] text-slate-400 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="text-slate-200 font-semibold tracking-tight">EGY AI — Live Genetic Algorithm Trading Engine</div>
              <div className="text-slate-500">Open source student project · MIT License</div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <a href="/learn" className="hover:text-emerald-300 transition-colors">Learn</a>
              <span className="text-slate-600">│</span>
              <a href="/terms-of-use" className="hover:text-emerald-300 transition-colors">Terms of Use</a>
              <span className="text-slate-600">│</span>
              <a href="/privacy" className="hover:text-emerald-300 transition-colors">Privacy Policy</a>
              <span className="text-slate-600">│</span>
              <a href="/contact" className="hover:text-emerald-300 transition-colors">Contact</a>
            </div>
          </div>
        </footer>
        <Toaster />
      </body>
    </html>
  );
}
