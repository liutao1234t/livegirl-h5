import { setReelLookup, type Girl, type GirlRegion } from "./girls";
import reelsJson from "./reels.json";

export type ReelRaw = {
  userid: string;
  video_url: string;
  isModel: number;
  shortVideo_desc: string;
  isVip: number;
  nickname: string;
  fireCount: string;
  intro: string;
  activeTime: string;
  nation: string;
  joinDays: string;
  verify_fb: number;
  gender: number;
  online_state: number;
  height: string;
  userRole: number;
  age: string;
  shortVideo_url: string;
  avatar: string;
  price: string;
  photos: string[];
  verify_phone: number;
  verify_twitter: number;
  contry: string;
  INTERESTS: string[];
  videoTags: string[];
};

export type Reel = Girl & {
  caption: string;
  shortVideoUrl: string;
};

const NATION_REGION: Record<string, GirlRegion> = {
  Brazil: "America",
  Turkey: "Middle East",
  Ukraine: "Europe",
  "United States": "America",
};

function cityFromContry(contry: string, nation: string) {
  const [city] = contry.split(",").map((part) => part.trim());
  return city || nation;
}

function regionFromNation(nation: string): GirlRegion {
  return NATION_REGION[nation] ?? "Global";
}

export function formatFireCount(n: number) {
  if (n < 1000) return String(n);
  return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
}

function mapReel(host: ReelRaw): Reel {
  const minutes = Number(host.activeTime) || 0;
  const online = host.online_state === 1;
  return {
    id: host.userid,
    name: host.nickname,
    age: Number(host.age) || 0,
    city: cityFromContry(host.contry, host.nation),
    country: host.nation,
    category: "Hot",
    region: regionFromNation(host.nation),
    online,
    ratePerMin: Number(host.price) || 0,
    photo: host.avatar,
    avatar: host.avatar,
    bio: host.intro,
    interests: host.INTERESTS ?? [],
    moments: host.photos?.length ? host.photos : [host.avatar],
    lastActive: `Active ${minutes} minutes ago`,
    videoUrl: host.video_url || undefined,
    vip: host.isVip === 1,
    fireCount: Number(host.fireCount) || 0,
    height: Number(host.height) || 0,
    videoTags: host.videoTags ?? [],
    caption: host.shortVideo_desc?.trim() ?? "",
    shortVideoUrl: host.shortVideo_url,
  };
}

export function mapReels(raw: ReelRaw[]): Reel[] {
  return raw.map(mapReel);
}

export function reelFingerprint(raw: ReelRaw[]): string {
  return raw
    .map(
      (h) =>
        `${h.userid}:${h.avatar}:${h.price}:${h.online_state}:${h.fireCount}:${h.shortVideo_url}:${h.shortVideo_desc}:${h.nickname}`,
    )
    .join("|");
}

export const seedReels: Reel[] = mapReels(reelsJson as ReelRaw[]);
export const seedReelFingerprint = reelFingerprint(reelsJson as ReelRaw[]);

let catalog: Reel[] = seedReels;

export function getReelCatalog() {
  return catalog;
}

export function setReelCatalog(next: Reel[]) {
  catalog = next;
  setReelLookup(next);
}

setReelCatalog(seedReels);
