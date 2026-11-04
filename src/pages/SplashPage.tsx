import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/appStore";
import { FullscreenShell } from "../shells/Shells";
import { clearLiveHubReturn, hasPendingLiveHubReturn } from "../lib/liveHubReturn";
import { LANDING_POSTER, mountLandingVideo } from "../lib/landingMedia";

export function SplashPage() {
  const navigate = useNavigate();
  const startSession = useAppStore((s) => s.startSession);
  const seenSplash = useAppStore((s) => s.seenSplash);
  const livehubReturn = new URLSearchParams(window.location.search).get("livehub") === "1";
  const [recoverHome] = useState(hasPendingLiveHubReturn);
  const [leaving, setLeaving] = useState(false);
  const [live, setLive] = useState(false);
  const bgRef = useRef<HTMLDivElement>(null);

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
          <img src={LANDING_POSTER} alt="" />
        </div>
        <div className="splash-body">
          <h1>
            <span className="splash-copy splash-copy-1">
              Connect with the
              <br />
              World
            </span>
          </h1>
          <p className="lead">
            <span className="splash-copy splash-copy-2">
              Experience premium 1-on-1 video chats. Meet fascinating people in an exclusive, high-end digital LiveGirl designed for genuine connection.
            </span>
          </p>
          <div className="splash-cta">
            <button className="btn-primary press" type="button" disabled={leaving} onClick={onContinue}>
              Continue
            </button>
          </div>
        </div>
      </div>
    </FullscreenShell>
  );
}
