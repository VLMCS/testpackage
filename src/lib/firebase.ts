import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

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

// ============================================================
// App Check — reCAPTCHA v3 site key. Get it from:
//   Firebase Console → App Check → Apps → register this web app (reCAPTCHA v3).
// While this is the placeholder, App Check stays OFF so the app keeps working.
// Set it, deploy, confirm the app works, THEN turn on enforcement in the console.
// See SECURITY.md for the full ordered checklist.
// ============================================================
const RECAPTCHA_SITE_KEY = 'PASTE_YOUR_RECAPTCHA_V3_SITE_KEY_HERE';

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

    // App Check: prove requests come from this real app. Initialized right after
    // the app boots, before Firestore/Auth make any calls. Skipped while the
    // reCAPTCHA key is still the placeholder so local/first-run isn't blocked.
    if (!RECAPTCHA_SITE_KEY.startsWith('PASTE_')) {
      if (import.meta.env.DEV) {
        // Prints a debug token in the console to register under App Check →
        // Manage debug tokens, so localhost works without a real reCAPTCHA pass.
        (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN =
          true;
      }
      initializeAppCheck(appInstance, {
        provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY),
        isTokenAutoRefreshEnabled: true,
      });
    }

    try {
      // Offline-first: cache data in IndexedDB so the PWA works without a network
      // and stays consistent across multiple open tabs.
      dbInstance = initializeFirestore(appInstance, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      });
    } catch {
      // IndexedDB unavailable (e.g. private browsing) — fall back to in-memory cache.
      dbInstance = getFirestore(appInstance);
    }
    authInstance = getAuth(appInstance);
  }
  return { app: appInstance!, db: dbInstance!, auth: authInstance! };
}
