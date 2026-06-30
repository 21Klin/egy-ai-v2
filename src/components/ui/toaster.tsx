"use client";

import { useToast } from "@/lib/use-toast";
import { cn } from "@/lib/utils";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "min-w-[260px] rounded-lg border p-4 shadow-lg backdrop-blur animate-in fade-in slide-in-from-bottom-2",
            t.variant === "destructive"
              ? "border-red-500/40 bg-red-950/80 text-red-100"
              : t.variant === "success"
              ? "border-emerald-500/40 bg-emerald-950/80 text-emerald-100"
              : "border-slate-700 bg-slate-900/90 text-slate-100"
          )}
        >
          {t.title && <p className="text-sm font-semibold">{t.title}</p>}
          {t.description && <p className="mt-1 text-xs opacity-80">{t.description}</p>}
        </div>
      ))}
    </div>
  );
}
