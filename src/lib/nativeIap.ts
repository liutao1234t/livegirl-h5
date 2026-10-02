import { type IapRequest } from "../data/iap";
import { logAppEvent } from "./firebase";
import { postToNative } from "./nativeBridge";

/** WKScriptMessageHandler name. Swift: `userContentController.add(self, name: "iap")`. */
export const IAP_HANDLER = "iap";

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
 * H5 → Swift (`webkit.messageHandlers.iap.postMessage`):
 *   { productId: "com.user19.99.normal" }
 *
 * Readable field (updated when a purchase starts):
 *   window.iapProductId
 *
 * Swift → H5 (`evaluateJavaScript`), any one of:
 *   window.onIAPSuccess()
 *   window.onIAPFail({ reason: "product_not_found" })
 *   window.onIAPResult({ success: true })
 *
 * Type stays on the H5 pending click. com.user19.99.normal is coins or 3-day;
 * com.user25.99.normal is coins or VIP.
 */
function nativeWindow() {
  return window as Window & {
    iapProductId?: string;
    onIAPSuccess?: (payload?: unknown) => void;
    onIAPFail?: (payload?: unknown) => void;
    onIAPResult?: (payload?: unknown) => void;
    iapSuccess?: (payload?: unknown) => void;
    iapFail?: (payload?: unknown) => void;
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
  return "Purchase Success";
}

export function iapFailToast(reason?: string): string {
  if (reason === "user_cancelled") return "Purchase cancelled";
  if (reason === "pending") return "Purchase pending";
  if (reason) return `Purchase failed · ${reason}`;
  return "Purchase failed";
}

function settle(ok: boolean, reason?: string) {
  const simulated = simulateTimer != null;
  if (simulateTimer != null) {
    window.clearTimeout(simulateTimer);
    simulateTimer = undefined;
  }
  const current = pending;
  pending = null;
  if (!current) return;
  logAppEvent("iap_result", {
    productId: current.request.productId,
    price: current.request.price,
    type: current.request.type,
    success: ok,
    reason: reason ?? "",
    simulated,
  });
  current.resolve({ ok, reason });
}

export function installNativeIapBridge() {
  if (typeof window === "undefined") return;
  const w = nativeWindow();
  w.onIAPSuccess = () => settle(true);
  w.onIAPFail = (raw?: unknown) => settle(false, parseReason(raw));
  w.iapSuccess = w.onIAPSuccess;
  w.iapFail = w.onIAPFail;
  w.onIAPResult = (raw?: unknown) => {
    const flag = parseSuccessFlag(raw);
    settle(flag !== false, parseReason(raw));
  };
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

  publishFields(request);
  logAppEvent("iap_start", {
    productId: request.productId,
    price: request.price,
    type: request.type,
  });

  return new Promise((resolve) => {
    pending = { request, resolve };
    const posted = postToNative(IAP_HANDLER, {
      productId: request.productId,
    });
    if (posted) return;
    if (import.meta.env.DEV) {
      simulateTimer = window.setTimeout(() => settle(true, "simulated"), IAP_SIM_MS);
      return;
    }
    settle(false, "no_handler");
  });
}
