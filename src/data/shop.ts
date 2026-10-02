import type { IapProductId } from "./iap";
import { publicUrl } from "../lib/publicUrl";

export type CoinPack = {
  id: string;
  productId: IapProductId;
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
};

export const NEWBIE_COINS = 150;

export const coinPacks: CoinPack[] = [
  { id: "p1", productId: "com.user2.99.normal", col: 1, coins: 150, price: "$2.99" },
  { id: "p4", productId: "com.user8.99.normal", col: 2, coins: 600, price: "$8.99" },
  { id: "p5", productId: "com.user19.99.normal", col: 1, coins: 1250, price: "$19.99", bonus: 100, glow: true, glowLit: true, lg: true, badge: "56% User Take" },
  { id: "p8", productId: "com.user49.99.normal", col: 2, coins: 3050, price: "$49.99", bonus: 300, glow: true, lg: true, shine: true, badge: "22% User Take", badgeTone: "mid" },
  { id: "p7", productId: "com.user25.99.normal", col: 1, coins: 1750, price: "$25.99", bonus: 250 },
  { id: "p10", productId: "com.user99.99.best", col: 2, coins: 6200, price: "$99.99", bonus: 900, best: true, lg: true },
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
