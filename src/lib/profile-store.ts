"use client";
import { create } from "zustand";
import { getOrCreateProfile, updateProfile, type UserProfile } from "./firestore";

interface ProfileState {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  load: (uid: string, email: string, displayName: string) => Promise<void>;
  incrementStat: (uid: string, key: "manualTrades" | "leverageTrades" | "botTrades" | "gaGenerations") => Promise<void>;
  updateWinRate: (uid: string, rate: number) => Promise<void>;
  updatePnl: (uid: string, pnl: number) => Promise<void>;
  toggleVisibility: (uid: string, key: keyof UserProfile["show"]) => Promise<void>;
  updateDisplayName: (uid: string, name: string) => Promise<void>;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  loading: false,
  error: null,

  load: async (uid, email, displayName) => {
    console.log("Loading profile...");
    try {
      set({ loading: true, error: null });
      const profile = await getOrCreateProfile(uid, email, displayName);
      console.log("Profile loaded:", profile);
      set({ profile, loading: false });
    } catch (error) {
      console.error("Error loading profile:", error);
      set({ loading: false, error: "Failed to load profile" });
    }
  },

  incrementStat: async (uid, key) => {
    const state = get();
    if (!state.profile) return;
    const newVal = (state.profile[key] as number) + 1;
    const updated = { ...state.profile, [key]: newVal };
    set({ profile: updated });
    await updateProfile(uid, { [key]: newVal });
  },

  updateWinRate: async (uid, rate) => {
    const state = get();
    if (!state.profile) return;
    const updated = { ...state.profile, winRate: rate };
    set({ profile: updated });
    await updateProfile(uid, { winRate: rate });
  },

  updatePnl: async (uid, pnl) => {
    const state = get();
    if (!state.profile) return;
    const updated = { ...state.profile, totalPnl: pnl };
    set({ profile: updated });
    await updateProfile(uid, { totalPnl: pnl });
  },

  toggleVisibility: async (uid, key) => {
    const state = get();
    if (!state.profile) return;
    const newShow = { ...state.profile.show, [key]: !state.profile.show[key] };
    const updated = { ...state.profile, show: newShow };
    set({ profile: updated });
    await updateProfile(uid, { show: newShow });
  },

  updateDisplayName: async (uid, name) => {
    const state = get();
    if (!state.profile) return;
    const updated = { ...state.profile, displayName: name };
    set({ profile: updated });
    await updateProfile(uid, { displayName: name });
  },
}));