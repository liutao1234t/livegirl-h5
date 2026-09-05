import { openSealed, type SealedBlob } from "./sealed";

const SEALED: SealedBlob = {
  k: "+zAoIj1wwglZbMcABhfqqSjRctmPi00duQFx7789bR0=",
  i: "JinOQYCMue6fNuzO",
  t: "kS0SeDAJYlK/VOUQKilSgw==",
  c: "mUvM367Ip0NtMC4+nsJz7EqrYbMOI31yMjN0rpk8X97zIeKPz5EXzuL9uFiUNDe+taxozjrWZlbiilEAJvmy9XvyeY/BuwodglJNOJtsiebYIXhmw2Cv0rZMk+dnb6QCkKHbF3hqNIPm7pMg6LZiqY14bazOAC5SwY4DmhOxodoenqx+vhetoTbt1vAHXtfhJXh5xpqbYtjm7gT52BbORvY9z+kRVG8ceHMxu0jL0N9KId8eVFzTPLfsrsuDh7NRImjLuTgIS+WouBG2W3k2VwK/AAow9F8vyCVPTaeEISWfax/+MzZKUvcBZm1y8kDCtwJ7CELJ4Q9DyEWe8bmKAv9GfEtWr/62C1YQ9v+dX03uwmpcjs7YBaA9GUpBMYLMzux79AjByYzdikA=",
};

export type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId: string;
};

function fromEnv(): FirebaseWebConfig | null {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY?.trim();
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim();
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim();
  const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.trim();
  const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim();
  const appId = import.meta.env.VITE_FIREBASE_APP_ID?.trim();
  const measurementId = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID?.trim();
  if (!apiKey || !authDomain || !projectId || !appId) return null;
  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
    measurementId,
  };
}

function parseSealed(text: string): FirebaseWebConfig | null {
  try {
    const data = JSON.parse(text) as Partial<FirebaseWebConfig>;
    if (!data.apiKey || !data.authDomain || !data.projectId || !data.appId) return null;
    return {
      apiKey: data.apiKey,
      authDomain: data.authDomain,
      projectId: data.projectId,
      storageBucket: data.storageBucket ?? "",
      messagingSenderId: data.messagingSenderId ?? "",
      appId: data.appId,
      measurementId: data.measurementId ?? "",
    };
  } catch {
    return null;
  }
}

let cached: Promise<FirebaseWebConfig | null> | null = null;

export function resolveFirebaseConfig() {
  if (cached) return cached;
  cached = (async () => {
    const env = fromEnv();
    if (env) return env;
    const opened = await openSealed(SEALED);
    return opened ? parseSealed(opened) : null;
  })();
  return cached;
}
