/**
 * Which native app opened this H5.
 * Read once from the entry URL: ?aid=&ptpye=&pv=
 * No query means app 6758287054 (that app's load URL is fixed).
 * Remembered for this WebView session because the splash route replaces the query string.
 * `ptpye` is the phone model. `pv` is the system version. Both are omitted when absent.
 */

import { DEFAULT_APP_ID } from "./appProfile";

export type H5AppClient = {
  appid: string;
  ptpye?: string;
  pv?: string;
};

const SESSION_KEY = "livegirl-app-client";

function clip(value: string) {
  return value.trim().slice(0, 128);
}

function normalizeAppId(raw: string) {
  const digits = raw.trim().replace(/^id/i, "").replace(/\D/g, "");
  return digits;
}

function withDevice(appid: string, ptpye: string, pv: string): H5AppClient {
  const client: H5AppClient = { appid };
  if (ptpye) client.ptpye = ptpye;
  if (pv) client.pv = pv;
  return client;
}

export function resolveH5AppClient(search: string, stored: H5AppClient | null): H5AppClient {
  const params = new URLSearchParams(search.startsWith("?") ? search : search ? `?${search}` : "");
  const aid = clip(params.get("aid") || params.get("appid") || "");
  const ptpye = clip(params.get("ptpye") || "");
  const pv = clip(params.get("pv") || "");
  if (aid || ptpye || pv) {
    const appid = aid ? normalizeAppId(aid) || aid : DEFAULT_APP_ID;
    return withDevice(appid, ptpye, pv);
  }
  if (stored) return stored;
  return { appid: DEFAULT_APP_ID };
}

function readStored(): H5AppClient | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object") return null;
    const record = data as Record<string, unknown>;
    if (typeof record.appid !== "string" || !record.appid.trim()) return null;
    const ptpye = typeof record.ptpye === "string" ? clip(record.ptpye) : "";
    const pv = typeof record.pv === "string" ? clip(record.pv) : "";
    return withDevice(clip(record.appid), ptpye, pv);
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
  if (typeof window === "undefined") return { appid: DEFAULT_APP_ID };
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
  const digits = normalizeAppId(captured.appid);
  return digits || DEFAULT_APP_ID;
}
