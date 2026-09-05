import { create } from "zustand";
import { fetchRemoteHosts } from "../data/hostsRepo";
import {
  hostFingerprint,
  mapHosts,
  seedHomeFeed,
  seedHostFingerprint,
  setHomeCatalog,
  type Girl,
} from "../data/girls";

export type HostsRefreshResult = "updated" | "same" | "failed";

type HostsState = {
  hosts: Girl[];
  fingerprint: string;
  loading: boolean;
  refreshHosts: (opts?: { force?: boolean }) => Promise<HostsRefreshResult>;
};

let inFlight: Promise<HostsRefreshResult> | null = null;
let lastAttemptAt = 0;

export const useHostsStore = create<HostsState>()((set, get) => ({
  hosts: seedHomeFeed,
  fingerprint: seedHostFingerprint,
  loading: false,
  refreshHosts: (opts) => {
    if (!opts?.force && lastAttemptAt && Date.now() - lastAttemptAt < 2500) {
      return Promise.resolve("same");
    }
    if (inFlight) return inFlight;

    inFlight = (async () => {
      set({ loading: true });
      try {
        const raw = await fetchRemoteHosts();
        lastAttemptAt = Date.now();
        if (!raw) return "failed";

        const nextPrint = hostFingerprint(raw);
        if (nextPrint === get().fingerprint) return "same";

        const hosts = mapHosts(raw);
        setHomeCatalog(hosts);
        set({ hosts, fingerprint: nextPrint });
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

setHomeCatalog(seedHomeFeed);
