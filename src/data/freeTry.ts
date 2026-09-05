import { setFreeTryLookup, type Girl, type GirlRegion } from "./girls";
import seedJson from "./freeTryHosts.json";

export type FreeTryRaw = {
  userid: string;
  video_url: string;
  isModel: number;
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
  avatar: string;
  age: string;
  photos: string[];
  verify_phone: number;
  price: string;
  user_role: number;
  verify_twitter: number;
  contry: string;
  INTERESTS: string[];
  videoTags: string[];
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

function mapFreeTryHost(host: FreeTryRaw): Girl {
  const minutes = Number(host.activeTime) || 0;
  const online = host.online_state === 1;
  return {
    id: host.userid,
    name: host.nickname,
    age: Number(host.age) || 0,
    city: cityFromContry(host.contry, host.nation),
    country: host.nation,
    category: "Hot",
    region: NATION_REGION[host.nation] ?? "Global",
    online,
    ratePerMin: Number(host.price) || 0,
    photo: host.avatar,
    avatar: host.avatar,
    bio: host.intro,
    interests: host.INTERESTS ?? [],
    moments: host.photos?.length ? host.photos : [host.avatar],
    lastActive: `Active ${minutes} minutes ago`,
    videoUrl: host.video_url,
    vip: host.isVip === 1,
    fireCount: Number(host.fireCount) || 0,
    height: Number(host.height) || 0,
    videoTags: host.videoTags ?? [],
  };
}

export function mapFreeTryHosts(raw: FreeTryRaw[]): Girl[] {
  return raw.map(mapFreeTryHost);
}

export function freeTryFingerprint(raw: FreeTryRaw[]): string {
  return raw
    .map((h) => `${h.userid}:${h.avatar}:${h.price}:${h.online_state}:${h.video_url}:${h.nickname}`)
    .join("|");
}

export const seedFreeTryHosts: Girl[] = mapFreeTryHosts(seedJson as FreeTryRaw[]);
export const seedFreeTryFingerprint = freeTryFingerprint(seedJson as FreeTryRaw[]);

let catalog: Girl[] = seedFreeTryHosts;

export function getFreeTryCatalog() {
  return catalog;
}

export function setFreeTryCatalog(next: Girl[]) {
  catalog = next;
  setFreeTryLookup(next);
}

setFreeTryCatalog(seedFreeTryHosts);
