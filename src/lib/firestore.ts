import { getFirestore, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { firebaseApp } from "./firebase";

export const db = getFirestore(firebaseApp);

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  createdAt: number;
  manualTrades: number;
  leverageTrades: number;
  botTrades: number;
  gaGenerations: number;
  winRate: number;
  totalPnl: number;
  show: {
    manualTrades: boolean;
    leverageTrades: boolean;
    botTrades: boolean;
    gaGenerations: boolean;
    winRate: boolean;
    totalPnl: boolean;
  };
}

const defaultShow = {
  manualTrades: true,
  leverageTrades: true,
  botTrades: true,
  gaGenerations: true,
  winRate: true,
  totalPnl: false,
};

// ✅ This function now AUTO-FIXES missing fields for ALL users
export async function getOrCreateProfile(uid: string, email: string, displayName: string): Promise<UserProfile> {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  
  if (snap.exists()) {
    const data = snap.data();
    
    // Build updates object with any missing fields
    const updates: any = {};
    
    // Check for missing fields and add defaults
    if (!data.displayName && data.username) {
      updates.displayName = data.username;
    } else if (!data.displayName) {
      updates.displayName = displayName || email.split("@")[0];
    }
    
    if (data.manualTrades === undefined) updates.manualTrades = 0;
    if (data.leverageTrades === undefined) updates.leverageTrades = 0;
    if (data.botTrades === undefined) updates.botTrades = 0;
    if (data.gaGenerations === undefined) updates.gaGenerations = 0;
    if (data.winRate === undefined) updates.winRate = 0;
    if (data.totalPnl === undefined) updates.totalPnl = 0;
    
    // Check if 'show' map exists and has all fields
    if (!data.show) {
      updates.show = defaultShow;
    } else {
      const showUpdates: any = {};
      if (data.show.manualTrades === undefined) showUpdates["show.manualTrades"] = true;
      if (data.show.leverageTrades === undefined) showUpdates["show.leverageTrades"] = true;
      if (data.show.botTrades === undefined) showUpdates["show.botTrades"] = true;
      if (data.show.gaGenerations === undefined) showUpdates["show.gaGenerations"] = true;
      if (data.show.winRate === undefined) showUpdates["show.winRate"] = true;
      if (data.show.totalPnl === undefined) showUpdates["show.totalPnl"] = false;
      
      if (Object.keys(showUpdates).length > 0) {
        Object.assign(updates, showUpdates);
      }
    }
    
    // Apply updates if any fields were missing
    if (Object.keys(updates).length > 0) {
      console.log(`🔄 Auto-fixing missing fields for user ${uid}:`, updates);
      await updateDoc(ref, updates);
    }
    
    // Return complete profile with defaults for any still-missing fields
    return {
      uid: data.uid || uid,
      displayName: data.displayName || data.username || displayName || email.split("@")[0],
      email: data.email || email,
      createdAt: data.createdAt || Date.now(),
      manualTrades: data.manualTrades ?? 0,
      leverageTrades: data.leverageTrades ?? 0,
      botTrades: data.botTrades ?? 0,
      gaGenerations: data.gaGenerations ?? 0,
      winRate: data.winRate ?? 0,
      totalPnl: data.totalPnl ?? 0,
      show: data.show || defaultShow,
    };
  }

  // Create new profile for NEW users
  const profile: UserProfile = {
    uid,
    displayName: displayName || email.split("@")[0],
    email,
    createdAt: Date.now(),
    manualTrades: 0,
    leverageTrades: 0,
    botTrades: 0,
    gaGenerations: 0,
    winRate: 0,
    totalPnl: 0,
    show: defaultShow,
  };
  await setDoc(ref, profile);
  return profile;
}

export async function updateProfile(uid: string, data: Partial<UserProfile>) {
  const ref = doc(db, "users", uid);
  await updateDoc(ref, data as any);
}

export async function getPublicProfile(uid: string): Promise<UserProfile | null> {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    uid: data.uid || uid,
    displayName: data.displayName || data.username || "Trader",
    email: data.email || "",
    createdAt: data.createdAt || Date.now(),
    manualTrades: data.manualTrades ?? 0,
    leverageTrades: data.leverageTrades ?? 0,
    botTrades: data.botTrades ?? 0,
    gaGenerations: data.gaGenerations ?? 0,
    winRate: data.winRate ?? 0,
    totalPnl: data.totalPnl ?? 0,
    show: data.show || defaultShow,
  };
}