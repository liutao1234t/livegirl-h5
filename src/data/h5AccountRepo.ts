/**
 * H5 account API. UI must not call this; go through appStore.
 * Login without userId creates a server user. Always reuse the local userId
 * on the same phone so Get Started does not register again.
 */

const DEFAULT_H5_API_BASE = "https://huinongyunchuang.cn";
const LOGIN_TIMEOUT_MS = 8000;
const PURCHASE_TIMEOUT_MS = 8000;

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
    const body = userId ? { userId } : {};
    return parseLogin(await postJson("/api/v2/login", body, LOGIN_TIMEOUT_MS));
  })().finally(() => {
    loginJob = null;
  });
  return loginJob;
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
      { userId: input.userId, iapId: input.iapId, amount: input.amount },
      PURCHASE_TIMEOUT_MS,
    ),
  );
  if (first) return first;

  const login = await loginH5User(input.userId);
  const userId = login?.userId || input.userId;
  return parsePurchase(
    await postJson(
      "/api/v2/purchase",
      { userId, iapId: input.iapId, amount: input.amount },
      PURCHASE_TIMEOUT_MS,
    ),
  );
}
