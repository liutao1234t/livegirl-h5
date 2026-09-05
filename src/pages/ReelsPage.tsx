import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type RefObject } from "react";
import { useNavigate } from "react-router-dom";
import { formatFireCount } from "../data/reels";
import { armInlineVideo } from "../lib/media";
import { shareAppDownload } from "../lib/nativeShare";
import { FREE_REEL_COUNT, isReelLocked, tryDial } from "../lib/paywall";
import { TabShell } from "../shells/Shells";
import { useAppStore } from "../store/appStore";
import { useReelsStore } from "../store/reelsStore";
import { publicUrl } from "../lib/publicUrl";

function useReelsForeground(scrollerRef: RefObject<HTMLDivElement | null>) {
  const [paneShown, setPaneShown] = useState(true);
  const [pageVisible, setPageVisible] = useState(() => typeof document === "undefined" || !document.hidden);

  useEffect(() => {
    const pane = scrollerRef.current?.closest(".nav-pane");
    if (!pane) return;
    const sync = () => setPaneShown(pane.getAttribute("aria-hidden") !== "true");
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(pane, { attributes: true, attributeFilter: ["aria-hidden", "inert"] });
    return () => obs.disconnect();
  }, [scrollerRef]);

  useEffect(() => {
    const sync = () => setPageVisible(!document.hidden);
    const onHide = () => setPageVisible(false);
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("pagehide", onHide);
    };
  }, []);

  return paneShown && pageVisible;
}

function snapToReel(root: HTMLDivElement | null, id: string) {
  const node = root?.querySelector(`[data-reel-id="${id}"]`);
  if (!root || !(node instanceof HTMLElement)) return;
  root.scrollTop = node.offsetTop;
}

