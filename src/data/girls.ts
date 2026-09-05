import hostsJson from "./hosts.json";
import { getInboxPerson, type InboxPerson } from "./inboxPeople";
import { publicUrl } from "../lib/publicUrl";

export type GirlCategory = "Hot" | "New" | "Sexy" | "Cute";
export type GirlRegion = "Global" | "America" | "Europe" | "Asia" | "Africa" | "Middle East";

export const continents: Exclude<GirlRegion, "Global">[] = ["America", "Europe", "Asia", "Africa", "Middle East"];

export type Girl = {
  id: string;
  name: string;
  age: number;
  city: string;
  country: string;
  category: GirlCategory;
  region: GirlRegion;
  online: boolean;
  ratePerMin: number;
  photo: string;
  avatar: string;
  bio: string;
  interests: string[];
  moments: string[];
  lastActive: string;
  videoUrl?: string;
  vip?: boolean;
  fireCount?: number;
  dailyRank?: number;
  weeklyRank?: number;
  height?: number;
  videoTags?: string[];
};

export type HostRaw = {
  userid: string;
  Category: string;
  DailyRank: number;
  WeeklyRank: number;
  video_url: string;
  isModel: number;
  continent: string;
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

const categories: GirlCategory[] = ["Hot", "New", "Sexy", "Cute"];

function asCategory(value: string): GirlCategory {
  return categories.includes(value as GirlCategory) ? (value as GirlCategory) : "Hot";
}

function regionFromContinent(continent: string): GirlRegion {
  return continents.includes(continent as (typeof continents)[number]) ? (continent as GirlRegion) : "Global";
}

function cityFromContry(contry: string, nation: string) {
  const [city] = contry.split(",").map((part) => part.trim());
  return city || nation;
}

function mapHost(host: HostRaw): Girl {
  const minutes = Number(host.activeTime) || 0;
  const online = host.online_state === 1;
  return {
    id: host.userid,
    name: host.nickname,
    age: Number(host.age) || 0,
    city: cityFromContry(host.contry, host.nation),
    country: host.nation,
    category: asCategory(host.Category),
    region: regionFromContinent(host.continent),
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
    dailyRank: host.DailyRank,
    weeklyRank: host.WeeklyRank,
    height: Number(host.height) || 0,
    videoTags: host.videoTags ?? [],
  };
}

export function mapHosts(raw: HostRaw[]): Girl[] {
  return raw.map(mapHost);
}

export function hostFingerprint(raw: HostRaw[]): string {
  return raw
    .map(
      (h) =>
        `${h.userid}:${h.avatar}:${h.price}:${h.online_state}:${h.Category}:${h.fireCount}:${h.DailyRank}:${h.WeeklyRank}:${h.video_url}:${h.nickname}`,
    )
    .join("|");
}

export const seedHomeFeed: Girl[] = mapHosts(hostsJson as HostRaw[]);
export const seedHostFingerprint = hostFingerprint(hostsJson as HostRaw[]);

let catalog: Girl[] = seedHomeFeed;

export function getHomeCatalog() {
  return catalog;
}

export function setHomeCatalog(next: Girl[]) {
  catalog = next;
}

let reelLookup: Girl[] = [];

export function setReelLookup(next: Girl[]) {
  reelLookup = next;
}

let freeTryLookup: Girl[] = [];

export function setFreeTryLookup(next: Girl[]) {
  freeTryLookup = next;
}

export const homeFeed = seedHomeFeed;

export const girls: Girl[] = [
  {
    id: "isabella",
    name: "Isabella",
    age: 24,
    city: "Milan",
    country: "Italy",
    category: "Hot",
    region: "Europe",
    online: true,
    ratePerMin: 50,
    photo: publicUrl("/images/profile-hero.png"),
    avatar: publicUrl("/images/chat-avatar.png"),
    bio: "Fashion student living in Milan. I love discussing art, trying new espresso blends, and late-night city walks. Let's chat about your favorite travel stories. ☕️✨",
    interests: ["Fashion Design", "Photography", "Espresso", "Modern Art"],
    moments: [publicUrl("/images/moment-1.png"), publicUrl("/images/moment-2.png"), publicUrl("/images/moment-3.png"), publicUrl("/images/moment-4.png")],
    lastActive: "Active 2 minutes ago",
  },
];

function girlFromInbox(person: InboxPerson): Girl {
  return {
    id: person.id,
    name: person.name,
    age: 0,
    city: "",
    country: "",
    category: "Hot",
    region: "Global",
    online: person.online,
    ratePerMin: 0,
    photo: person.avatar,
    avatar: person.avatar,
    bio: "",
    interests: [],
    moments: [person.avatar],
    lastActive: person.online ? "Online" : "Active recently",
  };
}

export function getGirl(id: string) {
  const found =
    girls.find((g) => g.id === id) ??
    catalog.find((g) => g.id === id) ??
    reelLookup.find((g) => g.id === id) ??
    freeTryLookup.find((g) => g.id === id);
  if (found) return found;
  const snap = getInboxPerson(id);
  if (snap) return girlFromInbox(snap);
  return girls[0];
}
