import { getFirestore, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { firebaseApp } from "./firebase";

export const db = getFirestore(firebaseApp);

/**
 * The PRIVATE profile doc — identity + visibility settings only.
 * Every actual stat (trade counts, win rate, P&L, generations, best
 * fitness) is derived live from users/{uid}/wallet/main and the GA
 * store, never stored redundantly here. That's what used to cause
 * the win-rate bug: two different trade types writing their own
 * partial recomputation to the same field and stomping on each
 * other. See public-profile.ts for the toggled-on subset that gets
 * mirrored out to the public profile page.
 */
export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  createdAt: number;
  show: {
    manualTrades: boolean;
    leverageTrades: boolean;
    botTrades: boolean;
    gaGenerations: boolean;
    winRate: boolean;
    totalPnl: boolean;
    paperEquity: boolean;
    botWinRate: boolean;
    bestFitness: boolean;
  };
}

const defaultShow: UserProfile["show"] = {
  manualTrades: true,
  leverageTrades: true,
  botTrades: true,
  gaGenerations: true,
  winRate: true,
  totalPnl: false,
  paperEquity: true,
  botWinRate: true,
  bestFitness: true,
};

export async function getOrCreateProfile(uid: string, email: string, displayName: string): Promise<UserProfile> {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const data = snap.data();
    const updates: any = {};

    if (!data.displayName && data.username) updates.displayName = data.username;
    else if (!data.displayName) updates.displayName = displayName || email.split("@")[0];

    if (!data.show) {
      updates.show = defaultShow;
    } else {
      const showUpdates: any = {};
      (Object.keys(defaultShow) as (keyof UserProfile["show"])[]).forEach((key) => {
        if (data.show[key] === undefined) showUpdates[`show.${key}`] = defaultShow[key];
      });
      if (Object.keys(showUpdates).length > 0) Object.assign(updates, showUpdates);
    }

    if (Object.keys(updates).length > 0) {
      await updateDoc(ref, updates);
    }

    return {
      uid: data.uid || uid,
      displayName: data.displayName || data.username || displayName || email.split("@")[0],
      email: data.email || email,
      createdAt: data.createdAt || Date.now(),
      show: { ...defaultShow, ...data.show },
    };
  }

  const profile: UserProfile = {
    uid,
    displayName: displayName || email.split("@")[0],
    email,
    createdAt: Date.now(),
    show: defaultShow,
  };
  await setDoc(ref, profile);
  return profile;
}

export async function updateProfile(uid: string, data: Partial<UserProfile>) {
  const ref = doc(db, "users", uid);
  await updateDoc(ref, data as any);
}
