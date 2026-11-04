import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { create } from "zustand";
import { liveHubIap } from "../data/iap";
import { rememberLiveHubReturn } from "../lib/liveHubReturn";
import { publicUrl } from "../lib/publicUrl";
import { useAppStore } from "../store/appStore";

import { useLocation, useMatch, useNavigate, useParams } from "react-router-dom";
import { StackShell } from "../shells/Shells";
import { StackBar } from "../shells/StackBar";
const BROWSE_MS = 30_000;
const FAB = 70;

const benefits = [
  { mark: "∞", text: "Unlimited live viewing" },
  { mark: "♧", text: "Access to more live rooms" },
  { mark: "♛", text: "VIP-only content" },
] as const;

export function LiveHubFab() {
  const navigate = useNavigate();
  const [spot, setSpot] = useState<{ left: number; top: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const drag = useRef({
    pointerId: -1,
    startX: 0,
    startY: 0,
    originLeft: 0,
    originTop: 0,
    moved: false,
  });

  const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const el = e.currentTarget;
    const parent = el.offsetParent as HTMLElement | null;
    if (!parent) return;
    const rect = el.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    drag.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originLeft: rect.left - parentRect.left,
      originTop: rect.top - parentRect.top,
      moved: false,
    };
    el.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.pointerId !== drag.current.pointerId) return;
    const dx = e.clientX - drag.current.startX;
    const dy = e.clientY - drag.current.startY;
    if (!drag.current.moved && dx * dx + dy * dy < 100) return;
    drag.current.moved = true;
    setDragging(true);
    const parent = e.currentTarget.offsetParent as HTMLElement | null;
    if (!parent) return;
    const maxL = Math.max(0, parent.clientWidth - FAB);
    const maxT = Math.max(0, parent.clientHeight - FAB);
    setSpot({
      left: Math.min(maxL, Math.max(0, drag.current.originLeft + dx)),
      top: Math.min(maxT, Math.max(0, drag.current.originTop + dy)),
    });
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.pointerId !== drag.current.pointerId) return;

    drag.current.pointerId = -1;
    setDragging(false);

  };

  return (
    <button
      type="button"
      className={`livehub-fab${dragging ? " is-drag" : " press"}`}
      style={spot ? { left: spot.left, top: spot.top, right: "auto", bottom: "auto" } : undefined}
      aria-label="Live Hub"
      onClick={(event) => {
        if (event.detail && drag.current.moved) return;
        generation++;
        useRooms.setState(initialFeed);
        navigate("/live-hub");
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <img src={publicUrl("/images/live-hub.png")} alt="" width={FAB} height={FAB} draggable={false} />
    </button>
  );
}

interface Room {
  username: string;
  display_name?: string;
  age?: number | null;
  country?: string;
  image_url_360x270: string;
  num_users: number;
  current_show: string;
  iframe_embed: string;
}

type HubTab = "all" | "new" | "hotie" | "sexy";
type CardKind = "banner" | "tall" | "stack" | "wide" | "half";

const tabs: { id: HubTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "new", label: "New" },
  { id: "hotie", label: "Hotie" },
  { id: "sexy", label: "Sexy" },
];

const regions = new Intl.DisplayNames(["en"], { type: "region" });

function countryLabel(code?: string) {
  const trimmed = code?.trim() ?? "";
  if (!/^[A-Za-z]{2}$/.test(trimmed)) return "";
  try {
    return regions.of(trimmed.toUpperCase()) ?? "";
  } catch {
    return "";
  }
}

function roomTitle(room: Room) {
  const raw = room.display_name?.trim() ?? "";
  const usable = raw.length > 0 && raw.length <= 18 && !/https?:|www\.|\.com/i.test(raw);
  const name = usable ? raw : room.username;
  return typeof room.age === "number" && room.age > 0 ? `${name}, ${room.age}` : name;
}

/** Non-banner rooms stay in one tab: username hash % 3 is New, Hotie, or Sexy. */
function categoryOf(username: string): Exclude<HubTab, "all"> {
  let hash = 0;
  for (let i = 0; i < username.length; i++) hash = (Math.imul(hash, 33) + username.charCodeAt(i)) >>> 0;
  return (["new", "hotie", "sexy"] as const)[hash % 3];
}

