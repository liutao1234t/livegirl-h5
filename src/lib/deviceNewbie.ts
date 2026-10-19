/**
 * New-user perks are tied to this device, not the current account.
 * Delete wipes chats, coins, and purchases. Perks already used stay used.
 * Perks never used stay available for the next account.
 */

export type DeviceNewbie = {
  starterLeft: number;
  seenWelcome: boolean;
  boughtNewbieOffer: boolean;
  lastFreeCallDate: string | null;
  ratedUs: boolean;
  lastCheckInDate: string | null;
  checkInCount: number;
};

type BillLike = {
  title?: unknown;
  amount?: unknown;
  kind?: unknown;
};

type AccountSnapshot = {
  userId?: unknown;
  coins?: unknown;
  bills?: unknown;
  seenWelcome?: unknown;
  boughtNewbieOffer?: unknown;
  lastFreeCallDate?: unknown;
  ratedUs?: unknown;
  lastCheckInDate?: unknown;
  checkInCount?: unknown;
};

export function freshDeviceNewbie(starterCap: number): DeviceNewbie {
  return {
    starterLeft: starterCap,
    seenWelcome: false,
    boughtNewbieOffer: false,
    lastFreeCallDate: null,
    ratedUs: false,
    lastCheckInDate: null,
    checkInCount: 0,
  };
}

export function consumeStarter(newbie: DeviceNewbie, spent: number): DeviceNewbie {
  if (spent <= 0 || newbie.starterLeft <= 0) return newbie;
  const starterLeft = Math.max(0, newbie.starterLeft - spent);
  if (starterLeft === newbie.starterLeft) return newbie;
  return { ...newbie, starterLeft };
}

function laterDay(a: string | null, b: string | null) {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

function clampStarter(value: number, starterCap: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(starterCap, Math.floor(value)));
}

/** Remaining starter coins still sitting in this account, from the original grant. */
export function inferDeviceNewbie(raw: AccountSnapshot, starterCap: number): DeviceNewbie {
  if (typeof raw.userId !== "string" || !raw.userId) return freshDeviceNewbie(starterCap);

  const coins = typeof raw.coins === "number" && Number.isFinite(raw.coins) ? Math.max(0, raw.coins) : 0;
  const bills = Array.isArray(raw.bills) ? (raw.bills as BillLike[]) : [];
  let pool = 0;
  let sawStarter = false;
  for (const bill of [...bills].reverse()) {
    const kind = bill.kind === "in" || bill.kind === "out" ? bill.kind : null;
    const amount = typeof bill.amount === "number" && Number.isFinite(bill.amount) ? Math.abs(bill.amount) : 0;
    if (!kind || amount <= 0) continue;
    if (kind === "in" && bill.title === "Starter Coins") {
      sawStarter = true;
      pool = Math.min(starterCap, pool + amount);
    } else if (kind === "out") {
      pool = Math.max(0, pool - amount);
    }
  }

  const spentSomething = bills.some((bill) => bill.kind === "out");
  const fromHistory = sawStarter ? pool : spentSomething ? 0 : Math.min(starterCap, coins);
  const starterLeft = clampStarter(Math.min(fromHistory, coins), starterCap);

  return {
    starterLeft,
    seenWelcome: raw.seenWelcome === true,
    boughtNewbieOffer: raw.boughtNewbieOffer === true,
    lastFreeCallDate: typeof raw.lastFreeCallDate === "string" ? raw.lastFreeCallDate : null,
    ratedUs: raw.ratedUs === true,
    lastCheckInDate: typeof raw.lastCheckInDate === "string" ? raw.lastCheckInDate : null,
    checkInCount:
      typeof raw.checkInCount === "number" && raw.checkInCount > 0 ? Math.floor(raw.checkInCount) : 0,
  };
}

export function normalizeDeviceNewbie(value: unknown, starterCap: number): DeviceNewbie | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.starterLeft !== "number" || !Number.isFinite(raw.starterLeft)) return null;
  return {
    starterLeft: clampStarter(raw.starterLeft, starterCap),
    seenWelcome: raw.seenWelcome === true,
    boughtNewbieOffer: raw.boughtNewbieOffer === true,
    lastFreeCallDate: typeof raw.lastFreeCallDate === "string" ? raw.lastFreeCallDate : null,
    ratedUs: raw.ratedUs === true,
    lastCheckInDate: typeof raw.lastCheckInDate === "string" ? raw.lastCheckInDate : null,
    checkInCount:
      typeof raw.checkInCount === "number" && raw.checkInCount > 0 ? Math.floor(raw.checkInCount) : 0,
  };
}

export function sealDeviceNewbie(
  account: {
    seenWelcome: boolean;
    boughtNewbieOffer: boolean;
    lastFreeCallDate: string | null;
    ratedUs: boolean;
    lastCheckInDate: string | null;
    checkInCount: number;
  },
  newbie: DeviceNewbie,
): DeviceNewbie {
  return {
    starterLeft: newbie.starterLeft,
    seenWelcome: account.seenWelcome || newbie.seenWelcome,
    boughtNewbieOffer: account.boughtNewbieOffer || newbie.boughtNewbieOffer,
    lastFreeCallDate: laterDay(account.lastFreeCallDate, newbie.lastFreeCallDate),
    ratedUs: account.ratedUs || newbie.ratedUs,
    lastCheckInDate: laterDay(account.lastCheckInDate, newbie.lastCheckInDate),
    checkInCount: Math.max(account.checkInCount || 0, newbie.checkInCount || 0),
  };
}
