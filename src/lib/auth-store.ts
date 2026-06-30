"use client";
import { create } from "zustand";
import { subscribeToAuth, logout as firebaseLogout } from "./firebase";
import type { User } from "firebase/auth";

console.log("🔥 auth-store.ts loaded!");  // ← This should show once

interface AuthState {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  logout: async () => {
    console.log("🔥 logout called");
    await firebaseLogout();
    set({ user: null, loading: false });
  },
  setUser: (user) => {
    console.log("🔥 setUser called with:", user);
    set({ user, loading: false });
  },
}));

// Start listening immediately when this module loads
if (typeof window !== "undefined") {
  console.log("🔥 auth-store: subscribing to auth changes");
  subscribeToAuth((user) => {
    console.log("🔥 auth-store: auth change detected:", user);
    useAuthStore.getState().setUser(user);
  });
}