const PAGE_SIZE = 24;
const initialFeed = {
  rooms: [] as Room[],
  featured: [] as Room[],
  pages: [] as Room[][],
  requestedOffset: 0,
  offset: 0,
  hasMore: true,
  status: "idle" as "idle" | "loading" | "failed",
  scrollTop: 0,
};

let generation = 0;
const useRooms = create(() => initialFeed);

async function loadPage(start: number, refresh = false) {
  const feed = useRooms.getState();
  if (!refresh && feed.status === "loading") return;
  generation++;
  useRooms.setState({ status: "loading", requestedOffset: start });
  const requestId = generation;
  try {
    const params = new URLSearchParams({
      wm: "jqpA8", client_ip: "request_ip", limit: String(PAGE_SIZE), offset: String(start),
    });
    const response = await fetch("https://chaturbate.com/api/public/affiliates/onlinerooms/?" + params);
    if (!response.ok) throw new Error("Room list unavailable");
    const { results, count } = await response.json() as { results: Room[]; count: number };
    if (requestId !== generation) return;
    const rooms = new Map<string, Room>();
    for (const room of results) {
      if (room.current_show === "public" && room.iframe_embed) rooms.set(room.username, room);
    }
    const offset = start + results.length;
    const pageRooms = [...rooms.values()];
    const featured = start === 0 ? pageRooms.slice(0, 3) : feed.featured;
    const previous = start === 0 ? [] : feed.rooms;
    const known = new Set(previous.map(room => room.username));
    const added = pageRooms.filter(room => !known.has(room.username));
    const pages = start === 0 ? [] : feed.pages;
    useRooms.setState({ rooms: previous.concat(added), pages: added.length ? [...pages, added] : pages, featured, offset, hasMore: results.length > 0 && offset < count, status: "idle" });
  } catch {
    if (requestId === generation) useRooms.setState({ status: "failed" });
  }
}

function playerSource(room: Room) {
  const template = document.createElement("template");
  template.innerHTML = room.iframe_embed;
  const src = template.content.querySelector("iframe")?.getAttribute("src");
  if (!src) return;
  const url = new URL(src, "https://chaturbate.com");
  if (url.protocol === "https:" && (url.hostname === "chaturbate.com" || url.hostname.endsWith(".chaturbate.com"))) {
    url.searchParams.set("embed_video_only", "0");
    return url.href;
  }
}

function RoomPlayer({ room, src }: { room: Room; src: string }) {
  const [loaded, setLoaded] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setScale(Math.min(1, el.clientWidth / 850)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <div className="hub-stage" ref={stage}>
      <iframe className="hub-player" sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
        style={{ width: 100 / scale + "%", height: 100 / scale + "%", transform: "scale(" + scale + ")" }} title={room.username} src={src}
        onLoad={() => setLoaded(true)} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
      {!loaded && <div className="hub-cover" role="status">
        <img src={room.image_url_360x270} alt="" />
        <div>Loading live room…<progress aria-label="Loading live room" /></div>
      </div>}
    </div>
  );
}

const viewersIcon: Record<CardKind, string> = {
  banner: "/icons/livehub-viewers.svg",
  tall: "/icons/livehub-viewers-sm.svg",
  stack: "/icons/livehub-viewers-xs.svg",
  wide: "/icons/livehub-viewers-md.svg",
  half: "/icons/livehub-viewers-xs.svg",
};

const pinIcon: Record<CardKind, string> = {
  banner: "/icons/livehub-pin.svg",
  tall: "/icons/livehub-pin-sm.svg",
  stack: "/icons/livehub-pin-md.svg",
  wide: "/icons/livehub-pin-sm.svg",
  half: "/icons/livehub-pin-sm.svg",
};

