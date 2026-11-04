import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { create } from "zustand";
import { liveHubIap } from "../data/iap";
import { publicUrl } from "../lib/publicUrl";
import { useAppStore } from "../store/appStore";

import { useNavigate, useParams } from "react-router-dom";
import { StackShell } from "../shells/Shells";
import { StackBar } from "../shells/StackBar";
const BROWSE_MS = 30_000;
const FAB = 70;

const RETURN_KEY = "livehub-until";

function rememberReturnDeadline() {
  sessionStorage.setItem(RETURN_KEY, String(Date.now() + BROWSE_MS));
}

export function consumeLiveHubReturn() {
  const raw = sessionStorage.getItem(RETURN_KEY);
  if (!raw) return;
  sessionStorage.removeItem(RETURN_KEY);
  const until = Number(raw);
  if (!Number.isFinite(until) || Date.now() < until) return;
  if (!useAppStore.getState().liveHubUnlocked) useAppStore.getState().openOverlay("livehub");
}

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
        rememberReturnDeadline();
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
  image_url_360x270: string;
  num_users: number;
  current_show: string;
  iframe_embed: string;
}

const PAGE_SIZE = 500;
const initialFeed = {
  rooms: [] as Room[],
  offset: 0,
  hasMore: true,
  status: "idle" as "idle" | "loading" | "failed",
  scrollTop: 0,
};

let generation = 0;
const useRooms = create(() => initialFeed);

async function loadNextPage() {
  const feed = useRooms.getState();
  if (!feed.hasMore || feed.status === "loading") return;
  useRooms.setState({ status: "loading" });
  const requestId = generation;
  try {
    const params = new URLSearchParams({
      wm: "jqpA8", client_ip: "request_ip", limit: String(PAGE_SIZE), offset: String(feed.offset),
    });
    const response = await fetch("https://chaturbate.com/api/public/affiliates/onlinerooms/?" + params);
    if (!response.ok) throw new Error("Room list unavailable");
    const { results, count } = await response.json() as { results: Room[]; count: number };
    if (requestId !== generation) return;
    const rooms = new Map(feed.rooms.map(room => [room.username, room]));
    for (const room of results) {
      if (room.current_show === "public" && room.iframe_embed) rooms.set(room.username, room);
    }
    const offset = feed.offset + results.length;
    useRooms.setState({ rooms: [...rooms.values()], offset, hasMore: results.length > 0 && offset < count, status: "idle" });
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
  if (url.protocol === "https:" && (url.hostname === "chaturbate.com" || url.hostname.endsWith(".chaturbate.com"))) return url.href;
}

export function LiveHubPage() {
  const navigate = useNavigate();
  const { username } = useParams();
  const { rooms, status, hasMore, offset } = useRooms();
  const content = useRef<HTMLDivElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (useRooms.getState().offset === 0) void loadNextPage();
    const body = content.current?.closest(".shell-body");
    if (body) body.scrollTop = username ? 0 : useRooms.getState().scrollTop;
  }, [username]);

  useEffect(() => {
    const target = sentinel.current;
    if (!target || username || !hasMore || status !== "idle") return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) void loadNextPage();
    }, { root: target.closest(".shell-body"), rootMargin: "0px 0px 240px 0px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [username, hasMore, status, offset]);
  const room = rooms?.find(item => item.username === username);
  const src = room && playerSource(room);

  return <StackShell header={<StackBar title={username ?? "Live Hub"} />}>
    <div className="hub-content" ref={content}>
      {username && src && <iframe className="hub-player" title={username} src={src} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />}
      {username && !src && (offset > 0 || !hasMore) && <p>This room is unavailable.</p>}
      {!username && rooms.length > 0 && <><h2>Live now</h2><div className="hub-grid">{rooms.map(item =>
        <button className="hub-room press" key={item.username} onClick={() => {
          useRooms.setState({ scrollTop: content.current?.closest(".shell-body")?.scrollTop ?? 0 });
          navigate("/live-hub/" + encodeURIComponent(item.username));
        }}>
          <img src={item.image_url_360x270} alt="" loading="lazy" />
          <strong>{item.username}</strong><small>{item.num_users.toLocaleString()} watching</small>
        </button>
      )}</div></>}
      {!username && hasMore && <div ref={sentinel} style={{ height: 1 }} />}
      {(!username || !offset) && status === "loading" && <p role="status">Loading live rooms…</p>}
      {(!username || !offset) && status === "failed" && <p role="alert">Couldn’t load rooms. <button onClick={loadNextPage}>Try again</button></p>}
      {!username && !hasMore && <p>{rooms.length ? "You’ve reached the end." : "No public rooms are live right now."}</p>}
    </div>
  </StackShell>;
}

export function LiveHubUnlock() {
  const payBusy = useAppStore((s) => s.payBusy);
  const close = useAppStore((s) => s.closeOverlay);
  const startPurchase = useAppStore((s) => s.startPurchase);
  const buyLiveHub = useAppStore((s) => s.buyLiveHub);

  const buy = () => {
    startPurchase(liveHubIap(), () => {
      buyLiveHub();
      close();
    });
  };

  return (
    <div className="livehub-gate">
      <button type="button" className="livehub-back press" aria-label="Back" onClick={close}>
        <img src={publicUrl("/icons/livehub-back.svg")} alt="" width={16} height={16} />
      </button>
      <div className="livehub-card">
        <button type="button" className="livehub-x press" aria-label="Close" onClick={close}>
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
