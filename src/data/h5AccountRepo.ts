/**
 * H5 account API. UI must not call this; go through appStore.
 * Login without userId creates a server user. Always reuse the local userId
 * on the same phone so Get Started does not register again.
 * After the local coin balance changes, report userid + remaincoin.
 * After the user rates the app, report userid + ratestatus so the user row updates.
 * A failed report must not roll back coins or block the page.
 */

import { h5AppClient } from "./appClient";

const DEFAULT_H5_API_BASE = "https://huinongyunchuang.cn";
const LOGIN_TIMEOUT_MS = 8000;
const PURCHASE_TIMEOUT_MS = 8000;
const COIN_TIMEOUT_MS = 8000;
const RATE_TIMEOUT_MS = 8000;

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

async function postJson(path: string, body: unknown, timeoutMs: number): Promise<Envelope | null> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${apiBase()}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

let loginJob: Promise<H5LoginResult | null> | null = null;

/**
 * Same phone, same user: pass the persisted userId.
 * Only omit userId when this device has never had an account.
 */
export function loginH5User(userId: string | null): Promise<H5LoginResult | null> {
  if (loginJob) return loginJob;
  loginJob = (async () => {
    const body = userId ? { userId, ...h5AppClient() } : { ...h5AppClient() };
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

/** Latest remaining balance wins if several changes happen before the request returns. */
export function reportH5CoinChange(input: H5CoinChangeInput): void {
  const remaincoin = normalizeRemain(input.remaincoin);
  if (!input.userid || remaincoin == null) return;
  pendingCoin = { userid: input.userid, remaincoin };
  kickCoinDrain();
}

export async function reportH5Purchase(input: {
  userId: string;
  iapId: string;
  amount: string;
}): Promise<H5PurchaseResult | null> {
  if (!input.userId || !input.iapId) return null;
  const first = parsePurchase(
    await postJson(
      "/api/v2/purchase",
      { userId: input.userId, iapId: input.iapId, amount: input.amount, ...h5AppClient() },
      PURCHASE_TIMEOUT_MS,
    ),
  );
  if (first) return first;

  const login = await loginH5User(input.userId);
  const userId = login?.userId || input.userId;
  return parsePurchase(
    await postJson(
      "/api/v2/purchase",
      { userId, iapId: input.iapId, amount: input.amount, ...h5AppClient() },
      PURCHASE_TIMEOUT_MS,
    ),
  );
}
