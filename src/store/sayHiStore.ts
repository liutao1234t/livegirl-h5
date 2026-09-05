import { create } from "zustand";
import { fetchSayHiWords, seedSayHiWords } from "../data/sayHiRepo";
import { type Girl } from "../data/girls";
import { excludeCalled } from "../lib/calledHosts";
import { useAppStore } from "./appStore";
import { useHostsStore } from "./hostsStore";

export const SAY_HI_INTERVAL_MS = 60_000;
export const SAY_HI_CAP_FREE = 5;
export const SAY_HI_CAP_PAID = 3;
export const ONLINE_NOW_COUNT = 8;

const DROPPED_KEY = "livegirl-sayhi-dropped";
const USED_KEY = "livegirl-sayhi-used";
const ONLINE_KEY = "livegirl-online-now";

type SayHiState = {
  words: string[];
  onlineNowIds: string[];
  dropped: number;
  ensureOnlineNow: (hosts?: Girl[]) => void;
};

let dispatchStarted = false;
let dropTimer = 0;
let retryTimer = 0;

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode / WebView quota */
  }
}

function readDropped() {
  try {
    const n = Number(sessionStorage.getItem(DROPPED_KEY) ?? "0");
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

function writeDropped(n: number) {
  try {
    sessionStorage.setItem(DROPPED_KEY, String(n));
  } catch {
    /* ignore */
  }
}

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickRandom<T>(items: T[], n: number) {
  return shuffle(items).slice(0, Math.min(n, items.length));
}

function sayHiCap() {
  const { isVip, hasPaid } = useAppStore.getState();
  return isVip || hasPaid ? SAY_HI_CAP_PAID : SAY_HI_CAP_FREE;
}

function currentHosts(hosts?: Girl[]) {
  const pool = hosts && hosts.length > 0 ? hosts : useHostsStore.getState().hosts;
  return excludeCalled(pool, useAppStore.getState().calledGirlIds);
}

export const useSayHiStore = create<SayHiState>()((set, get) => ({
  words: seedSayHiWords,
  onlineNowIds: readJson<string[]>(ONLINE_KEY, []),
  dropped: readDropped(),
  ensureOnlineNow: (hosts) => {
    const pool = currentHosts(hosts);
    if (pool.length === 0) return;

    const ids = new Set(pool.map((h) => h.id));
    const kept = get().onlineNowIds.filter((id) => ids.has(id));
    if (kept.length >= Math.min(ONLINE_NOW_COUNT, pool.length)) {
      if (kept.length !== get().onlineNowIds.length) {
        writeJson(ONLINE_KEY, kept);
        set({ onlineNowIds: kept });
      }
      return;
    }

    const next = pickRandom(pool, ONLINE_NOW_COUNT).map((h) => h.id);
    writeJson(ONLINE_KEY, next);
    set({ onlineNowIds: next });
  },
}));

function pickHost(hosts: Girl[]) {
  if (hosts.length === 0) return null;
  const used = new Set(readJson<string[]>(USED_KEY, []));
  const unused = hosts.filter((h) => !used.has(h.id));
  const pool = unused.length > 0 ? unused : hosts;
  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}

function pickWord(words: string[]) {
  if (words.length === 0) return null;
  return words[Math.floor(Math.random() * words.length)] ?? null;
}

async function loadWords() {
  const remote = await fetchSayHiWords();
  if (remote && remote.length > 0) {
    useSayHiStore.setState({ words: remote });
  }
}

async function dropOne(): Promise<boolean> {
  const cap = sayHiCap();
  const dropped = readDropped();
  if (dropped >= cap) return false;

  if (useSayHiStore.getState().words.length <= seedSayHiWords.length) {
    await loadWords();
  }

  const hosts = currentHosts();
  useSayHiStore.getState().ensureOnlineNow(hosts);
  const host = pickHost(hosts);
  const word = pickWord(useSayHiStore.getState().words);
  if (!host || !word) return false;

  useAppStore.getState().insertIncoming(host.id, word, {
    name: host.name,
    avatar: host.avatar,
    online: host.online,
  });

  const used = readJson<string[]>(USED_KEY, []);
  writeJson(USED_KEY, used.includes(host.id) ? used : [...used, host.id]);
  const nextDropped = dropped + 1;
  writeDropped(nextDropped);
  useSayHiStore.setState({ dropped: nextDropped });
  return true;
}

function canDropMore() {
  return readDropped() < sayHiCap();
}

function scheduleDrop() {
  window.clearTimeout(dropTimer);
  window.clearTimeout(retryTimer);
  if (!canDropMore()) return;

  dropTimer = window.setTimeout(() => {
    void (async () => {
      const ok = await dropOne();
      if (!ok && canDropMore()) {
        retryTimer = window.setTimeout(() => {
          void (async () => {
            await dropOne();
            if (canDropMore()) scheduleDrop();
          })();
        }, 3_000);
        return;
      }
      if (canDropMore()) scheduleDrop();
    })();
  }, SAY_HI_INTERVAL_MS);
}

export function startSayHiDispatch() {
  if (dispatchStarted) return;
  dispatchStarted = true;
  useSayHiStore.getState().ensureOnlineNow();
  void loadWords().then(() => {
    useSayHiStore.getState().ensureOnlineNow();
  });
  scheduleDrop();
}

export function resetSayHiSession() {
  writeDropped(0);
  writeJson(USED_KEY, []);
  writeJson(ONLINE_KEY, []);
  useSayHiStore.setState({ dropped: 0, onlineNowIds: [] });
  if (dispatchStarted) {
    scheduleDrop();
  }
}

export function debugDropSayHi() {
  return dropOne();
}
