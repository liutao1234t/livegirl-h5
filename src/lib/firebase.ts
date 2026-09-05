import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAnalytics, isSupported, logEvent, setUserId, type Analytics } from "firebase/analytics";
import {
  deleteUser,
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signOut,
  type Auth,
  type User,
} from "firebase/auth";
import { resolveFirebaseConfig } from "./firebaseConfig";

export type AppEventParams = Record<string, string | number | boolean>;

let auth: Auth | null = null;
let analytics: Analytics | null = null;
let bootPromise: Promise<void> | null = null;
let accountGate: Promise<void> = Promise.resolve();

async function initAnalytics(firebaseApp: FirebaseApp) {
  if (typeof window === "undefined") return;
  try {
    const supported = await isSupported();
    if (!supported) return;
    analytics = getAnalytics(firebaseApp);
  } catch {
    analytics = null;
  }
}

function waitForUser(firebaseAuth: Auth) {
  return new Promise<User | null>((resolve) => {
    const unsub = onAuthStateChanged(firebaseAuth, (user) => {
      unsub();
      resolve(user);
    });
  });
}

function applyLocalUserId(localUserId: string | null) {
  if (!analytics) return;
  try {
    setUserId(analytics, localUserId);
  } catch {
    /* never break the app for analytics */
  }
}

/**
 * Starts Firebase without blocking UI. Safe in WKWebView: missing config,
 * no window, or Analytics/Auth failure is ignored.
 * Does not create an account — that happens on Get Started.
 */
export function bootstrapFirebase() {
  if (bootPromise) return bootPromise;

  bootPromise = (async () => {
    try {
      if (typeof window === "undefined") return;
      const config = await resolveFirebaseConfig();
      if (!config) return;

      const firebaseApp = initializeApp(config);
      auth = getAuth(firebaseApp);
      await initAnalytics(firebaseApp);
    } catch {
      auth = null;
      analytics = null;
    }
  })();

  return bootPromise;
}

/** Restore or create anonymous Auth, tagged with the local timestamp user id. */
export function bindLocalUser(localUserId: string, isNew: boolean) {
  accountGate = accountGate.then(async () => {
    await bootstrapFirebase();
    if (!auth) return;
    try {
      let user = await waitForUser(auth);
      if (!user) {
        const cred = await signInAnonymously(auth);
        user = cred.user;
      }
      if (!user) return;
      applyLocalUserId(localUserId);
      if (isNew) logAppEvent("sign_up", { method: "anonymous" });
    } catch {
      /* ignore */
    }
  });
  return accountGate;
}

/** Sign out / delete the anonymous Firebase user so the next start is a new one. */
export function clearFirebaseUser() {
  accountGate = accountGate.then(async () => {
    await bootstrapFirebase();
    if (!auth) return;
    try {
      const user = auth.currentUser ?? (await waitForUser(auth));
      if (user) {
        try {
          await deleteUser(user);
        } catch {
          await signOut(auth);
        }
      }
    } catch {
      /* ignore */
    }
    applyLocalUserId(null);
  });
  return accountGate;
}

/** Custom events (purchase / rate / daily task, etc.) go through here later. */
export function logAppEvent(name: string, params?: AppEventParams) {
  if (!analytics) return;
  try {
    logEvent(analytics, name, params);
  } catch {
    /* never break the app for analytics */
  }
}
