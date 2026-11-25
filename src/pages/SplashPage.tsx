import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/appStore";
import { FullscreenShell } from "../shells/Shells";
import { clearLiveHubReturn, hasPendingLiveHubReturn } from "../lib/liveHubReturn";
import { LANDING_POSTER, mountLandingVideo } from "../lib/landingMedia";
import { t } from "../i18n";

export function SplashPage() {
  const navigate = useNavigate();
  const startSession = useAppStore((s) => s.startSession);
  const seenSplash = useAppStore((s) => s.seenSplash);
  const livehubReturn = new URLSearchParams(window.location.search).get("livehub") === "1";
  const [recoverHome] = useState(hasPendingLiveHubReturn);
  const [leaving, setLeaving] = useState(false);
  const [posterReady, setPosterReady] = useState(false);
  const [live, setLive] = useState(false);
  const bgRef = useRef<HTMLDivElement>(null);
  const posterRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const image = posterRef.current;
    if (image?.complete && image.naturalWidth > 0) setPosterReady(true);
  }, []);

  useEffect(() => {
    if (seenSplash && recoverHome) {
      clearLiveHubReturn();
      navigate("/app/home", { replace: true });
      return;
    }
    if (!seenSplash || !livehubReturn) return;
    void startSession();
    navigate("/app/home?livehub=1", { replace: true });
  }, [seenSplash, livehubReturn, recoverHome, navigate, startSession]);

  useEffect(() => {
    const host = bgRef.current;
    if (!host || (seenSplash && (livehubReturn || recoverHome))) return;
    return mountLandingVideo(host, () => setLive(true));
  }, [seenSplash, livehubReturn, recoverHome]);

  useEffect(() => {
    if (!live) return;
    // Warm the next screen only after the landing video has presented a frame.
    const timer = window.setTimeout(() => {
      void import("./HomePage").catch(() => undefined);
    }, 600);
    return () => window.clearTimeout(timer);
  }, [live]);

  const onContinue = () => {
    if (leaving) return;
    setLeaving(true);
    void startSession();
    navigate(livehubReturn ? "/app/home?livehub=1" : "/app/home", { replace: true });
  };

  if (seenSplash && (livehubReturn || recoverHome)) return null;

  return (
    <FullscreenShell>
      <div className="splash">
        <div ref={bgRef} className={`splash-bg${live ? " is-live" : ""}`} aria-hidden>
          <div className={`startup-placeholder${posterReady || live ? " is-loaded" : ""}`} />
          <img
            ref={posterRef}
            src={LANDING_POSTER}
            alt=""
            className={posterReady ? "is-ready" : ""}
            onLoad={() => setPosterReady(true)}
          />
        </div>
        <div className="splash-body">
          <h1>
            <span className="splash-copy splash-copy-1">
              {t("splash.line1")}
              <br />
              {t("splash.line2")}
            </span>
          </h1>
          <p className="lead">
            <span className="splash-copy splash-copy-2">
              {t("splash.lead")}
            </span>
          </p>
          <div className="splash-cta">
            <button className="btn-primary press" type="button" disabled={leaving} onClick={onContinue}>
              {t("splash.continue")}
            </button>
          </div>
        </div>
      </div>
    </FullscreenShell>
  );
}
