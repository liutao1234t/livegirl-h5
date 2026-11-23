/**
 * One row per native app that opens this H5.
 * A new app adds a row: StoreKit ids by price slot, and the JS bridge names
 * from that app's Swift. Purchase buttons and rewards stay the same.
 *
 * 6758287054 loads /preview/ with no query, so a missing aid uses that row.
 * Other apps load /preview/?aid=&ptpye=&pv=
 * A slot omitted from `products` cannot be bought in that app.
 */

export const DEFAULT_APP_ID = "6758287054";
export const APP_ID_PLAYER = "6752740659";

export type AppBridge = {
  /** WKScriptMessageHandler name. */
  handler: string;
  /** Field on the body posted to that handler. Value is the StoreKit product id. */
  productField: string;
  success: readonly string[];
  fail: readonly string[];
  result?: string;
};

export type AppProfile = {
  products: Partial<Record<string, string>>;
  bridge: AppBridge;
};

export const APP_PROFILES: Record<string, AppProfile> = {
  [DEFAULT_APP_ID]: {
    products: {
      usd1_99: "com.user1.99.normal",
      usd2_99: "com.user2.99.normal",
      usd4_99: "com.user4.99.normal",
      usd8_99: "com.user8.99.normal",
      usd19_99: "com.user19.99.normal",
      usd25_99: "com.user25.99.normal",
      usd49_99: "com.user49.99.normal",
      usd99_99: "com.user99.99.best",
    },
    bridge: {
      handler: "iap",
      productField: "productId",
      success: ["onIAPSuccess", "iapSuccess"],
      fail: ["onIAPFail", "iapFail"],
      result: "onIAPResult",
    },
  },
  [APP_ID_PLAYER]: {
    products: {
      usd1_99: "0q9wkea0gs",
      usd4_99: "gxefeupki9",
      usd8_99: "x1p3g33ypy",
      usd19_99: "3fh91gi6m8",
      usd25_99: "wwidswmrmo",
      usd49_99: "88z6jhk22f",
      usd99_99: "q4rw5m189o",
    },
    bridge: {
      handler: "playertime",
      productField: "playid",
      success: ["playsuccess"],
      fail: ["playfail"],
      result: "playresult",
    },
  },
};

export function appProfile(appid: string): AppProfile | null {
  return APP_PROFILES[appid] ?? null;
}
