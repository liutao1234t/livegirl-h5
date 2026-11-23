/**
 * StoreKit product ids come from the app profile for `?aid=`.
 * Prices, coin grants, and which button shares an id stay the same.
 * usd8_99 is coins or Live Hub unlock. usd19_99 is coins or the 3-day pass.
 * usd25_99 is coins or VIP. A slot missing from that app cannot be bought.
 */
import { h5AppClient } from "./appClient";
import { APP_PROFILES, appProfile } from "./appProfile";

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

export type IapProductId = string;

/**
 * Which H5 button started the purchase.
 * Swift only sees the product id; H5 uses this to grant the right reward.
 *
 * newbie   — 新用户特惠 pop ($1.99)
 * coins    — 金币页普通档
 * reward3  — 3 天无限通话 ($19.99，与金币档同 id)
 * livehub  — Live Hub 继续观看 ($8.99，与金币档同 id)
 * vip      — VIP ($25.99，与金币档同 id)
 */
export type IapType = "newbie" | "coins" | "reward3" | "vip" | "livehub";

export const IAP_TYPES: readonly IapType[] = ["newbie", "coins", "reward3", "vip", "livehub"];

export type IapRequest = {
  productId: IapProductId;
  price: string;
  type: IapType;
};

export function iapProductId(slot: IapSlot, appid = h5AppClient().appid): string | null {
  const id = appProfile(appid)?.products[slot];
  return id || null;
}

function requestFor(slot: IapSlot, type: IapType): IapRequest {
  return { productId: iapProductId(slot) ?? "", price: SLOT_PRICE[slot], type };
}

export function newbieIap(): IapRequest {
  return requestFor("usd1_99", "newbie");
}

export function reward3Iap(): IapRequest {
  return requestFor("usd19_99", "reward3");
}

export function liveHubIap(): IapRequest {
  return requestFor("usd8_99", "livehub");
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
  if (typeof value !== "string" || !value) return false;
  return Object.values(APP_PROFILES).some((profile) => Object.values(profile.products).includes(value));
}