export function ReelsPage() {
  const navigate = useNavigate();
  const reels = useReelsStore((s) => s.reels);
  const refreshReels = useReelsStore((s) => s.refreshReels);
  const isVip = useAppStore((s) => s.isVip);
  const overlay = useAppStore((s) => s.overlay);
  const activeId = useReelsStore((s) => s.activeId);
  const paused = useReelsStore((s) => s.paused);
  const setActiveId = useReelsStore((s) => s.setActiveId);
  const setPaused = useReelsStore((s) => s.setPaused);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const scrollerRef = useRef<HTMLDivElement>(null);
  const tapRef = useRef({ x: 0, y: 0, at: 0 });
  const foreground = useReelsForeground(scrollerRef);

  useEffect(() => {
    void refreshReels();
  }, [refreshReels]);

  useEffect(() => {
    if (!reels.length) return;
    if (activeId && reels.some((item) => item.id === activeId)) return;
    setActiveId(reels[0].id);
  }, [activeId, reels, setActiveId]);

  useLayoutEffect(() => {
    const id = useReelsStore.getState().activeId;
    if (id) snapToReel(scrollerRef.current, id);
  }, []);

  useEffect(() => {
    if (!foreground) setPaused(true);
  }, [foreground, setPaused]);

  useEffect(() => {
    return () => {
      if (window.location.pathname !== "/app/reels") setPaused(true);
    };
  }, [setPaused]);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;
    let armed = false;
    const arm = window.requestAnimationFrame(() => {
      const keep = useReelsStore.getState().activeId;
      if (keep) snapToReel(root, keep);
      armed = true;
    });
    const obs = new IntersectionObserver(
      (entries) => {
        if (!armed) return;
        const top = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const id = top?.target.getAttribute("data-reel-id");
        if (!id) return;
        const index = reels.findIndex((item) => item.id === id);
        if (isReelLocked(index)) {
          const lastFree = reels[FREE_REEL_COUNT - 1];
          if (lastFree) {
            setActiveId(lastFree.id);
            snapToReel(root, lastFree.id);
          }
          if (useAppStore.getState().overlay !== "unlock") useAppStore.getState().openOverlay("unlock");
          return;
        }
        setActiveId(id);
      },
      { root, threshold: [0.55, 0.75, 0.9] },
    );
    root.querySelectorAll("[data-reel-id]").forEach((node) => obs.observe(node));
    return () => {
      window.cancelAnimationFrame(arm);
      obs.disconnect();
    };
  }, [reels, setActiveId, isVip]);

  useEffect(() => {
    if (isVip && overlay === "unlock") useAppStore.getState().closeOverlay();
  }, [isVip, overlay]);

  const activeIndex = Math.max(
    0,
    reels.findIndex((item) => item.id === activeId),
  );

  const onReelPointerDown = (e: PointerEvent<HTMLElement>) => {
    tapRef.current = { x: e.clientX, y: e.clientY, at: Date.now() };
  };

  const onReelPointerUp = (e: PointerEvent<HTMLElement>, id: string) => {
    if (id !== (activeId ?? reels[0]?.id)) return;
    if ((e.target as HTMLElement).closest("button, a")) return;
    const dx = e.clientX - tapRef.current.x;
    const dy = e.clientY - tapRef.current.y;
    if (dx * dx + dy * dy > 100) return;
    if (Date.now() - tapRef.current.at > 450) return;
    setPaused(!useReelsStore.getState().paused);
  };

  const blockNativePlayer = (e: { preventDefault: () => void }) => {
    e.preventDefault();
  };

  return (
    <TabShell overlayNav>
      <div className="reels" ref={scrollerRef}>
        {reels.map((item, i) => {
          const near = Math.abs(i - activeIndex) <= 1;
          const active = item.id === (activeId ?? reels[0]?.id);
          const locked = !isVip && i >= FREE_REEL_COUNT;
          return (
            <article
              key={item.id}
              className={`reel${active && paused ? " is-paused" : ""}`}
              data-reel-id={item.id}
              onPointerDown={onReelPointerDown}
              onPointerUp={(e) => onReelPointerUp(e, item.id)}
              onDoubleClick={blockNativePlayer}
            >
              <img className="reel-bg" src={item.photo} alt="" />
              {near && item.shortVideoUrl ? (
                <ReelClip
                  src={item.shortVideoUrl}
                  poster={item.photo}
                  playing={active && foreground && !paused && !locked}
                />
              ) : null}
              <div className="reel-shade-top" />
              <div className="reel-shade" />
              <div className="reel-pause" aria-hidden>
                <span className="reel-pause-pip">
                  <span className="reel-pause-bars" />
                </span>
              </div>
              <div className="reel-copy">
                <button className="reel-user press" type="button" onClick={() => navigate(`/profile/${item.id}`)}>
                  <span className="reel-ava">
                    <img src={item.avatar} alt="" />
                    {item.online ? <span className="dot cyan" /> : null}
                  </span>
                  <span>
                    <strong>
                      {item.name}, {item.age}
                    </strong>
                    <small>
                      <span className="icon-box" style={{ width: 11, height: 13 }}>
                        <img className="icon" src={publicUrl("/icons/pin.svg")} alt="" />
                      </span>
                      {item.city}, {item.country}
                    </small>
                  </span>
                </button>
                <p>{item.caption}</p>
                <div className="reel-tags">
                  {(item.videoTags ?? []).map((t) => (
                    <span key={t}>{t.startsWith("#") ? t : `#${t.replace(/\s/g, "")}`}</span>
                  ))}
                </div>
              </div>
              <div className="reel-side">
                <button className="reel-act press" type="button" onClick={shareAppDownload}>
                  <span className="reel-act-ico">
                    <span className="icon-box" style={{ width: 21, height: 23 }}>
                      <img className="icon" src={publicUrl("/icons/share.svg")} alt="" />
                    </span>
                  </span>
                  Share
                </button>
                <button
                  className={`reel-act press ${liked[item.id] ? "is-on" : ""}`}
                  type="button"
                  onClick={() => setLiked((s) => ({ ...s, [item.id]: !s[item.id] }))}
                >
                  <span className="reel-act-ico">
                    <span className="icon-box" style={{ width: 23, height: 21 }}>
                      <img className="icon" src={publicUrl("/icons/like.svg")} alt="" />
                    </span>
                  </span>
                  {formatFireCount(item.fireCount ?? 0)}
                </button>
                <button
                  className="reel-call press"
                  type="button"
                  aria-label={`Call ${item.name}`}
                  onClick={() => tryDial(item.id, item.ratePerMin, navigate)}
                >
                  <span className="icon-box" style={{ width: 27, height: 21 }}>
                    <img className="icon" src={publicUrl("/icons/reel-video.svg")} alt="" />
                  </span>
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </TabShell>
  );
}

function ReelClip({
  src,
  poster,
  playing,
}: {
  src: string;
  poster: string;
  playing: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [played, setPlayed] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [waiting, setWaiting] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (playing) {
      void el.play().catch(() => undefined);
    } else {
      el.pause();
    }
  }, [playing, src]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    armInlineVideo(el);

    const readBuf = () => {
      const d = el.duration;
      if (!d || !Number.isFinite(d)) return;
      const buf = el.buffered;
      if (buf.length) setBuffered(Math.min(1, buf.end(buf.length - 1) / d));
    };

    const onWaiting = () => setWaiting(true);
    const onReady = () => setWaiting(false);
    const onProgress = () => readBuf();
    const blockNativePlayer = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      const clip = el as HTMLVideoElement & { webkitExitFullscreen?: () => void };
      clip.webkitExitFullscreen?.();
    };

    el.addEventListener("waiting", onWaiting);
    el.addEventListener("stalled", onWaiting);
    el.addEventListener("playing", onReady);
    el.addEventListener("canplay", onReady);
    el.addEventListener("progress", onProgress);
    el.addEventListener("loadedmetadata", onProgress);
    el.addEventListener("webkitbeginfullscreen", blockNativePlayer);
    el.addEventListener("dblclick", blockNativePlayer);

    return () => {
      el.removeEventListener("waiting", onWaiting);
      el.removeEventListener("stalled", onWaiting);
      el.removeEventListener("playing", onReady);
      el.removeEventListener("canplay", onReady);
      el.removeEventListener("progress", onProgress);
      el.removeEventListener("loadedmetadata", onProgress);
      el.removeEventListener("webkitbeginfullscreen", blockNativePlayer);
      el.removeEventListener("dblclick", blockNativePlayer);
      el.pause();
    };
  }, [src]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !playing) return;
    let id = 0;
    const tick = () => {
      const d = el.duration;
      if (d && Number.isFinite(d) && d > 0) {
        setPlayed(Math.min(1, el.currentTime / d));
        const buf = el.buffered;
        if (buf.length) setBuffered(Math.min(1, buf.end(buf.length - 1) / d));
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [playing]);

  return (
    <>
      <video
        ref={ref}
        className="reel-video"
        src={src}
        poster={poster}
        muted
        playsInline
        loop
        controls={false}
        disablePictureInPicture
        preload={playing ? "auto" : "metadata"}
      />
      <div className={`reel-progress${waiting && played < 0.02 ? " is-wait" : ""}`} aria-hidden>
        <span className="reel-progress-buf" style={{ transform: `scaleX(${buffered})` }} />
        <span className="reel-progress-play" style={{ transform: `scaleX(${played})` }} />
        <span className="reel-progress-load" />
      </div>
    </>
  );
}
