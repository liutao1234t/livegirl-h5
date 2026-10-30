/**
 * Which native app opened this H5.
 * Read once from the entry URL: ?appid=&dev=&na=&la=
 * Missing fields use the Bloomie defaults. Remembered for this WebView
 * session because the splash route replaces the query string.
 */

export type H5AppClient = {
  appid: string;
  dev: string;
  na: string;
  la: string;
};

const DEFAULT_APP_CLIENT: H5AppClient = {
  appid: "6758287054",
  dev: "iPhone",
  na: "cn",
  la: "en",
};

const SESSION_KEY = "livegirl-app-client";
const FIELDS = ["appid", "dev", "na", "la"] as const;

function clip(value: string) {
  return value.trim().slice(0, 128);
}

export function resolveH5AppClient(search: string, stored: H5AppClient | null): H5AppClient {
  const params = new URLSearchParams(search.startsWith("?") ? search : search ? `?${search}` : "");
  const fromUrl: Partial<H5AppClient> = {};
  let sawUrl = false;
  for (const key of FIELDS) {
    const value = params.get(key);
    if (value == null) continue;
    const text = clip(value);
    if (!text) continue;
    fromUrl[key] = text;
    sawUrl = true;
  }
  if (sawUrl) return { ...DEFAULT_APP_CLIENT, ...fromUrl };
  if (stored) return stored;
  return { ...DEFAULT_APP_CLIENT };
}

function readStored(): H5AppClient | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object") return null;
    const record = data as Record<string, unknown>;
    const next = { ...DEFAULT_APP_CLIENT };
    for (const key of FIELDS) {
      const value = record[key];
      if (typeof value !== "string" || !value.trim()) return null;
      next[key] = clip(value);
    }
    return next;
  } catch {
    return null;
  }
}

function remember(client: H5AppClient) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(client));
  } catch {
    /* private mode or a full quota must not block login */
  }
}

function capture(): H5AppClient {
  if (typeof window === "undefined") return { ...DEFAULT_APP_CLIENT };
  const client = resolveH5AppClient(window.location.search, readStored());
  remember(client);
  return client;
}

const captured = capture();

export function h5AppClient(): H5AppClient {
  return captured;
}

/** Numeric App Store id from the entry URL. Strips a leading `id`. */
export function h5AppleAppId(): string {
  const raw = captured.appid.trim().replace(/^id/i, "");
  const digits = raw.replace(/\D/g, "");
  return digits || DEFAULT_APP_CLIENT.appid;
}
