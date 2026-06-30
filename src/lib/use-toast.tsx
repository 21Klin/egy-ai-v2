"use client";

import * as React from "react";

export type ToasterToast = {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "destructive" | "success";
};

let listeners: Array<(toasts: ToasterToast[]) => void> = [];
let memoryToasts: ToasterToast[] = [];
let count = 0;

function emit() {
  listeners.forEach((l) => l(memoryToasts));
}

export function toast(props: Omit<ToasterToast, "id">) {
  const id = (count++).toString();
  memoryToasts = [{ id, ...props }, ...memoryToasts].slice(0, 3);
  emit();
  setTimeout(() => {
    memoryToasts = memoryToasts.filter((t) => t.id !== id);
    emit();
  }, 3500);
}

// convenience helpers matching sonner-style API used elsewhere
toast.success = (title: string, opts?: { description?: string }) =>
  toast({ title, description: opts?.description, variant: "success" });
toast.info = (title: string, opts?: { description?: string }) =>
  toast({ title, description: opts?.description, variant: "default" });

export function useToast() {
  const [toasts, setToasts] = React.useState<ToasterToast[]>(memoryToasts);

  React.useEffect(() => {
    listeners.push(setToasts);
    return () => {
      listeners = listeners.filter((l) => l !== setToasts);
    };
  }, []);

  return { toasts, toast };
}
