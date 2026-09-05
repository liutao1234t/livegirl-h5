import type { HostRaw } from "./girls";

export const HOSTS_JSON_URL = "https://livegirloooh5.s3.us-east-1.amazonaws.com/json/file_videocallhost.json";

function isHostRow(value: unknown): value is HostRaw {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return typeof row.userid === "string" && row.userid.length > 0;
}

async function readHostList(url: string): Promise<HostRaw[] | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (!Array.isArray(data) || data.length === 0 || !data.every(isHostRow)) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Catalog fetch only. UI must not call this; go through hostsStore.
 * Missing CORS / network / bad JSON: return null and keep the seed.
 */
export async function fetchRemoteHosts(): Promise<HostRaw[] | null> {
  const bust = `t=${Date.now()}`;
  const remote = await readHostList(`${HOSTS_JSON_URL}?${bust}`);
  if (remote) return remote;
  if (import.meta.env.DEV) {
    return readHostList(`/host-catalog?${bust}`);
  }
  return null;
}
