import type { IapSlot } from "./iap";
import { publicUrl } from "../lib/publicUrl";

export type CoinPack = {
  id: string;
  /** Purchase tier. The StoreKit id is chosen from the app id at buy time. */
  slot: IapSlot;
  coins: number;
  price: string;
  col: 1 | 2;
  bonus?: number;
  glow?: boolean;
  glowLit?: boolean;
  shine?: boolean;
  lg?: boolean;
  badge?: string;
  badgeTone?: "wine" | "mid";
  best?: boolean;
  /** Keep the pack in data, but do not show it in the coin shop. */
  hidden?: boolean;
};

export const NEWBIE_COINS = 150;

export const coinPacks: CoinPack[] = [
  { id: "p1", slot: "usd2_99", col: 1, coins: 150, price: "$2.99", hidden: true },
  { id: "p2", slot: "usd4_99", col: 1, coins: 400, price: "$4.99", bonus: 50 },
  { id: "p4", slot: "usd8_99", col: 2, coins: 600, price: "$8.99", bonus: 100 },
  { id: "p5", slot: "usd19_99", col: 1, coins: 1250, price: "$19.99", bonus: 300, glow: true, glowLit: true, lg: true, badge: "56% User Take" },
  { id: "p8", slot: "usd49_99", col: 2, coins: 3050, price: "$49.99", bonus: 1800, glow: true, lg: true, shine: true, badge: "22% User Take", badgeTone: "mid" },
  { id: "p7", slot: "usd25_99", col: 1, coins: 1750, price: "$25.99", bonus: 800 },
  { id: "p10", slot: "usd99_99", col: 2, coins: 6200, price: "$99.99", bonus: 3000, best: true, lg: true },
];

export type Gift = {
  id: string;
  name: string;
  cost: number;
  icon: string;
  gold?: boolean;
};

export const gifts: Gift[] = [
  { id: "cake", name: "Celebration\nCake", cost: 30, icon: publicUrl("/icons/gift-cake.svg") },
  { id: "trophy", name: "Trophy", cost: 50, icon: publicUrl("/icons/gift-trophy.svg") },
  { id: "toast", name: "Champagne\nToast", cost: 100, icon: publicUrl("/icons/gift-toast.svg") },
  { id: "carpet", name: "Red Carpet", cost: 500, icon: publicUrl("/icons/gift-carpet.svg") },
  { id: "ticket", name: "Concert Ticket", cost: 800, icon: publicUrl("/icons/gift-ticket.svg") },
  { id: "car", name: "Supercar", cost: 1000, icon: publicUrl("/icons/gift-car.svg"), gold: true },
];
