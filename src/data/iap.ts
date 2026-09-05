/** StoreKit product ids. Coin_test_4 / Coin_test_5 are reused by two H5 buttons. */
export const IAP_PRODUCTS = {
  Coin_test_1: { productId: "Coin_test_1", price: "1.99" },
  Coin_test_2: { productId: "Coin_test_2", price: "2.99" },
  Coin_test_3: { productId: "Coin_test_3", price: "9.99" },
  Coin_test_4: { productId: "Coin_test_4", price: "19.99" },
  Coin_test_5: { productId: "Coin_test_5", price: "29.99" },
  Coin_test_6: { productId: "Coin_test_6", price: "49.99" },
  Coin_test_7: { productId: "Coin_test_7", price: "99.99" },
} as const;

export type IapProductId = keyof typeof IAP_PRODUCTS;

/**
 * Which H5 button started the purchase.
 * Swift StoreKit only sees productId; H5 uses this to grant the right reward.
 *
 * newbie   — 新用户特惠 pop ($1.99 / Coin_test_1)
 * coins    — 金币页普通档
 * reward3  — 3 天无限通话 ($19.99 / Coin_test_4，与金币档同 id)
 * vip      — VIP ($29.99 / Coin_test_5，与金币档同 id)
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

export const IAP_NEWBIE = req("Coin_test_1", "newbie");
export const IAP_REWARD3 = req("Coin_test_4", "reward3");
export const IAP_VIP = req("Coin_test_5", "vip");

export function coinsIap(productId: IapProductId): IapRequest {
  return req(productId, "coins");
}

export function isIapType(value: unknown): value is IapType {
  return typeof value === "string" && (IAP_TYPES as readonly string[]).includes(value);
}

export function isIapProductId(value: unknown): value is IapProductId {
  return typeof value === "string" && value in IAP_PRODUCTS;
}
