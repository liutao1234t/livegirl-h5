/**
 * H5 account API. UI must not call this; go through appStore.
 * Login without userId creates a server user. Always reuse the local userId
 * on the same phone so Get Started does not register again.
 * After the local coin balance changes, report userid + remaincoin.
 * After the user rates the app, report userid + ratestatus so the user row updates.
 * A failed report must not roll back coins or block the page.
 */

import { unwrapDpKey } from "../lib/dpkeyCrypto";
import { h5AppClient } from "./appClient";
import type { IapType } from "./iap";

const DEFAULT_H5_API_BASE = "https://huinongyunchuang.cn";
const LOGIN_TIMEOUT_MS = 8000;
const PURCHASE_TIMEOUT_MS = 8000;
const COIN_TIMEOUT_MS = 8000;
const RATE_TIMEOUT_MS = 8000;
const BEHAVIOR_TIMEOUT_MS = 8000;
const DPKEY_TIMEOUT_MS = 8000;

export type H5LoginResult = {
  userId: string;
  isNewUser: boolean;
  accessToken: string | null;
  createdAtMs: number | null;
};

export type H5PurchaseResult = {
  purchaseId: string;
  userId: string;
  iapId: string;
  amount: string;
};

type Envelope = {
  code?: unknown;
  message?: unknown;
  data?: unknown;
};

