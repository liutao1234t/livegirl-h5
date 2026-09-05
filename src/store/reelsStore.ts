import { create } from "zustand";
import { fetchRemoteReels } from "../data/reelsRepo";
import {
  mapReels,
  reelFingerprint,
  seedReelFingerprint,
  seedReels,
  setReelCatalog,
  type Reel,
} from "../data/reels";

export type ReelsRefreshResult = "updated" | "same" | "failed";

type ReelsState = {
  reels: Reel[];
  fingerprint: string;
  loading: boolean;
  activeId: string | null;
  paused: boolean;
  refreshReels: (opts?: { force?: boolean }) => Promise<ReelsRefreshResult>;
  setActiveId: (id: string) => void;
  setPaused: (paused: boolean) => void;
};

let inFlight: Promise<ReelsRefreshResult> | null = null;
let lastAttemptAt = 0;

export const useReelsStore = create<ReelsState>()((set, get) => ({
  reels: seedReels,
  fingerprint: seedReelFingerprint,
  loading: false,
  activeId: null,
  paused: false,
  setActiveId: (id) => {
    if (get().activeId === id) return;
    set({ activeId: id, paused: false });
  },
  setPaused: (paused) => {
    if (get().paused === paused) return;
    set({ paused });
  },
  refreshReels: (opts) => {
    if (!opts?.force && lastAttemptAt && Date.now() - lastAttemptAt < 2500) {
      return Promise.resolve("same");
    }
    if (inFlight) return inFlight;

    inFlight = (async () => {
      set({ loading: true });
      try {
        const raw = await fetchRemoteReels();
        lastAttemptAt = Date.now();
        if (!raw) return "failed";

        const nextPrint = reelFingerprint(raw);
        if (nextPrint === get().fingerprint) return "same";

        const reels = mapReels(raw);
        setReelCatalog(reels);
        set({ reels, fingerprint: nextPrint });
        return "updated";
      } catch {
        lastAttemptAt = Date.now();
        return "failed";
      } finally {
        set({ loading: false });
        inFlight = null;
      }
    })();

    return inFlight;
  },
}));

setReelCatalog(seedReels);
