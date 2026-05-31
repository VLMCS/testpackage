import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';

// ============================================================
// PASTE YOUR FIREBASE CONFIG BELOW
// Get it from: https://console.firebase.google.com/
//   → Project Settings → Your apps → SDK setup and configuration
// ============================================================
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCaWBphpF0SefTZcHfvFZUz2Yy15IZN-So",
  authDomain: "clerune-tracker.firebaseapp.com",
  projectId: "clerune-tracker",
  storageBucket: "clerune-tracker.firebasestorage.app",
  messagingSenderId: "297616614426",
  appId: "1:297616614426:web:f7e2a0c22bb732cb831da3"
};

export function isFirebaseConfigured(): boolean {
  return !Object.values(FIREBASE_CONFIG).some((v) => v.startsWith('PASTE_'));
}

let appInstance: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;

export function getFirebase() {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured. Paste your config into src/lib/firebase.ts.');
  }
  if (!appInstance) {
    appInstance = initializeApp(FIREBASE_CONFIG);
    dbInstance = getFirestore(appInstance);
    authInstance = getAuth(appInstance);
  }
  return { app: appInstance!, db: dbInstance!, auth: authInstance! };
}
