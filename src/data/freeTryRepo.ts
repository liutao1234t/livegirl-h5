import type { FreeTryRaw } from "./freeTry";

export const FREE_TRY_JSON_URL = "https://livegirloooh5.s3.us-east-1.amazonaws.com/json/file_30sfreeTryshost.json";

function isFreeTryRow(value: unknown): value is FreeTryRaw {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return typeof row.userid === "string" && row.userid.length > 0;
}

async function readFreeTryList(url: string): Promise<FreeTryRaw[] | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (!Array.isArray(data) || data.length === 0 || !data.every(isFreeTryRow)) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Catalog fetch only. UI must not call this; go through incomingCallStore.
 * Missing CORS / network / bad JSON: return null and keep the seed.
 */
export async function fetchRemoteFreeTryHosts(): Promise<FreeTryRaw[] | null> {
  const bust = `t=${Date.now()}`;
  const remote = await readFreeTryList(`${FREE_TRY_JSON_URL}?${bust}`);
  if (remote) return remote;
  if (import.meta.env.DEV) {
    return readFreeTryList(`/freetry-catalog?${bust}`);
  }
  return null;
}
