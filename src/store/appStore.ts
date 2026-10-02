import { create } from "zustand";
import { persist } from "zustand/middleware";
import { isIncomingOpen } from "./callUi";
import { getGirl } from "../data/girls";
import { isUsableVideoUrl } from "../lib/media";
import {
  allInboxPeople,
  rememberInboxPeople,
  rememberInboxPerson,
  type InboxPerson,
} from "../data/inboxPeople";
import { type ChatMsg } from "../data/messages";
import type { IapRequest } from "../data/iap";
import { gifts, NEWBIE_COINS } from "../data/shop";
import { cancelPendingIap, iapFailToast, iapSuccessToast, requestIap } from "../lib/nativeIap";
import {
  askHostReply,
  fallbackHostReply,
  randomHostReplyDelay,
} from "../lib/hostChat";
import {
  askSupportAgent,
  formatSupportTime,
  sleep,
  supportReplyDelayMs,
  supportWelcomeMsg,
  type SupportMsg,
} from "../lib/supportChat";

export type OverlayId =
  | "gift"
  | "coins"
  | "unlock"
  | "endCall"
  | "dailyTask"
  | "rateUs"
  | "welcome"
  | "reward3"
  | "promo"
  | "newMsg"
  | "confirmLogout"
  | "confirmDelete"
  | "insufficient"
  | null;

export type BillRow = {
  id: string;
  title: string;
  at: string;
  amount: number;
  kind: "in" | "out";
};

export type ProfileDraft = {
  nickname: string;
  bio: string;
  gender: string;
  birthday: string;
};

export const CHECKIN_REWARD = 50;
export const CHECKIN_BONUS = 250;
export const RATE_REWARD = 100;
export const MESSAGE_COST = 1;
export const VIP_BONUS_COINS = 2000;
export const STARTING_COINS = 5;
export const TOAST_HOLD_MS = 2200;
export const WELCOME_POP_DELAY_MS = 2000;
export const REWARD3_ELIGIBLE_AFTER_MS = 24 * 60 * 60 * 1000;
export const REWARD3_DURATION_MS = 72 * 60 * 60 * 1000;

export function isReward3Active(until: number | null | undefined, now = Date.now()) {
  return typeof until === "number" && until > now;
}

export function resolveRegisteredAt(userId: string | null, registeredAt?: number | null) {
  if (typeof registeredAt === "number" && Number.isFinite(registeredAt) && registeredAt > 0) {
    return registeredAt;
  }
  const n = Number(userId);
  if (Number.isFinite(n) && n > 1_000_000_000_000) return n;
  return 0;
}

export type GiftFx = {
  token: number;
  icon: string;
};

export type LastCall = {
  girlId: string;
  durationSec: number;
  coinsSpent: number;
};

export type ActiveCall = {
  girlId: string;
  startedAt: number;
  billedMinutes: number;
  spent: number;
  ratePerMin: number;
  isFree?: boolean;
  isPass?: boolean;
};