function apiBase() {
  const fromEnv = import.meta.env.VITE_H5_API_BASE?.trim().replace(/\/$/, "");
  return fromEnv || DEFAULT_H5_API_BASE;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function parseCreatedAtMs(value: unknown): number | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

async function postJson(
  path: string,
  body: unknown,
  timeoutMs: number,
  accessToken?: string | null,
): Promise<Envelope | null> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    const res = await fetch(`${apiBase()}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const data: unknown = await res.json().catch(() => null);
    return asRecord(data);
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

function parseLogin(raw: Envelope | null): H5LoginResult | null {
  if (!raw || raw.code !== 0) return null;
  const data = asRecord(raw.data);
  if (!data) return null;
  const userId = asString(data.userId);
  if (!userId) return null;
  return {
    userId,
    isNewUser: data.isNewUser === true,
    accessToken: asString(data.accessToken),
    createdAtMs: parseCreatedAtMs(data.createdAt),
  };
}

function parsePurchase(raw: Envelope | null): H5PurchaseResult | null {
  if (!raw || raw.code !== 0) return null;
  const data = asRecord(raw.data);
  if (!data) return null;
  const purchaseId = asString(data.purchaseId);
  const userId = asString(data.userId);
  const iapId = asString(data.iapId);
  const amount = asString(data.amount);
  if (!purchaseId || !userId || !iapId || !amount) return null;
  return { purchaseId, userId, iapId, amount };
}

function deviceLanguage(): string {
  if (typeof navigator === "undefined") return "";
  const tag = (navigator.language || navigator.languages?.[0] || "").trim();
  return tag.slice(0, 64);
}

let loginJob: Promise<H5LoginResult | null> | null = null;

/**
 * Same phone, same user: pass the persisted userId.
 * Only omit userId when this device has never had an account.
 */
export function loginH5User(userId: string | null): Promise<H5LoginResult | null> {
  if (loginJob) return loginJob;
  loginJob = (async () => {
    const body = {
      ...(userId ? { userId } : {}),
      ...h5AppClient(),
      deviceLang: deviceLanguage(),
    };
    return parseLogin(await postJson("/api/v2/login", body, LOGIN_TIMEOUT_MS));
  })().finally(() => {
    loginJob = null;
  });
  return loginJob;
}

export type H5CoinChangeInput = {
  userid: string;
  remaincoin: number;
};

let pendingCoin: H5CoinChangeInput | null = null;
let coinFlight: Promise<void> | null = null;

function normalizeRemain(remaincoin: number) {
  const remain = Math.floor(Number(remaincoin));
  return Number.isFinite(remain) ? remain : null;
}

async function postCoinChange(input: H5CoinChangeInput): Promise<boolean> {
  const remaincoin = normalizeRemain(input.remaincoin);
  if (!input.userid || remaincoin == null) return false;
  const raw = await postJson(
    "/api/v2/coinchange",
    { userid: input.userid, remaincoin, ...h5AppClient() },
    COIN_TIMEOUT_MS,
  );
  return Boolean(raw && raw.code === 0);
}

async function drainCoinChanges() {
  while (pendingCoin) {
    const snap = pendingCoin;
    pendingCoin = null;
    const ok = await postCoinChange(snap);
    if (ok || pendingCoin) continue;
    const login = await loginH5User(snap.userid);
    if (pendingCoin) continue;
    await postCoinChange({ userid: login?.userId || snap.userid, remaincoin: snap.remaincoin });
  }
}

function kickCoinDrain() {
  if (coinFlight) return;
  coinFlight = drainCoinChanges().finally(() => {
    coinFlight = null;
    if (pendingCoin) kickCoinDrain();
  });
}

export type H5RateStatusInput = {
  userid: string;
  /** 1 = the user has rated the app. Written onto that user's row. */
  ratestatus: 1;
};

async function postRateStatus(input: H5RateStatusInput): Promise<boolean> {
  if (!input.userid) return false;
  const raw = await postJson(
    "/api/v2/ratestatus",
    { userid: input.userid, ratestatus: 1, ...h5AppClient() },
    RATE_TIMEOUT_MS,
  );
  return Boolean(raw && raw.code === 0);
}

/** Mark this user as rated. Failure must not undo the local reward. */
export function reportH5RateStatus(input: H5RateStatusInput): void {
  const userid = input.userid.trim();
  if (!userid) return;
  void (async () => {
    if (await postRateStatus({ userid, ratestatus: 1 })) return;
    const login = await loginH5User(userid);
    await postRateStatus({ userid: login?.userId || userid, ratestatus: 1 });
  })();
}

export type H5UserBehaviorInput = {
  userid: string;
  LoginDays: number;
  viewHostProfileCount: number;
  PaidCalledHostCount: number;
  PaidCalledTotalTime: number;
  FreeCalledHostCount: number;
  FreeCalledTotalTime: number;
  LiveHubLiveRoomJoinCount: number;
  LiveHubLiveWatchTotalTime: number;
};

let pendingBehavior: H5UserBehaviorInput | null = null;
let behaviorFlight: Promise<void> | null = null;

function wholeCount(value: number) {
  const count = Math.floor(Number(value));
  return Number.isFinite(count) && count >= 0 ? count : null;
}

function normalizeBehaviorReport(input: H5UserBehaviorInput): H5UserBehaviorInput | null {
  const userid = input.userid.trim();
  const LoginDays = wholeCount(input.LoginDays);
  const viewHostProfileCount = wholeCount(input.viewHostProfileCount);
  const PaidCalledHostCount = wholeCount(input.PaidCalledHostCount);
  const PaidCalledTotalTime = wholeCount(input.PaidCalledTotalTime);
  const FreeCalledHostCount = wholeCount(input.FreeCalledHostCount);
  const FreeCalledTotalTime = wholeCount(input.FreeCalledTotalTime);
  const LiveHubLiveRoomJoinCount = wholeCount(input.LiveHubLiveRoomJoinCount);
  const LiveHubLiveWatchTotalTime = wholeCount(input.LiveHubLiveWatchTotalTime);
  if (
    !userid ||
    LoginDays == null ||
    viewHostProfileCount == null ||
    PaidCalledHostCount == null ||
    PaidCalledTotalTime == null ||
    FreeCalledHostCount == null ||
    FreeCalledTotalTime == null ||
    LiveHubLiveRoomJoinCount == null ||
    LiveHubLiveWatchTotalTime == null
  ) {
    return null;
  }
  return {
    userid,
    LoginDays,
    viewHostProfileCount,
    PaidCalledHostCount,
    PaidCalledTotalTime,
    FreeCalledHostCount,
    FreeCalledTotalTime,
    LiveHubLiveRoomJoinCount,
    LiveHubLiveWatchTotalTime,
  };
}

async function postUserBehavior(input: H5UserBehaviorInput): Promise<boolean> {
  const raw = await postJson(
    "/api/v2/userBehavior",
    { ...input, ...h5AppClient() },
    BEHAVIOR_TIMEOUT_MS,
  );
  return Boolean(raw && raw.code === 0);
}

async function drainUserBehavior() {
  while (pendingBehavior) {
    const snap = pendingBehavior;
    pendingBehavior = null;
    const ok = await postUserBehavior(snap);
    if (ok || pendingBehavior) continue;
    const login = await loginH5User(snap.userid);
    if (pendingBehavior) continue;
    await postUserBehavior({ ...snap, userid: login?.userId || snap.userid });
  }
}

function kickBehaviorDrain() {
  if (behaviorFlight) return;
  behaviorFlight = drainUserBehavior().finally(() => {
    behaviorFlight = null;
    if (pendingBehavior) kickBehaviorDrain();
  });
}

/** Latest totals win if several actions happen before the request returns. */
export function reportH5UserBehavior(input: H5UserBehaviorInput): void {
  const next = normalizeBehaviorReport(input);
  if (!next) return;
  pendingBehavior = next;
  kickBehaviorDrain();
}

/** Latest remaining balance wins if several changes happen before the request returns. */
export function reportH5CoinChange(input: H5CoinChangeInput): void {
  const remaincoin = normalizeRemain(input.remaincoin);
  if (!input.userid || remaincoin == null) return;
  pendingCoin = { userid: input.userid, remaincoin };
  kickCoinDrain();
}

function parseDpKey(raw: Envelope | null, accessToken: string): Promise<string | null> {
  if (!raw || raw.code !== 0) return Promise.resolve(null);
  const data = asRecord(raw.data);
  if (!data) return Promise.resolve(null);
  const iv = asString(data.iv);
  const ciphertext = asString(data.ciphertext);
  if (!iv || !ciphertext) return Promise.resolve(null);
  return unwrapDpKey(accessToken, iv, ciphertext).catch(() => null);
}

/** Decrypt the server-wrapped API key with this user's accessToken. */
export async function fetchH5DpKey(userId: string, accessToken: string): Promise<string | null> {
  const userid = userId.trim();
  const token = accessToken.trim();
  if (!userid || !token) return null;
  const first = await parseDpKey(
    await postJson("/api/v2/dpkey", { userId: userid, ...h5AppClient() }, DPKEY_TIMEOUT_MS, token),
    token,
  );
  if (first) return first;

  const login = await loginH5User(userid);
  const nextId = login?.userId || userid;
  const nextToken = login?.accessToken || token;
  if (!nextToken) return null;
  return parseDpKey(
    await postJson("/api/v2/dpkey", { userId: nextId, ...h5AppClient() }, DPKEY_TIMEOUT_MS, nextToken),
    nextToken,
  );
}

export async function reportH5Purchase(input: {
  userId: string;
  iapId: string;
  amount: string;
  /** Which H5 button started this purchase. Same StoreKit id can be coins or livehub ($8.99), coins or reward3 ($19.99), coins or vip ($25.99). */
  type: IapType;
}): Promise<H5PurchaseResult | null> {
  if (!input.userId || !input.iapId || !input.type) return null;
  const first = parsePurchase(
    await postJson(
      "/api/v2/purchase",
      { userId: input.userId, iapId: input.iapId, amount: input.amount, type: input.type, ...h5AppClient() },
      PURCHASE_TIMEOUT_MS,
    ),
  );
  if (first) return first;

  const login = await loginH5User(input.userId);
  const userId = login?.userId || input.userId;
  return parsePurchase(
    await postJson(
      "/api/v2/purchase",
      { userId, iapId: input.iapId, amount: input.amount, type: input.type, ...h5AppClient() },
      PURCHASE_TIMEOUT_MS,
    ),
  );
}