function RoomFace({ room, kind, onOpen }: { room: Room; kind: CardKind; onOpen: (room: Room) => void }) {
  const place = countryLabel(room.country);
  const combined = kind === "banner" || kind === "wide";
  return (
    <button type="button" className={`hub-face press is-${kind}`} onClick={() => onOpen(room)}>
      <img className="hub-photo" loading={kind === "banner" ? "eager" : "lazy"} decoding="async" src={room.image_url_360x270} alt="" />
      {combined ? (
        <span className="hub-pill">
          <i className="hub-dot" />
          Live
          <span className="hub-pill-bar">|</span>
          <img src={publicUrl(viewersIcon[kind])} alt="" />
          {room.num_users.toLocaleString()}
        </span>
      ) : (
        <>
          <span className="hub-pill"><i className="hub-dot" />Live</span>
          <span className="hub-count">
            <img src={publicUrl(viewersIcon[kind])} alt="" />
            {room.num_users.toLocaleString()}
          </span>
        </>
      )}
      {kind === "banner" && (
        <span className="hub-ribbon" aria-hidden="true">
          <img src={publicUrl("/icons/livehub-ribbon-crown.svg")} alt="" width={16} height={16} />
        </span>
      )}
      <span className="hub-meta">
        <strong>{roomTitle(room)}</strong>
        {place && (
          <small>
            <img src={publicUrl(pinIcon[kind])} alt="" />
            {place}
          </small>
        )}
      </span>
    </button>
  );
}

