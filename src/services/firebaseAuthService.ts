import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth } from '../config/firebase';

function ensureAuth() {
  if (!auth) {
    throw new Error('Firebase is not initialized. Set VITE_FIREBASE_* env vars or configure Firebase.');
  }
  return auth;
}

// Sign up with email and password
export const signUp = async (email: string, password: string) => {
  try {
    const _auth = ensureAuth();
    const userCredential = await createUserWithEmailAndPassword(_auth, email, password);
    return userCredential.user;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Sign in with email and password
export const signIn = async (email: string, password: string) => {
  try {
    const _auth = ensureAuth();
    const userCredential = await signInWithEmailAndPassword(_auth, email, password);
    return userCredential.user;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Sign in with Google
export const signInWithGoogle = async () => {
  try {
    const _auth = ensureAuth();
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(_auth, provider);
    return result.user;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Sign out
export const signOutUser = async () => {
  try {
    const _auth = ensureAuth();
    await signOut(_auth);
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Subscribe to auth state changes
export const subscribeToAuthChanges = (callback: (user: FirebaseUser | null) => void) => {
  const _auth = ensureAuth();
  return onAuthStateChanged(_auth, callback);
};
