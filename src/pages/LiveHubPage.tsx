import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useNavigate } from "react-router-dom";
import { liveHubIap } from "../data/iap";
import { publicUrl } from "../lib/publicUrl";
import { FullscreenShell } from "../shells/Shells";
import { useAppStore } from "../store/appStore";

const LIVE_HUB_URL = "https://m.livejasmin.com/";
const BROWSE_MS = 30_000;
const FAB = 70;

const RETURN_KEY = "livehub-until";

let browseWindow: Window | null = null;
let browseStartedAt = 0;
let keepAlive: { ctx: AudioContext; osc: OscillatorNode } | null = null;

function liveHubHomeUrl(unlock: boolean) {
  const url = new URL(`${import.meta.env.BASE_URL}app/home`, window.location.origin);
  if (unlock) url.searchParams.set("livehub", "1");
  return url.href;
}

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

function unlockDocumentScroll() {
  const html = document.documentElement;
  const body = document.body;
  const prevHtml = html.getAttribute("style");
  const prevBody = body.getAttribute("style");
  html.style.setProperty("position", "static", "important");
  html.style.setProperty("overflow", "auto", "important");
  html.style.setProperty("height", "auto", "important");
  body.style.setProperty("position", "static", "important");
  body.style.setProperty("overflow", "visible", "important");
  body.style.setProperty("height", "auto", "important");
  void html.offsetHeight;
  return () => {
    if (prevHtml == null) html.removeAttribute("style");
    else html.setAttribute("style", prevHtml);
    if (prevBody == null) body.removeAttribute("style");
    else body.setAttribute("style", prevBody);
  };
}

function startKeepAlive() {
  if (keepAlive) return;
  const Ctx = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  gain.gain.value = 0.0008;
  osc.frequency.value = 18000;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  void ctx.resume();
  keepAlive = { ctx, osc };
}

function stopKeepAlive() {
  const current = keepAlive;
  keepAlive = null;
  if (!current) return;
  try {
    current.osc.stop();
  } catch {
    /* already stopped */
  }
  void current.ctx.close();
}

function openLiveHubSite() {
  browseStartedAt = performance.now();
  rememberReturnDeadline();
  startKeepAlive();
  const restore = unlockDocumentScroll();
  const opened = window.open(LIVE_HUB_URL, "_blank");
  restore();
  browseWindow = opened && opened !== window ? opened : null;
  if (!browseWindow) {
    stopKeepAlive();
    window.location.assign(LIVE_HUB_URL);
  }
  return browseWindow;
}

function returnOpenedSite(unlock: boolean) {
  stopKeepAlive();
  const win = browseWindow;
  browseWindow = null;
  if (!win || win.closed) return;
  try {
    win.location.replace(liveHubHomeUrl(unlock));
  } catch {
    try {
      win.close();
    } catch {
      /* 跨站窗口关不掉时，用户仍留在 Chaturbate */
    }
  }
}

const benefits = [
  { mark: "∞", text: "Unlimited live viewing" },
  { mark: "♧", text: "Access to more live rooms" },
  { mark: "♛", text: "VIP-only content" },
] as const;

function useSwipeBack(onBack: () => void) {
  const back = useRef(onBack);
  back.current = onBack;
  const drag = useRef({ on: false, x: 0, y: 0 });
  return {
    onPointerDown(e: ReactPointerEvent<HTMLElement>) {
      if (e.clientX > 28) return;
      drag.current = { on: true, x: e.clientX, y: e.clientY };
    },
    onPointerMove(e: ReactPointerEvent) {
      if (!drag.current.on) return;
      const dx = e.clientX - drag.current.x;
      const dy = e.clientY - drag.current.y;
      if (dx * dx + dy * dy < 64) return;
      if (dy * dy >= dx * dx) drag.current.on = false;
    },
    onPointerUp(e: ReactPointerEvent) {
      if (!drag.current.on) return;
      const dx = e.clientX - drag.current.x;
      const dy = e.clientY - drag.current.y;
      drag.current.on = false;
      if (dx > 72 && Math.abs(dy) < dx) back.current();
    },
    onPointerCancel() {
      drag.current.on = false;
    },
  };
}

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
    const moved = drag.current.moved;
    drag.current.pointerId = -1;
    setDragging(false);
    if (!moved) {
      const opened = openLiveHubSite();
      if (opened) navigate("/live-hub");
    }
  };

  return (
    <button
      type="button"
      className={`livehub-fab${dragging ? " is-drag" : " press"}`}
      style={spot ? { left: spot.left, top: spot.top, right: "auto", bottom: "auto" } : undefined}
      aria-label="Live Hub"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <img src={publicUrl("/images/live-hub.png")} alt="" width={FAB} height={FAB} draggable={false} />
    </button>
  );
}

export function LiveHubPage() {
  const navigate = useNavigate();
  const gone = useRef(false);
  const [left, setLeft] = useState(30);

  const leave = (unlock: boolean) => {
    if (gone.current) return;
    gone.current = true;
    browseStartedAt = 0;
    returnOpenedSite(unlock);
    if (unlock && !useAppStore.getState().liveHubUnlocked) {
      useAppStore.getState().openOverlay("livehub");
    }
    navigate("/app/home", { replace: true });
  };

  const swipe = useSwipeBack(() => leave(false));

  useEffect(() => {
    if (!browseStartedAt) browseStartedAt = performance.now();
    const id = window.setInterval(() => {
      const remain = Math.max(0, Math.ceil((BROWSE_MS - (performance.now() - browseStartedAt)) / 1000));
      setLeft(remain);
      if (remain > 0) return;
      window.clearInterval(id);
      leave(true);
    }, 200);
    return () => window.clearInterval(id);
  }, [navigate]);

  return (
    <FullscreenShell>
      <div className="livehub-wait" {...swipe}>
        <strong>{left}</strong>
        <p>秒后回到 LiveGirl</p>
      </div>
    </FullscreenShell>
  );
}

export function LiveHubUnlock() {
  const payBusy = useAppStore((s) => s.payBusy);
  const close = useAppStore((s) => s.closeOverlay);
  const startPurchase = useAppStore((s) => s.startPurchase);
  const buyLiveHub = useAppStore((s) => s.buyLiveHub);
  const swipe = useSwipeBack(close);

  const buy = () => {
    startPurchase(liveHubIap(), () => {
      buyLiveHub();
      close();
    });
  };

  return (
    <div className="livehub-gate" {...swipe}>
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
