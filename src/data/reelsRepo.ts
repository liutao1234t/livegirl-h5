import type { ReelRaw } from "./reels";

export const REELS_JSON_URL = "https://livegirloooh5.s3.us-east-1.amazonaws.com/json/file_shortvideohost.json";

function isReelRow(value: unknown): value is ReelRaw {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return typeof row.userid === "string" && row.userid.length > 0;
}

async function readReelList(url: string): Promise<ReelRaw[] | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (!Array.isArray(data) || data.length === 0 || !data.every(isReelRow)) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Catalog fetch only. UI must not call this; go through reelsStore.
 * Missing CORS / network / bad JSON: return null and keep the seed.
 */
export async function fetchRemoteReels(): Promise<ReelRaw[] | null> {
  const bust = `t=${Date.now()}`;
  const remote = await readReelList(`${REELS_JSON_URL}?${bust}`);
  if (remote) return remote;
  if (import.meta.env.DEV) {
    return readReelList(`/reel-catalog?${bust}`);
  }
  return null;
}
