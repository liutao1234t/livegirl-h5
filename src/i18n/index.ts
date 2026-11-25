import { loadHostCopy } from "./hostCopy";
import { en, type MessageKey } from "./en";
import { locale, type Locale } from "./locale";

export { hostCopy, hostPlace } from "./hostCopy";
export { applyDocumentLocale, locale, LOCALE_NAMES, LOCALES, useActiveLocale, useLocaleStore } from "./locale";
export type { Locale, MessageKey };

const catalogs: Partial<Record<Locale, Record<MessageKey, string>>> = { en };
const loaders = {
  es: () => import("./es").then((m) => m.es), it: () => import("./it").then((m) => m.it),
  de: () => import("./de").then((m) => m.de), tr: () => import("./tr").then((m) => m.tr),
  ar: () => import("./ar").then((m) => m.ar), ja: () => import("./ja").then((m) => m.ja),
};
const pending = new Map<Locale, Promise<void>>();
export function prepareLocale(lang: Locale = locale()): Promise<void> {
  if (lang === "en") return Promise.resolve();
  const existing = pending.get(lang);
  if (existing) return existing;
  const job = Promise.all([loaders[lang](), loadHostCopy(lang)]).then(([catalog]) => {
    catalogs[lang] = catalog;
  }).catch(() => {
    // English remains available offline; allow a later attempt to retry.
    pending.delete(lang);
  });
  pending.set(lang, job);
  return job;
}

const PRICE_OR_NUMBER = /\$\d[\d,]*(?:\.\d+)?|\d[\d,]*(?:\.\d+)?/g;

export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  const lang = locale();
  let text = catalogs[lang]?.[key] ?? en[key];
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  if (lang === "ar") {
    text = text.replace(PRICE_OR_NUMBER, (match) => `\u2066${match}\u2069`);
  }
  return text;
}

/** Western digits and en-US grouping: 1,250. */
export function formatCount(value: number): string {
  return Math.trunc(value).toLocaleString("en-US");
}

const WEEKDAYS = ["wd.0", "wd.1", "wd.2", "wd.3", "wd.4", "wd.5", "wd.6"] as const;
const MONTHS = ["mo.0", "mo.1", "mo.2", "mo.3", "mo.4", "mo.5", "mo.6", "mo.7", "mo.8", "mo.9", "mo.10", "mo.11"] as const;

export function formatInboxTime(at: number): string {
  const diff = Math.max(0, Date.now() - at);
  if (diff < 45_000) return t("common.justNow");
  if (diff < 3_600_000) return t("common.minAgo", { n: Math.max(1, Math.round(diff / 60_000)) });
  if (diff < 86_400_000) return t("common.hourAgo", { n: Math.max(1, Math.round(diff / 3_600_000)) });
  const days = Math.round(diff / 86_400_000);
  if (days === 1) return t("common.yesterday");
  const date = new Date(at);
  if (days < 7) return t(WEEKDAYS[date.getDay()]);
  return `${t(MONTHS[date.getMonth()])} ${date.getDate()}`;
}

/** Same shape as en-US "Nov 18, 02:31 PM". Month name follows the UI language. */
export function formatStamp(at = new Date()): string {
  if (locale() === "en") {
    return at.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }
  const minute = String(at.getMinutes()).padStart(2, "0");
  const hour24 = at.getHours();
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  const hour = String(hour12).padStart(2, "0");
  return `${t(MONTHS[at.getMonth()])} ${at.getDate()}, ${hour}:${minute} ${suffix}`;
}

export function formatLastActive(raw: string): string {
  if (raw === "Online") return t("common.online");
  if (raw === "Active recently") return t("status.activeRecent");
  const minutes = raw.match(/^Active (\d+) minutes ago$/);
  if (minutes) return t("status.activeMin", { n: minutes[1] });
  return raw;
}

const GIFT_BILL: Record<string, MessageKey> = {
  "Celebration Cake": "gift.cake",
  Trophy: "gift.trophy",
  "Champagne Toast": "gift.toast",
  "Red Carpet": "gift.carpet",
  "Concert Ticket": "gift.ticket",
  Supercar: "gift.car",
};

const BILL_EXACT: Record<string, MessageKey> = {
  "Starter Coins": "bill.starter",
  "VIP Bonus": "bill.vipBonus",
  "Newbie Offer": "bill.newbie",
  "Day 7 Bonus": "bill.day7",
  "Rate Us": "bill.rate",
  "Coins Added": "bill.coinsAdded",
};

export function billTitle(raw: string): string {
  const exact = BILL_EXACT[raw];
  if (exact) return t(exact);
  const day = raw.match(/^Check-in Day (\d+)$/);
  if (day) return t("bill.checkIn", { n: day[1] });
  const chat = raw.match(/^Chat · (.+)$/);
  if (chat) return t("bill.chat", { name: chat[1] });
  const video = raw.match(/^Video With (.+)$/);
  if (video) return t("bill.video", { name: video[1] });
  const gift = raw.match(/^Gift · (.+)$/);
  if (gift) {
    const key = GIFT_BILL[gift[1]];
    const name = key ? t(key).replace(/\n/g, " ") : gift[1];
    return t("bill.gift", { name });
  }
  return raw;
}

const GIFT_KEYS = {
  cake: "gift.cake",
  trophy: "gift.trophy",
  toast: "gift.toast",
  carpet: "gift.carpet",
  ticket: "gift.ticket",
  car: "gift.car",
} as const;

export function giftLabel(id: string): string {
  const key = GIFT_KEYS[id as keyof typeof GIFT_KEYS];
  return key ? t(key) : id;
}
