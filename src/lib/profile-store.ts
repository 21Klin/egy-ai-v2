"use client";
import { create } from "zustand";
import { getOrCreateProfile, updateProfile, type UserProfile } from "./firestore";
import { syncPublicProfile } from "./public-profile";

interface ProfileState {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  load: (uid: string, email: string, displayName: string) => Promise<void>;
  clear: () => void;
  toggleVisibility: (uid: string, key: keyof UserProfile["show"]) => Promise<void>;
  updateDisplayName: (uid: string, name: string) => Promise<void>;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  loading: false,
  error: null,

  load: async (uid, email, displayName) => {
    try {
      set({ loading: true, error: null });
      const profile = await getOrCreateProfile(uid, email, displayName);
      set({ profile, loading: false });
      // Not synced here: the wallet hasn't necessarily finished loading
      // yet at this point (its `uid` is set synchronously, before its
      // own Firestore read resolves), so syncing now could overwrite a
      // real public history with the wallet's momentary $10,000/zero-
      // trade defaults. SessionController backfills the public profile
      // once the wallet has actually finished loading instead.
    } catch (error) {
      set({ loading: false, error: "Failed to load profile" });
    }
  },

  clear: () => set({ profile: null, loading: false, error: null }),

  toggleVisibility: async (uid, key) => {
    const state = get();
    if (!state.profile) return;
    const newShow = { ...state.profile.show, [key]: !state.profile.show[key] };
    const updated = { ...state.profile, show: newShow };
    set({ profile: updated });
    await updateProfile(uid, { show: newShow });
    await syncPublicProfile(uid, updated);
  },

  updateDisplayName: async (uid, name) => {
    const state = get();
    if (!state.profile) return;
    const updated = { ...state.profile, displayName: name };
    set({ profile: updated });
    await updateProfile(uid, { displayName: name });
    await syncPublicProfile(uid, updated);
  },
}));