function Banner({ rooms, onOpen }: { rooms: Room[]; onOpen: (room: Room) => void }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (rooms.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      const el = scroller.current;
      if (!el || el.clientWidth === 0) return;
      const next = (Math.round(el.scrollLeft / el.clientWidth) + 1) % rooms.length;
      el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
    }, 4500);
    return () => window.clearInterval(timer);
  }, [rooms.length]);

  const onScroll = () => {
    const el = scroller.current;
    if (!el || el.clientWidth === 0) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <section className="hub-banner" aria-label="Featured rooms">
      <div className="hub-banner-track" ref={scroller} onScroll={onScroll}>
        {rooms.map((room) => (
          <RoomFace key={room.username} room={room} kind="banner" onOpen={onOpen} />
        ))}
      </div>
      {rooms.length > 1 && (
        <div className="hub-dots">
          {rooms.map((room, dot) => (
            <button
              key={room.username}
              type="button"
              className={dot === index ? "is-on" : ""}
              aria-label={`Show room ${dot + 1}`}
              aria-current={dot === index ? "true" : undefined}
              onClick={() => scroller.current?.scrollTo({ left: dot * scroller.current.clientWidth, behavior: "smooth" })}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function RoomRows({ rooms, onOpen }: { rooms: Room[]; onOpen: (room: Room) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const roomKeys = rooms.map(room => room.username).join("/");
  const [mounted, setMounted] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const observer = new IntersectionObserver(entries => {
      setMounted(previous => {
        const next = new Set(previous);
        for (const entry of entries) {
          const key = (entry.target as HTMLElement).dataset.row!;
          if (entry.isIntersecting) next.add(key);
          else next.delete(key);
        }
        return next;
      });
    }, { root: el.closest(".shell-body"), rootMargin: "400px 0px" });
    for (const row of el.children) observer.observe(row);
    return () => observer.disconnect();
  }, [roomKeys]);
  const rows: { key: string; kind: "split" | "wide" | "pair"; node: ReactNode }[] = [];
  let index = 0;
  let phase = 0;
  while (index < rooms.length) {
    const left = rooms.length - index;
    const step = phase % 3;
    if (step === 0 && left >= 3) {
      const group = rooms.slice(index, index + 3);
      rows.push({
        key: group.map((room) => room.username).join("-"),
        kind: "split",
        node: (
          <div className="hub-split">
            <RoomFace room={group[0]} kind="tall" onOpen={onOpen} />
            <div className="hub-col">
              <RoomFace room={group[1]} kind="stack" onOpen={onOpen} />
              <RoomFace room={group[2]} kind="stack" onOpen={onOpen} />
            </div>
          </div>
        ),
      });
      index += 3;
    } else if (step === 1 && left >= 1) {
      const room = rooms[index];
      rows.push({ key: room.username, kind: "wide", node: <RoomFace room={room} kind="wide" onOpen={onOpen} /> });
      index += 1;
    } else if (left >= 2) {
      const group = rooms.slice(index, index + 2);
      rows.push({
        key: group.map((room) => room.username).join("-"),
        kind: "pair",
        node: (
          <div className="hub-pair">
            {group.map((room) => <RoomFace key={room.username} room={room} kind="half" onOpen={onOpen} />)}
          </div>
        ),
      });
      index += 2;
    } else {
      const room = rooms[index];
      rows.push({ key: room.username, kind: "wide", node: <RoomFace room={room} kind="wide" onOpen={onOpen} /> });
      index += 1;
    }
    phase += 1;
  }
  return <div className="hub-rows" ref={container}>{rows.map(row =>
    <div key={row.key} data-row={row.key} className={`hub-slot is-${row.kind}`}>
      {mounted.has(row.key) && row.node}
    </div>
  )}</div>;
}

export function LiveHubPage() {
  const navigate = useNavigate();
  const { username } = useParams();
  const { rooms, featured, status, hasMore, offset, pages, requestedOffset } = useRooms();
  const [tab, setTab] = useState<HubTab>("all");
  const content = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!useRooms.getState().offset && useRooms.getState().hasMore) void loadPage(0);
  }, [username]);

  useEffect(() => {
    const body = content.current?.closest(".shell-body");
    if (body) body.scrollTop = username ? 0 : useRooms.getState().scrollTop;
  }, [username]);
  useEffect(() => {
    const body = content.current?.closest<HTMLElement>(".shell-body");
    if (!body || username) return;
    let lastTop = body.scrollTop;
    let startY = 0;
    const loadAtEnd = () => {
      const feed = useRooms.getState();
      if (feed.offset && feed.hasMore && feed.status === "idle" &&
          body.scrollHeight - body.clientHeight - body.scrollTop <= 160) {
        void loadPage(feed.offset);
      }
    };
    const onScroll = () => {
      if (body.scrollTop > lastTop) loadAtEnd();
      lastTop = body.scrollTop;
    };
    // Short filtered pages may fit on screen without firing a scroll event.
    const onTouchStart = (event: TouchEvent) => { startY = event.touches[0].clientY; };
    const onTouchEnd = (event: TouchEvent) => {
      if (body.scrollHeight <= body.clientHeight + 1 && startY - event.changedTouches[0].clientY > 40) loadAtEnd();
    };
    const onWheel = (event: WheelEvent) => {
      if (body.scrollHeight <= body.clientHeight + 1 && event.deltaY > 0) loadAtEnd();
    };
    body.addEventListener("scroll", onScroll);
    body.addEventListener("touchstart", onTouchStart, { passive: true });
    body.addEventListener("touchend", onTouchEnd);
    body.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      body.removeEventListener("scroll", onScroll);
      body.removeEventListener("touchstart", onTouchStart);
      body.removeEventListener("touchend", onTouchEnd);
      body.removeEventListener("wheel", onWheel);
    };
  }, [username]);

  const room = rooms.find(item => item.username === username) ?? featured.find(item => item.username === username);
  const src = room && playerSource(room);

  const unlocked = useAppStore((s) => s.liveHubUnlocked);
  const [expiredRoom, setExpiredRoom] = useState<string | null>(null);
  useEffect(() => {
    setExpiredRoom(null);
    if (!username || !src || unlocked) return;
    const timer = window.setTimeout(() => {
      setExpiredRoom(username);
      useAppStore.getState().openOverlay("livehub");
    }, BROWSE_MS);
    return () => window.clearTimeout(timer);
  }, [username, src, unlocked]);

  const visiblePages = pages.map(page => page.filter(room =>
    !featured.some(item => item.username === room.username) && (tab === "all" || categoryOf(room.username) === tab)
  )).filter(page => page.length > 0);
  const openRoom = (item: Room) => {
    useRooms.setState({ scrollTop: content.current?.closest(".shell-body")?.scrollTop ?? 0 });
    navigate("/live-hub/" + encodeURIComponent(item.username), { state: { fromLiveHub: true } });
  };

  return <StackShell onRefresh={username ? undefined : () => loadPage(0, true)} header={username ? <StackBar title={username} /> : (
    <header className="hub-bar">
      <button className="circle-btn press" type="button" aria-label="Back" onClick={() => {
        generation++;
        useRooms.setState(initialFeed);
        rememberLiveHubReturn();
        navigate("/app/home", { replace: true });
      }}>
        <img src={publicUrl("/icons/livehub-back.svg")} alt="" width={16} height={16} />
      </button>
      <h1 className="hub-bar-title">
        <span>Live </span>
        <span className="hub-bar-hub">Hub</span>
        <img src={publicUrl("/icons/livehub-live.svg")} alt="" width={24} height={24} />
      </h1>
      <button className="hub-crown press" type="button" aria-label="Unlock Live Hub VIP" onClick={() => useAppStore.getState().openOverlay("livehub")}>
        <img src={publicUrl("/icons/livehub-crown.svg")} alt="" width={20} height={20} />
      </button>
    </header>
  )}>
    <div className={username ? "hub-room-view" : "hub-list"} data-category={username ? undefined : tab} ref={content}>
      {username && room && src && (unlocked || expiredRoom !== username) && <RoomPlayer key={src} room={room} src={src} />}
      {username && !src && (offset > 0 || !hasMore) && <p>This room is unavailable.</p>}
      {!username && featured.length > 0 && <Banner rooms={featured} onOpen={openRoom} />}
      {!username && rooms.length > 0 && (
        <div className="hub-tabs" role="tablist" aria-label="Live categories">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              className={`hub-tab press${tab === item.id ? " is-on" : ""}`}
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
      {!username && visiblePages.map(page =>
        <RoomRows key={tab + "/" + page[0].username} rooms={page} onOpen={openRoom} />
      )}
      {!username && rooms.length > 0 && visiblePages.length === 0 && status !== "loading" && (
        <p className="hub-note">No rooms in this category right now.</p>
      )}
      {(!username || !offset) && status === "loading" && <p className="hub-note" role="status">Loading live rooms…</p>}
      {(!username || !offset) && status === "failed" && <p className="hub-note" role="alert">Couldn’t load rooms. <button type="button" onClick={() => loadPage(requestedOffset)}>Try again</button></p>}
      {!username && !hasMore && <p className="hub-note">{rooms.length ? "You’ve reached the end." : "No public rooms are live right now."}</p>}
    </div>
  </StackShell>;
}

export function LiveHubUnlock() {
  const payBusy = useAppStore((s) => s.payBusy);
  const close = useAppStore((s) => s.closeOverlay);
  const startPurchase = useAppStore((s) => s.startPurchase);
  const buyLiveHub = useAppStore((s) => s.buyLiveHub);

  const navigate = useNavigate();
  const location = useLocation();
  const inRoom = useMatch("/live-hub/:username");
  const dismiss = () => {
    close();
    if (!inRoom) return;
    if (location.state?.fromLiveHub) navigate(-1);
    else navigate("/live-hub", { replace: true });
  };

  const buy = () => {
    startPurchase(liveHubIap(), () => {
      buyLiveHub();
      close();
    });
  };

  return (
    <div className="livehub-gate">
      <button type="button" className="livehub-back press" aria-label="Back" onClick={dismiss}>
        <img src={publicUrl("/icons/livehub-back.svg")} alt="" width={16} height={16} />
      </button>
      <div className="livehub-card">
        <button type="button" className="livehub-x press" aria-label="Close" onClick={dismiss}>
          <img src={publicUrl("/icons/livehub-close.svg")} alt="" width={12} height={12} />
        </button>
        <p className="livehub-kicker">♛ LIVEHUB VIP</p>
        <img className="livehub-art" src={publicUrl("/images/livehub-locked.png")} alt="" />
        <h2 id="livehub-title">Unlock VIP</h2>
        <p className="livehub-keep">Keep Watching</p>
        <ul className="livehub-benefits">
          {benefits.map((item) => (
            <li key={item.text}>
              <span aria-hidden="true">{item.mark}</span>
              {item.text}
            </li>
          ))}
        </ul>
        <p className="livehub-price">
          $19.99 <s>$49.99</s>
        </p>
        <button type="button" className="livehub-cta press" disabled={payBusy} onClick={buy}>
          GET NOW
          <img src={publicUrl("/icons/livehub-arrow.svg")} alt="" width={12} height={12} />
        </button>
      </div>
    </div>
  );
}
