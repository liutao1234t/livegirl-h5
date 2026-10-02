/** StoreKit product ids. com.user19.99.normal / com.user25.99.normal are reused by two H5 buttons. */
export const IAP_PRODUCTS = {
  "com.user1.99.normal": { productId: "com.user1.99.normal", price: "1.99" },
  "com.user2.99.normal": { productId: "com.user2.99.normal", price: "2.99" },
  "com.user8.99.normal": { productId: "com.user8.99.normal", price: "8.99" },
  "com.user19.99.normal": { productId: "com.user19.99.normal", price: "19.99" },
  "com.user25.99.normal": { productId: "com.user25.99.normal", price: "25.99" },
  "com.user49.99.normal": { productId: "com.user49.99.normal", price: "49.99" },
  "com.user99.99.best": { productId: "com.user99.99.best", price: "99.99" },
} as const;

export type IapProductId = keyof typeof IAP_PRODUCTS;

/**
 * Which H5 button started the purchase.
 * Swift StoreKit only sees productId; H5 uses this to grant the right reward.
 *
 * newbie   — 新用户特惠 pop ($1.99 / com.user1.99.normal)
 * coins    — 金币页普通档
 * reward3  — 3 天无限通话 ($19.99 / com.user19.99.normal，与金币档同 id)
 * vip      — VIP ($25.99 / com.user25.99.normal，与金币档同 id)
 */
export type IapType = "newbie" | "coins" | "reward3" | "vip";

export const IAP_TYPES: readonly IapType[] = ["newbie", "coins", "reward3", "vip"];

export type IapRequest = {
  productId: IapProductId;
  price: string;
  type: IapType;
};

function req(id: IapProductId, type: IapType): IapRequest {
  const product = IAP_PRODUCTS[id];
  return { productId: product.productId, price: product.price, type };
}

export const IAP_NEWBIE = req("com.user1.99.normal", "newbie");
export const IAP_REWARD3 = req("com.user19.99.normal", "reward3");
export const IAP_VIP = req("com.user25.99.normal", "vip");

export function coinsIap(productId: IapProductId): IapRequest {
  return req(productId, "coins");
}

export function isIapType(value: unknown): value is IapType {
  return typeof value === "string" && (IAP_TYPES as readonly string[]).includes(value);
}

export function isIapProductId(value: unknown): value is IapProductId {
  return typeof value === "string" && value in IAP_PRODUCTS;
}
