import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { liveHubIap } from "../data/iap";
import { publicUrl } from "../lib/publicUrl";
import { useAppStore } from "../store/appStore";

const LIVE_HUB_URL = "https://m.livejasmin.com/";
const BROWSE_MS = 30_000;
const FAB = 70;

const RETURN_KEY = "livehub-until";

function rememberReturnDeadline() {
  sessionStorage.setItem(RETURN_KEY, String(Date.now() + BROWSE_MS));
}

function openLiveHubSite() {
  rememberReturnDeadline();
  window.location.assign(LIVE_HUB_URL);
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
    if (!moved) openLiveHubSite();
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
  useEffect(() => {
    openLiveHubSite();
  }, []);
  return null;
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
