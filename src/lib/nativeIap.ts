import { h5AppClient } from "../data/appClient";
import { appProfile, APP_PROFILES } from "../data/appProfile";
import { type IapRequest } from "../data/iap";
import { t } from "../i18n";
import { postToNative } from "./nativeBridge";

export const IAP_SIM_MS = 3000;

export type IapOutcome = {
  ok: boolean;
  reason?: string;
};

type PendingIap = {
  request: IapRequest;
  resolve: (outcome: IapOutcome) => void;
};

let pending: PendingIap | null = null;
let simulateTimer: number | undefined;

/**
 * WKWebView contract
 *
 * H5 → Swift (`webkit.messageHandlers.<handler>.postMessage`):
 *   { <productField>: "<storekit id for this app and tier>" }
 * Handler name and field come from the app profile (iap/productId, or playertime/playid).
 *
 * Readable field (updated when a purchase starts):
 *   window.iapProductId
 *
 * Swift → H5 (`evaluateJavaScript`), names from that app's profile:
 *   window.onIAPSuccess() / window.playsuccess({ success, playid })
 *   window.onIAPFail({ reason }) / window.playfail({ success, playid, reason })
 *   window.onIAPResult({ success }) / window.playresult({ success, playid })
 *
 * Type stays on the H5 pending click. The $8.99 id is coins or Live Hub;
 * the $19.99 id is coins or 3-day; the $25.99 id is coins or VIP.
 */
type IapCallback = (payload?: unknown) => void;

function nativeWindow() {
  return window as unknown as Window & Record<string, IapCallback | string | undefined> & {
    iapProductId?: string;
  };
}

function publishFields(request: IapRequest | null) {
  nativeWindow().iapProductId = request?.productId;
}

function asRecord(raw: unknown): Record<string, unknown> | undefined {
  if (raw == null || raw === "") return undefined;
  let value: unknown = raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    if (!trimmed.startsWith("{")) return undefined;
    try {
      value = JSON.parse(trimmed) as unknown;
    } catch {
      return undefined;
    }
  }
  if (typeof value !== "object" || value == null) return undefined;
  return value as Record<string, unknown>;
}

function parseSuccessFlag(raw: unknown): boolean | undefined {
  if (raw == null || raw === "") return undefined;
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    if (trimmed === "true" || trimmed === "success" || trimmed === "1") return true;
    if (trimmed === "false" || trimmed === "fail" || trimmed === "failure" || trimmed === "0") {
      return false;
    }
  }
  const obj = asRecord(raw);
  if (!obj) return undefined;
  if (typeof obj.success === "boolean") return obj.success;
  if (typeof obj.ok === "boolean") return obj.ok;
  return undefined;
}

function parseReason(raw: unknown): string | undefined {
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith("{")) return parseReason(asRecord(trimmed));
    if (trimmed === "true" || trimmed === "false" || trimmed === "success" || trimmed === "fail") {
      return undefined;
    }
    return trimmed;
  }
  const obj = asRecord(raw);
  if (!obj) return undefined;
  if (typeof obj.reason === "string" && obj.reason.trim()) return obj.reason.trim();
  if (typeof obj.message === "string" && obj.message.trim()) return obj.message.trim();
  return undefined;
}

export function iapSuccessToast(): string {
  return t("toast.purchaseOk");
}

export function iapFailToast(reason?: string): string {
  if (reason === "user_cancelled" || reason === "player_cancelled") return t("toast.purchaseCancel");
  if (reason === "pending" || reason === "player_pending") return t("toast.purchasePending");
  if (reason) return t("toast.purchaseFailReason", { reason });
  return t("toast.purchaseFail");
}

function settle(ok: boolean, reason?: string) {
  if (simulateTimer != null) {
    window.clearTimeout(simulateTimer);
    simulateTimer = undefined;
  }
  const current = pending;
  pending = null;
  if (!current) return;
  current.resolve({ ok, reason });
}

export function installNativeIapBridge() {
  if (typeof window === "undefined") return;
  const w = nativeWindow();
  for (const profile of Object.values(APP_PROFILES)) {
    for (const name of profile.bridge.success) w[name] = () => settle(true);
    for (const name of profile.bridge.fail) {
      w[name] = (raw?: unknown) => settle(false, parseReason(raw));
    }
    const result = profile.bridge.result;
    if (result) {
      w[result] = (raw?: unknown) => {
        const flag = parseSuccessFlag(raw);
        settle(flag !== false, parseReason(raw));
      };
    }
  }
}

export function cancelPendingIap() {
  if (!pending) return;
  settle(false, "cancelled");
}

export function getPendingIap(): IapRequest | null {
  return pending?.request ?? null;
}

/** Notify Swift (or simulate in the browser). Resolves ok on success. */
export function requestIap(request: IapRequest): Promise<IapOutcome> {
  if (typeof window === "undefined") return Promise.resolve({ ok: false, reason: "no_window" });
  if (pending) return Promise.resolve({ ok: false, reason: "busy" });

  const profile = appProfile(h5AppClient().appid);
  if (!request.productId || !profile) {
    return Promise.resolve({ ok: false, reason: "product_not_found" });
  }

  publishFields(request);

  return new Promise((resolve) => {
    pending = { request, resolve };
    const posted = postToNative(profile.bridge.handler, {
      [profile.bridge.productField]: request.productId,
    });
    if (posted) return;
    if (import.meta.env.DEV) {
      simulateTimer = window.setTimeout(() => settle(true, "simulated"), IAP_SIM_MS);
      return;
    }
    settle(false, "no_handler");
  });
}
