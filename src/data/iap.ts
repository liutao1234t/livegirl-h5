/**
 * StoreKit product ids depend on which app opened the H5 (`?appid=`).
 * Prices, coin grants, and which button shares an id stay the same.
 *
 * 6758287054 — com.user*.normal / com.user99.99.best
 * 6752740659 — com.normaloff.* / com.bestoff.9999
 *
 * usd19_99 is coins or the 3-day pass. usd25_99 is coins or VIP.
 * An unknown app id uses the 6758287054 catalog.
 */
import { h5AppClient } from "./appClient";

export const IAP_APP_BLOOMIE = "6758287054";
export const IAP_APP_OFF = "6752740659";

/** One purchase tier. The same tier maps to a different StoreKit id per app. */
export const IAP_SLOTS = [
  "usd1_99",
  "usd2_99",
  "usd4_99",
  "usd8_99",
  "usd19_99",
  "usd25_99",
  "usd49_99",
  "usd99_99",
] as const;

export type IapSlot = (typeof IAP_SLOTS)[number];

const SLOT_PRICE: Record<IapSlot, string> = {
  usd1_99: "1.99",
  usd2_99: "2.99",
  usd4_99: "4.99",
  usd8_99: "8.99",
  usd19_99: "19.99",
  usd25_99: "25.99",
  usd49_99: "49.99",
  usd99_99: "99.99",
};

const CATALOGS: Record<string, Record<IapSlot, string>> = {
  [IAP_APP_BLOOMIE]: {
    usd1_99: "com.user1.99.normal",
    usd2_99: "com.user2.99.normal",
    usd4_99: "com.user4.99.normal",
    usd8_99: "com.user8.99.normal",
    usd19_99: "com.user19.99.normal",
    usd25_99: "com.user25.99.normal",
    usd49_99: "com.user49.99.normal",
    usd99_99: "com.user99.99.best",
  },
  [IAP_APP_OFF]: {
    usd1_99: "com.normaloff.199",
    usd2_99: "com.normaloff.299",
    usd4_99: "com.normaloff.499",
    usd8_99: "com.normaloff.899",
    usd19_99: "com.normaloff.1999",
    usd25_99: "com.normaloff.2599",
    usd49_99: "com.normaloff.4999",
    usd99_99: "com.bestoff.9999",
  },
};

const KNOWN_PRODUCT_IDS = new Set(Object.values(CATALOGS).flatMap((table) => Object.values(table)));

export type IapProductId = string;

/**
 * Which H5 button started the purchase.
 * Swift StoreKit only sees productId; H5 uses this to grant the right reward.
 *
 * newbie   — 新用户特惠 pop ($1.99)
 * coins    — 金币页普通档
 * reward3  — 3 天无限通话 ($19.99，与金币档同 id)
 * vip      — VIP ($25.99，与金币档同 id)
 */
export type IapType = "newbie" | "coins" | "reward3" | "vip";

export const IAP_TYPES: readonly IapType[] = ["newbie", "coins", "reward3", "vip"];

export type IapRequest = {
  productId: IapProductId;
  price: string;
  type: IapType;
};

export function iapProductId(slot: IapSlot, appid = h5AppClient().appid): string {
  const table = CATALOGS[appid] ?? CATALOGS[IAP_APP_BLOOMIE];
  return table[slot];
}

function requestFor(slot: IapSlot, type: IapType): IapRequest {
  return { productId: iapProductId(slot), price: SLOT_PRICE[slot], type };
}

export function newbieIap(): IapRequest {
  return requestFor("usd1_99", "newbie");
}

export function reward3Iap(): IapRequest {
  return requestFor("usd19_99", "reward3");
}

export function vipIap(): IapRequest {
  return requestFor("usd25_99", "vip");
}

export function coinsIap(slot: IapSlot): IapRequest {
  return requestFor(slot, "coins");
}

export function isIapType(value: unknown): value is IapType {
  return typeof value === "string" && (IAP_TYPES as readonly string[]).includes(value);
}

export function isIapProductId(value: unknown): value is IapProductId {
  return typeof value === "string" && KNOWN_PRODUCT_IDS.has(value);
}
