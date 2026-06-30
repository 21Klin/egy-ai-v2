"use client";

import { useState } from "react";
import { toast } from "@/lib/use-toast";

export default function ContactPage() {
  const [copied, setCopied] = useState(false);

  const copyEmail = () => {
    const email = "egy.ai.dev@gmail.com";
    navigator.clipboard.writeText(email);
    setCopied(true);
    toast({ title: "Email copied", description: "You can now paste it anywhere." });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative min-h-screen bg-slate-950 px-4 py-14 text-slate-50 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.08),rgba(0,0,0,0))] pointer-events-none" />

      <div className="mx-auto max-w-4xl space-y-6 relative z-10">
        <section className="space-y-3">
          <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">
            Contact <span className="text-emerald-400">EGY AI</span>
          </h1>
          <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
            Reach out for collaboration, sponsorship, investment discussions, or to
            learn more about our AI-driven trading research.
          </p>
        </section>

        <section>
          <div className="group relative rounded-2xl p-[2px] bg-gradient-to-br from-emerald-400/40 to-purple-500/40 hover:from-emerald-400 hover:to-purple-500 transition-all duration-500">
            <div className="rounded-2xl bg-slate-900/60 px-6 py-6 backdrop-blur">
              <h2 className="text-xl font-semibold text-white">Official Contact</h2>
              <p className="mt-2 text-sm text-slate-300">
                Our primary email for business, partnership, and collaboration inquiries.
              </p>
              <div className="mt-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-lg font-medium text-emerald-400">egy.ai.dev@gmail.com</p>
                <button
                  onClick={copyEmail}
                  className="rounded-lg bg-emerald-500/90 px-4 py-2 text-sm font-semibold text-slate-900 shadow-md transition-all hover:bg-emerald-400 active:scale-[0.97]"
                >
                  {copied ? "Copied ✔" : "Copy Email"}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <h3 className="text-lg font-semibold text-white">A message from our team</h3>
          <p className="mt-2 text-sm text-slate-300">
            EGY AI is developed by passionate young engineers focused on algorithmic
            trading, AI systems, and financial technology. We personally review every
            email and respond to all serious inquiries.
          </p>
        </section>

        <section className="mt-14 text-center space-y-4">
          <h2 className="text-3xl font-semibold text-white">Let&apos;s build something extraordinary.</h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            Whether you&apos;re here to collaborate, invest, or explore AI-driven trading
            systems, our team is ready to talk.
          </p>
          <a
            href="https://mail.google.com/mail/?view=cm&fs=1&to=egy.ai.dev@gmail.com&su=EGY%20AI%20Contact&body=Hello%20EGY%20AI%20team,"
            target="_blank"
            rel="noreferrer"
            className="inline-block mt-2 rounded-xl bg-gradient-to-r from-emerald-400 to-purple-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-xl transition-all hover:scale-[1.05] active:scale-[0.97]"
          >
            Get in touch
          </a>
        </section>
      </div>
    </div>
  );
}
