"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { useWalletStore } from "@/lib/wallet-store";
import { useGaStore } from "@/lib/ga-store";
import { useEquityStore } from "@/lib/equity-store";
import { useProfileStore } from "@/lib/profile-store";

/**
 * Mount once near the root. Bridges Firebase auth state to every
 * piece of per-account state in the app (paper wallet, GA bot,
 * profile/visibility settings, equity curve) so logging in loads
 * exactly that account's data and logging out always falls back to
 * a fresh, in-memory guest session — never a mix of two accounts'
 * numbers. This also replaces the old ProfileLoader component, which
 * existed but was never actually mounted anywhere.
 */
export default function SessionController() {
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  const loadForUser = useWalletStore((s) => s.loadForUser);
  const loadGuest = useWalletStore((s) => s.loadGuest);
  const resetGaForOwner = useGaStore((s) => s.resetForOwner);
  const resetEquity = useEquityStore((s) => s.reset);
  const loadProfile = useProfileStore((s) => s.load);
  const clearProfile = useProfileStore((s) => s.clear);

  const lastOwnerRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (authLoading) return; // don't decide guest vs account until Firebase resolves
    const owner = user ? user.uid : "guest";
    if (lastOwnerRef.current === owner) return;
    lastOwnerRef.current = owner;

    resetEquity();
    resetGaForOwner(owner);
    if (user) {
      loadForUser(user.uid);
      loadProfile(user.uid, user.email || "", user.displayName || "");
    } else {
      loadGuest();
      clearProfile();
    }
  }, [user, authLoading, loadForUser, loadGuest, resetGaForOwner, resetEquity, loadProfile, clearProfile]);

  return null;
}
