"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type RadioContextType = { value: string; onValueChange: (v: string) => void };
const RadioContext = React.createContext<RadioContextType | null>(null);

export function RadioGroup({
  value,
  onValueChange,
  className,
  children,
}: {
  value: string;
  onValueChange: (v: string) => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <RadioContext.Provider value={{ value, onValueChange }}>
      <div className={cn("grid gap-2", className)} role="radiogroup">
        {children}
      </div>
    </RadioContext.Provider>
  );
}

export function RadioGroupItem({ value, id }: { value: string; id: string }) {
  const ctx = React.useContext(RadioContext);
  if (!ctx) throw new Error("RadioGroupItem must be used within RadioGroup");
  const checked = ctx.value === value;
  return (
    <button
      type="button"
      id={id}
      role="radio"
      aria-checked={checked}
      onClick={() => ctx.onValueChange(value)}
      className={cn(
        "aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring flex items-center justify-center"
      )}
    >
      {checked && <span className="h-2 w-2 rounded-full bg-current" />}
    </button>
  );
}
