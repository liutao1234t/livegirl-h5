import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { create } from "zustand";
import { rememberInboxPerson } from "../data/inboxPeople";
import {
  freeTryFingerprint,
  getFreeTryCatalog,
  mapFreeTryHosts,
  seedFreeTryFingerprint,
  seedFreeTryHosts,
  setFreeTryCatalog,
} from "../data/freeTry";
import { fetchRemoteFreeTryHosts } from "../data/freeTryRepo";
import { type Girl } from "../data/girls";
import { excludeCalled } from "../lib/calledHosts";
import { isEndCallPopPending, useAppStore } from "./appStore";
import { setIncomingOpen, setSkipIncomingExit } from "./callUi";

export { consumeSkipIncomingExit } from "./callUi";

const RING_DELAY_MS = 1800;
const RING_COOLDOWN_MS = 8_000;
const PHOTO_WAIT_MS = 2500;

type IncomingCallState = {
  hosts: Girl[];
  fingerprint: string;
  ringingGirlId: string | null;
  refreshHosts: () => Promise<void>;
};

let pendingRing = false;
let ringTimer = 0;
let lastRingAt = 0;
let catalogStarted = false;
let lastCountedId = "";
let lastCountedAt = 0;
let skipNextProfileViewId: string | null = null;
let presentSeq = 0;
let presentLock = false;

function waitForPhoto(src: string) {
  if (!src) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const img = new Image();
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve();
    };
    const timer = window.setTimeout(finish, PHOTO_WAIT_MS);
    img.onload = () => {
      if (typeof img.decode === "function") {
        void img.decode().then(finish, finish);
        return;
      }
      finish();
    };
    img.onerror = finish;
    img.src = src;
    if (img.complete && img.naturalWidth > 0) {
      if (typeof img.decode === "function") {
        void img.decode().then(finish, finish);
        return;
      }
      finish();
    }
  });
}

function currentPath() {
  if (typeof window === "undefined") return "";
  return window.location.pathname;
}

function canPresentNow() {
  const { seenSplash, overlay, activeCall, payBusy } = useAppStore.getState();
  if (!seenSplash) return false;
  if (activeCall) return false;
  if (payBusy) return false;
  if (overlay === "confirmLogout" || overlay === "confirmDelete" || overlay === "endCall" || overlay === "welcome") return false;
  if (isEndCallPopPending()) return false;
  const path = currentPath();
  if (!path || path === "/" || path.startsWith("/call/")) return false;
  if (presentLock) return false;
  if (useIncomingCallStore.getState().ringingGirlId) return false;
  if (lastRingAt && Date.now() - lastRingAt < RING_COOLDOWN_MS) return false;
  return true;
}

function pickUnusedHost() {
  const pool = excludeCalled(useIncomingCallStore.getState().hosts, useAppStore.getState().calledGirlIds);
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}

async function presentIncoming(host: Girl) {
  const seq = ++presentSeq;
  presentLock = true;
  const catalog = getFreeTryCatalog();
  if (!catalog.some((h) => h.id === host.id)) {
    setFreeTryCatalog([...catalog, host]);
  }
  rememberInboxPerson({
    id: host.id,
    name: host.name,
    avatar: host.avatar,
    online: host.online,
  });
  await waitForPhoto(host.photo || host.avatar);
  if (seq !== presentSeq) return;
  presentLock = false;
  if (!canPresentNow()) {
    pendingRing = true;
    return;
  }
  lastRingAt = Date.now();
  pendingRing = false;
  useAppStore.getState().closeOverlay();
  setSkipIncomingExit(false);
  setIncomingOpen(true);
  useIncomingCallStore.setState({ ringingGirlId: host.id });
}

