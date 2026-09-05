export const SAY_HI_JSON_URL = "https://livegirloooh5.s3.us-east-1.amazonaws.com/json/file_sayhiwords.json";

export const seedSayHiWords = [
  "Hey! 😘",
  "Hi babe",
  "Hello 😉",
  "Miss me?",
  "Hey🔥",
  "You here?",
  "Hey cutie",
  "Hi love",
  "Let's chat! 😘",
  "Wanna talk? 😘",
];

function isWordList(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every((row) => typeof row === "string" && row.trim().length > 0);
}

async function readWordList(url: string): Promise<string[] | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (!isWordList(data)) return null;
    return data.map((row) => row.trim());
  } catch {
    return null;
  }
}

/**
 * Catalog fetch only. UI must not call this; go through sayHiStore.
 * Missing CORS / network / bad JSON: return null and keep the seed.
 */
export async function fetchSayHiWords(): Promise<string[] | null> {
  const bust = `t=${Date.now()}`;
  const remote = await readWordList(`${SAY_HI_JSON_URL}?${bust}`);
  if (remote) return remote;
  if (import.meta.env.DEV) {
    return readWordList(`/sayhi-catalog?${bust}`);
  }
  return null;
}
