"use client";
import { useEffect } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { useProfileStore } from "@/lib/profile-store";

export default function ProfileLoader() {
  const user = useAuthStore((s) => s.user);
  const load = useProfileStore((s) => s.load);

  useEffect(() => {
    if (user) {
      load(user.uid, user.email || "", user.displayName || "");
    }
  }, [user, load]);

  return null;
}
