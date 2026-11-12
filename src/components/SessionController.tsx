"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { useWalletStore } from "@/lib/wallet-store";
import { useGaStore } from "@/lib/ga-store";
import { useEquityStore } from "@/lib/equity-store";
import { useProfileStore } from "@/lib/profile-store";
import { syncPublicProfile } from "@/lib/public-profile";

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
  const profile = useProfileStore((s) => s.profile);

  const walletLoading = useWalletStore((s) => s.loading);
  const walletUid = useWalletStore((s) => s.uid);
  const walletIsGuest = useWalletStore((s) => s.isGuest);

  const lastOwnerRef = useRef<string | undefined>(undefined);
  const backfilledForRef = useRef<string | undefined>(undefined);

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
      backfilledForRef.current = undefined; // a later login (even the same account) should backfill again
    }
  }, [user, authLoading, loadForUser, loadGuest, resetGaForOwner, resetEquity, loadProfile, clearProfile]);

  // Backfill publicProfiles/{uid} on login — including for accounts that
  // existed before this doc existed — once per sign-in, and only once the
  // wallet has actually finished loading. Syncing before that would write
  // the wallet's optimistic $10,000/zero-trade defaults over a real
  // history, since the wallet's `uid` is set synchronously before its
  // Firestore read resolves.
  useEffect(() => {
    if (!user || walletLoading || walletIsGuest || walletUid !== user.uid || !profile) return;
    if (backfilledForRef.current === user.uid) return;
    backfilledForRef.current = user.uid;
    syncPublicProfile(user.uid, profile);
  }, [user, walletLoading, walletUid, walletIsGuest, profile]);

  return null;
}