export function formatCallClock(sec: number) {
  const safe = Math.max(0, Math.floor(sec));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function billedCallRate(listRate: number, isVip: boolean) {
  const rate = Math.max(0, Math.floor(Number(listRate) || 0));
  if (rate <= 0) return 0;
  if (!isVip) return rate;
  return Math.max(1, Math.floor(rate / 2));
}

export function todayKey() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function resolveCheckIn(lastCheckInDate: string | null, checkInCount: number) {
  const claimedToday = lastCheckInDate === todayKey();
  const day = claimedToday ? Math.min(Math.max(checkInCount, 1), 7) : (checkInCount % 7) + 1;
  const reward = day === 7 ? CHECKIN_BONUS : CHECKIN_REWARD;
  return { claimedToday, day, reward };
}

function currentPath() {
  if (typeof window === "undefined") return "";
  return window.location.pathname;
}

function isInVideoCall(activeCall: ActiveCall | null) {
  return Boolean(activeCall) || currentPath().startsWith("/call/") || isIncomingOpen();
}

const END_CALL_POP_MS = 2000;
let endCallPopTimer: number | undefined;
let welcomePopTimer: number | undefined;

export function cancelEndCallPop() {
  if (typeof window === "undefined") return;
  window.clearTimeout(endCallPopTimer);
  endCallPopTimer = undefined;
}

function cancelWelcomePop() {
  if (typeof window === "undefined") return;
  window.clearTimeout(welcomePopTimer);
  welcomePopTimer = undefined;
}

export function isEndCallPopPending() {
  return endCallPopTimer != null;
}

export function scheduleEndCallPop(girlId: string) {
  cancelEndCallPop();
  endCallPopTimer = window.setTimeout(() => {
    endCallPopTimer = undefined;
    useAppStore.getState().openOverlay("endCall", girlId);
  }, END_CALL_POP_MS);
}

function shouldPromptNewMessage(overlay: OverlayId, activeCall: ActiveCall | null, girlId: string) {
  if (isInVideoCall(activeCall)) return false;
  if (isViewingChat(girlId)) return false;
  const path = currentPath();
  if (!path || path === "/") return false;
  if (overlay && overlay !== "newMsg") return false;
  return true;
}

type Threads = Record<string, ChatMsg[]>;

type AppState = {
  userId: string | null;
  coins: number;
  isVip: boolean;
  hasPaid: boolean;
  boughtNewbieOffer: boolean;
  registeredAt: number | null;
  reward3Until: number | null;
  seenSplash: boolean;
  seenWelcome: boolean;
  toast: string | null;
  payBusy: boolean;
  overlay: OverlayId;
  overlayGirlId: string | null;
  giftFx: GiftFx | null;
  threads: Threads;
  unread: Record<string, number>;
  inboxPeople: Record<string, InboxPerson>;
  followedIds: string[];
  favorites: number;
  dailyTaskDot: boolean;
  lastCheckInDate: string | null;
  checkInCount: number;
  ratedUs: boolean;
  appleSupportSubmitted: boolean;
  profile: ProfileDraft;
  bills: BillRow[];
  lastCall: LastCall | null;
  lastFreeCallDate: string | null;
  calledGirlIds: string[];
  viewedHostIds: string[];
  activeCall: ActiveCall | null;
  supportMessages: SupportMsg[];
  supportBusy: boolean;
  sendSupportMessage: (text: string) => void;
  beginCall: (girlId: string, ratePerMin: number, videoUrl?: string | null) => boolean;
  chargeCallTick: (elapsedSec: number) => boolean;
  finishCall: (girlId: string, durationSec: number, title: string) => void;
  submitAppleSupport: () => void;
  clearAppleSupport: () => void;
  startSession: () => void;
  resetAccount: (mode: "logout" | "delete") => void;
  openOverlay: (id: OverlayId, girlId?: string) => void;
  closeOverlay: () => void;
  clearGiftFx: () => void;
  sendMessage: (girlId: string, text: string) => boolean;
  sendGift: (girlId: string, giftId: string) => boolean;
  insertIncoming: (girlId: string, text: string, person?: Omit<InboxPerson, "id">) => void;
  toggleFollow: (girlId: string) => void;
  markRead: (girlId: string) => void;
  spendCoins: (n: number, title: string) => boolean;
  addCoins: (n: number, title: string) => void;
  buyCoins: (n: number, title: string) => void;
  buyNewbieOffer: () => void;
  buyReward3: () => void;
  offerReward3IfDue: () => void;
  offerWelcomeIfNeeded: () => void;
  startPurchase: (request: IapRequest, apply: () => void) => void;
  showToast: (text: string) => void;
  saveProfile: (p: ProfileDraft) => void;
  buyVip: () => void;
  claimDaily: () => void;
  claimRate: () => void;
  claimWelcome: () => void;
};

const guestProfile: ProfileDraft = {
  nickname: "User",
  bio: "",
  gender: "",
  birthday: "",
};

function newUserId() {
  return String(Date.now());
}

function blankProgress(userId: string | null) {
  return {
    userId,
    coins: 0,
    isVip: false,
    hasPaid: false,
    boughtNewbieOffer: false,
    registeredAt: userId ? resolveRegisteredAt(userId) : null,
    reward3Until: null as number | null,
    seenWelcome: false,
    toast: null as string | null,
    payBusy: false,
    overlay: null as OverlayId,
    overlayGirlId: null as string | null,
    giftFx: null as GiftFx | null,
    threads: {} as Threads,
    unread: {} as Record<string, number>,
    inboxPeople: {} as Record<string, InboxPerson>,
    followedIds: [] as string[],
    favorites: 0,
    dailyTaskDot: true,
    lastCheckInDate: null as string | null,
    checkInCount: 0,
    ratedUs: false,
    appleSupportSubmitted: false,
    profile: { ...guestProfile },
    bills: [] as BillRow[],
    lastCall: null as LastCall | null,
    lastFreeCallDate: null as string | null,
    calledGirlIds: [] as string[],
    viewedHostIds: [] as string[],
    activeCall: null as ActiveCall | null,
    supportMessages: [supportWelcomeMsg()],
    supportBusy: false,
  };
}

const hostReplyJob: Record<string, number> = {};
let hostReplySeq = 0;
let toastTimer: number | undefined;
let paySeq = 0;
let giftFxSeq = 0;

function cancelHostReplies() {
  for (const id of Object.keys(hostReplyJob)) delete hostReplyJob[id];
}

function isViewingChat(girlId: string) {
  return currentPath() === `/chat/${girlId}`;
}

function stamp() {
  return new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function rememberGirl(girlId: string) {
  const girl = getGirl(girlId);
  rememberInboxPerson({
    id: girl.id,
    name: girl.name,
    avatar: girl.avatar,
    online: girl.online,
  });
  return girl;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...blankProgress(null),
      seenSplash: false,
      sendSupportMessage: (text) => {
        const trimmed = text.trim();
        if (!trimmed || get().supportBusy) return;
        const userMsg: SupportMsg = {
          id: `${Date.now()}`,
          from: "me",
          text: trimmed,
          time: formatSupportTime(),
        };
        const history = [...get().supportMessages, userMsg];
        set({
          supportBusy: true,
          supportMessages: history,
        });

        void (async () => {
          const started = Date.now();
          const reply = await askSupportAgent(history);
          if (!get().supportBusy) return;

          const left = supportReplyDelayMs(reply) - (Date.now() - started);
          if (left > 0) await sleep(left);
          if (!get().supportBusy) return;

          set({
            supportBusy: false,
            supportMessages: [
              ...get().supportMessages,
              {
                id: `${Date.now()}-a`,
                from: "them",
                text: reply,
                time: formatSupportTime(),
              },
            ],
          });
        })();
      },
      beginCall: (girlId, ratePerMin, videoUrl) => {
        cancelEndCallPop();
        const existing = get().activeCall;
        if (existing?.girlId === girlId) return true;
        const passActive = isReward3Active(get().reward3Until);
        const rate = passActive ? 0 : billedCallRate(ratePerMin, get().isVip);
        const coins = get().coins;
        const canPay = rate <= 0 || coins >= rate;
        const useFree = !canPay && get().lastFreeCallDate !== todayKey() && isUsableVideoUrl(videoUrl);
        if (!canPay && !useFree) return false;
        const prevCalled = get().calledGirlIds ?? [];
        const calledGirlIds = prevCalled.includes(girlId) ? prevCalled : [...prevCalled, girlId];
        if (passActive) {
          set({
            calledGirlIds,
            activeCall: {
              girlId,
              startedAt: Date.now(),
              billedMinutes: 0,
              spent: 0,
              ratePerMin: 0,
              isPass: true,
            },
          });
          return true;
        }
        if (useFree) {
          set({
            lastFreeCallDate: todayKey(),
            calledGirlIds,
            activeCall: {
              girlId,
              startedAt: Date.now(),
              billedMinutes: 0,
              spent: 0,
              ratePerMin: 0,
              isFree: true,
            },
          });
          return true;
        }
        set({
          coins: coins - rate,
          calledGirlIds,
          activeCall: {
            girlId,
            startedAt: Date.now(),
            billedMinutes: 1,
            spent: rate,
            ratePerMin: rate,
          },
        });
        return true;
      },
      chargeCallTick: (elapsedSec) => {
        const call = get().activeCall;
        if (!call) return false;
        if (call.isFree || call.isPass || call.ratePerMin <= 0) return true;
        const needed = Math.floor(Math.max(0, elapsedSec) / 60) + 1;
        let coins = get().coins;
        let billedMinutes = call.billedMinutes;
        let spent = call.spent;
        while (billedMinutes < needed) {
          if (call.ratePerMin > 0 && coins < call.ratePerMin) {
            set({ activeCall: { ...call, billedMinutes, spent } });
            return false;
          }
          coins -= call.ratePerMin;
          spent += call.ratePerMin;
          billedMinutes += 1;
        }
        if (billedMinutes !== call.billedMinutes) {
          set({ coins, activeCall: { ...call, billedMinutes, spent } });
        }
        return true;
      },
      finishCall: (girlId, durationSec, title) => {
        const call = get().activeCall;
        const spent = call?.girlId === girlId ? call.spent : 0;
        set({
          activeCall: null,
          giftFx: null,
          lastCall: { girlId, durationSec: Math.max(0, durationSec), coinsSpent: spent },
          bills:
            spent > 0
              ? [{ id: `${Date.now()}`, title, at: stamp(), amount: -spent, kind: "out" }, ...get().bills]
              : get().bills,
        });
      },
      startSession: () => {
        if (!get().userId) {
          cancelHostReplies();
          const userId = newUserId();
          set({
            ...blankProgress(userId),
            coins: STARTING_COINS,
            bills: [
              {
                id: `${userId}-start`,
                title: "Starter Coins",
                at: stamp(),
                amount: STARTING_COINS,
                kind: "in",
              },
            ],
            seenSplash: true,
          });
          rememberInboxPeople({});
          void import("./sayHiStore").then((m) => m.resetSayHiSession());
          void import("./incomingCallStore").then((m) => m.resetIncomingCallSession());
          void import("../lib/firebase").then((m) => m.bindLocalUser(userId, true));
          return;
        }
        set({ seenSplash: true });
      },
      openOverlay: (id, girlId) => set({ overlay: id, overlayGirlId: girlId ?? get().overlayGirlId }),
      closeOverlay: () =>
        set({
          overlay: null,
          ...(get().overlay === "welcome" ? { seenWelcome: true } : {}),
        }),
      clearGiftFx: () => set({ giftFx: null }),
      toggleFollow: (girlId) => {
        const followedIds = get().followedIds;
        set({
          followedIds: followedIds.includes(girlId)
            ? followedIds.filter((id) => id !== girlId)
            : [...followedIds, girlId],
        });
      },
      markRead: (girlId) => {
        const unread = { ...get().unread };
        if (!unread[girlId]) return;
        delete unread[girlId];
        set({ unread });
      },
      addCoins: (n, title) =>
        set({
          coins: get().coins + n,
          bills: [{ id: `${Date.now()}`, title, at: stamp(), amount: n, kind: "in" }, ...get().bills],
        }),
      buyCoins: (n, title) => {
        get().addCoins(n, title);
        set({ hasPaid: true });
      },
      buyNewbieOffer: () => {
        if (get().boughtNewbieOffer) return;
        get().buyCoins(NEWBIE_COINS, "Newbie Offer");
        set({ boughtNewbieOffer: true });
      },
      buyReward3: () => {
        if (get().reward3Until != null) return;
        set({
          reward3Until: Date.now() + REWARD3_DURATION_MS,
          hasPaid: true,
        });
      },
      offerReward3IfDue: () => {
        const { overlay, payBusy, userId, registeredAt, reward3Until, activeCall } = get();
        if (reward3Until != null) return;
        if (overlay || payBusy) return;
        if (isInVideoCall(activeCall)) return;
        const at = resolveRegisteredAt(userId, registeredAt);
        if (!at || Date.now() - at < REWARD3_ELIGIBLE_AFTER_MS) return;
        set({ overlay: "reward3" });
      },
      offerWelcomeIfNeeded: () => {
        const { seenWelcome, seenSplash, overlay, payBusy, activeCall } = get();
        if (seenWelcome || !seenSplash) {
          cancelWelcomePop();
          return;
        }
        if (overlay === "welcome" || welcomePopTimer) return;
        if (overlay || payBusy) return;
        if (isInVideoCall(activeCall)) return;
        welcomePopTimer = window.setTimeout(() => {
          welcomePopTimer = undefined;
          const s = useAppStore.getState();
          if (s.seenWelcome || !s.seenSplash) return;
          if (s.overlay || s.payBusy) return;
          if (isInVideoCall(s.activeCall)) return;
          set({ overlay: "welcome" });
        }, WELCOME_POP_DELAY_MS);
      },
      showToast: (text) => {
        const msg = text.trim();
        if (!msg) return;
        set({ toast: msg });
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(() => {
          if (useAppStore.getState().toast === msg) set({ toast: null });
        }, TOAST_HOLD_MS);
      },
      startPurchase: (request, apply) => {
        if (get().payBusy) return;
        const token = ++paySeq;
        set({ payBusy: true });
        void requestIap(request).then((outcome) => {
          if (token !== paySeq) return;
          if (outcome.ok) {
            apply();
            get().showToast(iapSuccessToast());
          } else {
            get().showToast(iapFailToast(outcome.reason));
          }
          if (token !== paySeq) return;
          set({ payBusy: false });
        });
      },
      sendMessage: (girlId, text) => {
        const trimmed = text.trim();
        if (!trimmed) return false;
        const vip = get().isVip;
        const girl = rememberGirl(girlId);
        let delivered = true;
        if (!vip) {
          if (get().coins < MESSAGE_COST) {
            delivered = false;
          } else if (!get().spendCoins(MESSAGE_COST, `Chat · ${girl.name}`)) {
            return false;
          }
        }

        const threads = { ...get().threads };
        const list = threads[girlId] ? [...threads[girlId]] : [];
        list.push({
          id: `${Date.now()}`,
          from: "me",
          text: trimmed,
          at: Date.now(),
          status: delivered ? "ok" : "fail",
        });
        threads[girlId] = list;
        set({ threads, inboxPeople: { ...allInboxPeople() } });
        if (!delivered) return true;
        void import("./incomingCallStore").then((m) => m.noteHostReply(girlId));

        const token = ++hostReplySeq;
        hostReplyJob[girlId] = token;
        const delayMs = randomHostReplyDelay();
        const history = list;

        void (async () => {
          const replyPromise = askHostReply(girl, history);
          await sleep(delayMs);
          if (hostReplyJob[girlId] !== token) return;

          const reply = await replyPromise.catch(() => fallbackHostReply());
          if (hostReplyJob[girlId] !== token) return;
          delete hostReplyJob[girlId];

          if (isViewingChat(girlId)) {
            const next = { ...get().threads };
            const cur = next[girlId] ? [...next[girlId]] : [];
            cur.push({
              id: `${Date.now()}-r`,
              from: "them",
              text: reply,
              at: Date.now(),
            });
            next[girlId] = cur;
            set({ threads: next });
            return;
          }

          get().insertIncoming(girlId, reply);
        })();
        return true;
      },
      sendGift: (girlId, giftId) => {
        const gift = gifts.find((g) => g.id === giftId);
        if (!gift) return false;
        rememberGirl(girlId);
        const label = gift.name.replace(/\n/g, " ");
        if (!get().spendCoins(gift.cost, `Gift · ${label}`)) return false;

        const threads = { ...get().threads };
        const list = threads[girlId] ? [...threads[girlId]] : [];
        list.push({
          id: `${Date.now()}`,
          from: "me",
          text: `Sent ${label}`,
          at: Date.now(),
          kind: "gift",
          image: gift.icon,
        });
        threads[girlId] = list;
        set({
          threads,
          inboxPeople: { ...allInboxPeople() },
          giftFx: get().activeCall ? { token: ++giftFxSeq, icon: gift.icon } : get().giftFx,
        });
        return true;
      },
      insertIncoming: (girlId, text, person) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        const girl = getGirl(girlId);
        rememberInboxPerson({
          id: girlId,
          name: person?.name ?? girl.name,
          avatar: person?.avatar ?? girl.avatar,
          online: person?.online ?? girl.online,
        });
        const threads = { ...get().threads };
        const list = threads[girlId] ? [...threads[girlId]] : [];
        list.push({
          id: `${Date.now()}-in`,
          from: "them",
          text: trimmed,
          at: Date.now(),
        });
        threads[girlId] = list;
        const unread = { ...get().unread, [girlId]: (get().unread[girlId] ?? 0) + 1 };
        const inboxPeople = { ...allInboxPeople() };
        const prompt = !get().payBusy && shouldPromptNewMessage(get().overlay, get().activeCall, girlId);
        set({
          threads,
          unread,
          inboxPeople,
          ...(prompt ? { overlay: "newMsg" as const, overlayGirlId: girlId } : {}),
        });
      },
      spendCoins: (n, title) => {
        const coins = get().coins;
        if (coins < n) {
          set({ overlay: "insufficient" });
          return false;
        }
        set({
          coins: coins - n,
          bills: [{ id: `${Date.now()}`, title, at: stamp(), amount: -n, kind: "out" }, ...get().bills],
        });
        return true;
      },
      saveProfile: (p) => set({ profile: p }),
      buyVip: () => {
        if (get().isVip) return;
        set({
          isVip: true,
          hasPaid: true,
          coins: get().coins + VIP_BONUS_COINS,
          bills: [
            { id: `${Date.now()}`, title: "VIP Bonus", at: stamp(), amount: VIP_BONUS_COINS, kind: "in" },
            ...get().bills,
          ],
        });
      },
      claimDaily: () => {
        const { lastCheckInDate, checkInCount } = get();
        const { claimedToday, day, reward } = resolveCheckIn(lastCheckInDate, checkInCount);
        if (claimedToday) return;
        get().addCoins(reward, day === 7 ? "Day 7 Bonus" : `Check-in Day ${day}`);
        set({
          lastCheckInDate: todayKey(),
          checkInCount: day,
          dailyTaskDot: false,
        });
      },
      claimRate: () => {
        if (get().ratedUs) return;
        get().addCoins(RATE_REWARD, "Rate Us");
        set({ ratedUs: true });
      },
      claimWelcome: () => {
        cancelWelcomePop();
        set({ seenWelcome: true, overlay: null });
      },
      submitAppleSupport: () => set({ appleSupportSubmitted: true }),
      clearAppleSupport: () => set({ appleSupportSubmitted: false }),
      resetAccount: (mode) => {
        cancelEndCallPop();
        cancelWelcomePop();
        cancelHostReplies();
        window.clearTimeout(toastTimer);
        paySeq += 1;
        cancelPendingIap();
        if (mode === "delete") {
          set({
            ...blankProgress(null),
            seenSplash: false,
          });
          rememberInboxPeople({});
          void import("./sayHiStore").then((m) => m.resetSayHiSession());
          void import("./incomingCallStore").then((m) => m.resetIncomingCallSession());
          void import("../lib/firebase").then((m) => m.clearFirebaseUser());
          return;
        }
        set({
          overlay: null,
          overlayGirlId: null,
          giftFx: null,
          toast: null,
          payBusy: false,
          seenSplash: false,
          isVip: false,
          hasPaid: false,
          activeCall: null,
          supportBusy: false,
        });
      },
    }),
    {
      name: "livegirl-progress",
      partialize: (s) => ({
        userId: s.userId,
        coins: s.coins,
        isVip: s.isVip,
        hasPaid: s.hasPaid,
        boughtNewbieOffer: s.boughtNewbieOffer,
        registeredAt: s.registeredAt,
        reward3Until: s.reward3Until,
        seenSplash: s.seenSplash,
        seenWelcome: s.seenWelcome,
        threads: s.threads,
        unread: s.unread,
        inboxPeople: s.inboxPeople,
        followedIds: s.followedIds,
        favorites: s.favorites,
        dailyTaskDot: s.dailyTaskDot,
        lastCheckInDate: s.lastCheckInDate,
        checkInCount: s.checkInCount,
        ratedUs: s.ratedUs,
        appleSupportSubmitted: s.appleSupportSubmitted,
        profile: s.profile,
        bills: s.bills,
        lastCall: s.lastCall,
        lastFreeCallDate: s.lastFreeCallDate,
        calledGirlIds: s.calledGirlIds,
        viewedHostIds: s.viewedHostIds,
        supportMessages: s.supportMessages,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (!Array.isArray(state.followedIds)) {
          useAppStore.setState({ followedIds: [] });
        }
        if (!state.inboxPeople || typeof state.inboxPeople !== "object") {
          useAppStore.setState({ inboxPeople: {} });
        } else {
          rememberInboxPeople(state.inboxPeople);
        }
        if (!Array.isArray(state.supportMessages) || state.supportMessages.length === 0) {
          useAppStore.setState({ supportMessages: [supportWelcomeMsg()] });
        }
        if (typeof state.hasPaid !== "boolean") {
          useAppStore.setState({ hasPaid: Boolean(state.isVip) });
        }
        if (typeof state.boughtNewbieOffer !== "boolean") {
          useAppStore.setState({ boughtNewbieOffer: false });
        }
        if (typeof state.registeredAt !== "number" || state.registeredAt <= 0) {
          const fromId = resolveRegisteredAt(state.userId ?? null, state.registeredAt);
          useAppStore.setState({ registeredAt: fromId || null });
        }
        if (typeof state.reward3Until !== "number") {
          useAppStore.setState({ reward3Until: null });
        }
        if (typeof state.seenWelcome !== "boolean") {
          useAppStore.setState({ seenWelcome: Boolean(state.userId) });
        }
        if (state.lastCheckInDate !== todayKey()) {
          useAppStore.setState({ dailyTaskDot: true });
        }
        if (!Array.isArray(state.calledGirlIds)) {
          const fromLast = state.lastCall?.girlId;
          useAppStore.setState({ calledGirlIds: fromLast ? [fromLast] : [] });
        }
        if (typeof state.lastFreeCallDate !== "string") {
          useAppStore.setState({ lastFreeCallDate: null });
        }
        if (!Array.isArray(state.viewedHostIds)) {
          useAppStore.setState({ viewedHostIds: [] });
        }
        if (state.userId) {
          void import("../lib/firebase").then((m) => m.bindLocalUser(state.userId as string, false));
        }
      },
      version: 10,
      migrate: (persisted, fromVersion) => {
        const next = { ...(persisted as Record<string, unknown>) };
        if (fromVersion < 2) {
          next.ratedUs = false;
          next.lastCheckInDate = null;
          next.checkInCount = 0;
          next.dailyTaskDot = true;
        }
        if (fromVersion < 3) {
          next.threads = {};
          next.unread = {};
          next.inboxPeople = {};
          next.hasPaid = Boolean(next.isVip);
        }
        if (fromVersion < 4) {
          const existingId = typeof next.userId === "string" ? next.userId : "";
          if (!existingId) {
            next.userId = next.seenSplash ? String(Date.now()) : null;
          }
        }
        if (fromVersion < 5) {
          const last = next.lastCall as LastCall | null | undefined;
          const existing = Array.isArray(next.calledGirlIds) ? (next.calledGirlIds as string[]) : [];
          next.calledGirlIds = last?.girlId && !existing.includes(last.girlId) ? [...existing, last.girlId] : existing;
        }
        if (fromVersion < 6) {
          next.viewedHostIds = Array.isArray(next.viewedHostIds) ? next.viewedHostIds : [];
        }
        if (fromVersion < 7) {
          next.boughtNewbieOffer = false;
        }
        if (fromVersion < 8) {
          next.lastFreeCallDate = typeof next.lastFreeCallDate === "string" ? next.lastFreeCallDate : null;
        }
        if (fromVersion < 9) {
          const fromId = resolveRegisteredAt(
            typeof next.userId === "string" ? next.userId : null,
            typeof next.registeredAt === "number" ? next.registeredAt : null,
          );
          next.registeredAt = fromId || null;
          next.reward3Until = typeof next.reward3Until === "number" ? next.reward3Until : null;
        }
        if (fromVersion < 10) {
          next.seenWelcome = Boolean(next.userId);
        }
        return next as typeof persisted;
      },
    },
  ),
);
