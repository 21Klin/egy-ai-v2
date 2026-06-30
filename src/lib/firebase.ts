import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(firebaseApp);
const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
export const loginWithEmail = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password);
export const signupWithEmail = (email: string, password: string) =>
  createUserWithEmailAndPassword(auth, email, password);
export const logout = () => signOut(auth);
export const subscribeToAuth = (cb: (user: User | null) => void) =>
  onAuthStateChanged(auth, cb);
