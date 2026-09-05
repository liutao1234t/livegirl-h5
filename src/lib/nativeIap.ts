import { type IapRequest } from "../data/iap";
import { logAppEvent } from "./firebase";
import { postToNative } from "./nativeBridge";

/** WKScriptMessageHandler name. Swift: `userContentController.add(self, name: "iap")`. */
export const IAP_HANDLER = "iap";

export const IAP_SIM_MS = 3000;

type PendingIap = {
  request: IapRequest;
  resolve: (ok: boolean) => void;
};

let pending: PendingIap | null = null;
let simulateTimer: number | undefined;

/**
 * WKWebView contract
 *
 * H5 → Swift (`webkit.messageHandlers.iap.postMessage`):
 *   { productId: "Coin_test_4" }
 *
 * Readable field (updated when a purchase starts):
 *   window.iapProductId
 *
 * Swift → H5 (`evaluateJavaScript`), any one of:
 *   window.onIAPSuccess()
 *   window.onIAPFail()
 *   window.onIAPResult({ success: true })
 *
 * Type stays on the H5 pending click. Coin_test_4 is coins or 3-day;
 * Coin_test_5 is coins or VIP.
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

function parseSuccessFlag(raw: unknown): boolean | undefined {
  if (raw == null || raw === "") return undefined;
  if (typeof raw === "boolean") return raw;
  let value: unknown = raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    if (trimmed === "true" || trimmed === "success" || trimmed === "1") return true;
    if (trimmed === "false" || trimmed === "fail" || trimmed === "failure" || trimmed === "0") return false;
    if (!trimmed.startsWith("{")) return undefined;
    try {
      value = JSON.parse(trimmed) as unknown;
    } catch {
      return undefined;
    }
  }
  if (typeof value !== "object" || value == null) return undefined;
  const obj = value as Record<string, unknown>;
  if (typeof obj.success === "boolean") return obj.success;
  if (typeof obj.ok === "boolean") return obj.ok;
  return undefined;
}

function settle(ok: boolean) {
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
    simulated,
  });
  current.resolve(ok);
}

export function installNativeIapBridge() {
  if (typeof window === "undefined") return;
  const w = nativeWindow();
  w.onIAPSuccess = () => settle(true);
  w.onIAPFail = () => settle(false);
  w.iapSuccess = w.onIAPSuccess;
  w.iapFail = w.onIAPFail;
  w.onIAPResult = (raw?: unknown) => {
    const flag = parseSuccessFlag(raw);
    settle(flag !== false);
  };
}

export function cancelPendingIap() {
  if (!pending) return;
  settle(false);
}

export function getPendingIap(): IapRequest | null {
  return pending?.request ?? null;
}

/** Notify Swift (or simulate in the browser). Resolves true on success. */
export function requestIap(request: IapRequest): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (pending) return Promise.resolve(false);

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
      simulateTimer = window.setTimeout(() => settle(true), IAP_SIM_MS);
      return;
    }
    settle(false);
  });
}