async function ringNow() {
  if (presentLock || useIncomingCallStore.getState().ringingGirlId) return false;
  if (!canPresentNow()) {
    pendingRing = true;
    return false;
  }
  if (useIncomingCallStore.getState().hosts.length <= seedFreeTryHosts.length) {
    await useIncomingCallStore.getState().refreshHosts();
  }
  if (presentLock || useIncomingCallStore.getState().ringingGirlId) return false;
  if (!canPresentNow()) {
    pendingRing = true;
    return false;
  }
  const host = pickUnusedHost();
  if (!host) {
    pendingRing = false;
    return false;
  }
  await presentIncoming(host);
  return true;
}

function scheduleRing() {
  pendingRing = true;
  if (ringTimer) return;
  if (presentLock || useIncomingCallStore.getState().ringingGirlId) return;
  ringTimer = window.setTimeout(() => {
    ringTimer = 0;
    void ringNow();
  }, RING_DELAY_MS);
}

export const useIncomingCallStore = create<IncomingCallState>()((set, get) => ({
  hosts: seedFreeTryHosts,
  fingerprint: seedFreeTryFingerprint,
  ringingGirlId: null,
  refreshHosts: async () => {
    const raw = await fetchRemoteFreeTryHosts();
    if (!raw) return;
    const nextPrint = freeTryFingerprint(raw);
    if (nextPrint === get().fingerprint) return;
    const hosts = mapFreeTryHosts(raw);
    setFreeTryCatalog(hosts);
    set({ hosts, fingerprint: nextPrint });
  },
}));

export function ignoreNextProfileView(girlId: string) {
  skipNextProfileViewId = girlId;
}

export function noteProfileView(girlId: string) {
  const id = girlId.trim();
  if (!id) return;
  if (skipNextProfileViewId === id) {
    skipNextProfileViewId = null;
    return;
  }
  const now = Date.now();
  if (id === lastCountedId && now - lastCountedAt < 800) return;
  lastCountedId = id;
  lastCountedAt = now;

  const prev = useAppStore.getState().viewedHostIds ?? [];
  const viewedHostIds = [...prev, id];
  useAppStore.setState({ viewedHostIds });
  if (viewedHostIds.length % 3 === 0) scheduleRing();
}

export function noteHostReply(girlId: string) {
  const id = girlId.trim();
  if (!id) return;
  const thread = useAppStore.getState().threads[id] ?? [];
  const hasHostMsg = thread.some((m) => m.from === "them");
  const delivered = thread.filter((m) => m.from === "me" && m.status !== "fail").length;
  if (!hasHostMsg || delivered !== 1) return;
  scheduleRing();
}

export function dismissIncoming(opts?: { instant?: boolean }) {
  presentSeq += 1;
  presentLock = false;
  window.clearTimeout(ringTimer);
  ringTimer = 0;
  const wasRinging = Boolean(useIncomingCallStore.getState().ringingGirlId);
  if (wasRinging) lastRingAt = Date.now();
  setSkipIncomingExit(Boolean(opts?.instant));
  setIncomingOpen(false);
  useIncomingCallStore.setState({ ringingGirlId: null });
}

export function flushPendingIncoming() {
  if (!pendingRing) return;
  if (useIncomingCallStore.getState().ringingGirlId) return;
  scheduleRing();
}

export function resetIncomingCallSession() {
  presentSeq += 1;
  presentLock = false;
  window.clearTimeout(ringTimer);
  ringTimer = 0;
  pendingRing = false;
  lastRingAt = 0;
  lastCountedId = "";
  lastCountedAt = 0;
  skipNextProfileViewId = null;
  setSkipIncomingExit(true);
  setIncomingOpen(false);
  useIncomingCallStore.setState({ ringingGirlId: null });
}

export function startIncomingCallDispatch() {
  if (catalogStarted) return;
  catalogStarted = true;
  void useIncomingCallStore.getState().refreshHosts();
}

export function debugRingIncoming() {
  lastRingAt = 0;
  scheduleRing();
}

export function IncomingCallGate() {
  const location = useLocation();

  useEffect(() => {
    if (location.pathname.startsWith("/call/") || location.pathname === "/") return;
    flushPendingIncoming();
  }, [location.pathname]);

  return null;
}
