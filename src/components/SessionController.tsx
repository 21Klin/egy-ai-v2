"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { useWalletStore } from "@/lib/wallet-store";
import { useGaStore } from "@/lib/ga-store";
import { useEquityStore } from "@/lib/equity-store";

/**
 * Mount once near the root. Bridges Firebase auth state to every
 * piece of per-account state in the app (paper wallet, GA bot,
 * equity curve) so logging in loads exactly that account's data and
 * logging out always falls back to a fresh, in-memory guest session —
 * never a mix of two accounts' numbers.
 */
export default function SessionController() {
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  const loadForUser = useWalletStore((s) => s.loadForUser);
  const loadGuest = useWalletStore((s) => s.loadGuest);
  const resetGaForOwner = useGaStore((s) => s.resetForOwner);
  const resetEquity = useEquityStore((s) => s.reset);

  const lastOwnerRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (authLoading) return; // don't decide guest vs account until Firebase resolves
    const owner = user ? user.uid : "guest";
    if (lastOwnerRef.current === owner) return;
    lastOwnerRef.current = owner;

    resetEquity();
    resetGaForOwner(owner);
    if (user) loadForUser(user.uid);
    else loadGuest();
  }, [user, authLoading, loadForUser, loadGuest, resetGaForOwner, resetEquity]);

  return null;
}
