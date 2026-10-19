import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/appStore";
import { FullscreenShell } from "../shells/Shells";
import { publicUrl } from "../lib/publicUrl";
import { armInlineVideo } from "../lib/media";

const SPLASH_LEAVE_MS = 400;
const LANDING_POSTER = publicUrl("/images/splash-poster.jpg");
const LANDING_VIDEO = publicUrl("/videos/landing.mp4");

export function SplashPage() {
  const navigate = useNavigate();
  const startSession = useAppStore((s) => s.startSession);
  const [entering, setEntering] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    armInlineVideo(video);
    video.loop = true;
    video.preload = "auto";
    const play = () => {
      void video.play().catch(() => undefined);
    };
    play();
    video.addEventListener("canplay", play);
    video.addEventListener("loadeddata", play);
    return () => {
      video.removeEventListener("canplay", play);
      video.removeEventListener("loadeddata", play);
      video.pause();
    };
  }, []);

  useEffect(() => {
    if (!entering) return;
    let cancelled = false;
    void (async () => {
      const waitLeave = new Promise<void>((r) => window.setTimeout(r, SPLASH_LEAVE_MS));
      await Promise.all([startSession(), waitLeave]);
      if (cancelled) return;
      navigate("/app/home", { replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [entering, startSession, navigate]);

  return (
    <FullscreenShell>
      <div className={`splash${entering ? " is-leaving" : ""}`}>
        <div className="splash-bg" aria-hidden>
          <img src={LANDING_POSTER} alt="" />
          <video
            ref={videoRef}
            src={LANDING_VIDEO}
            poster={LANDING_POSTER}
            muted
            playsInline
            loop
            autoPlay
            preload="auto"
            disablePictureInPicture
            controls={false}
          />
        </div>
        <div className="splash-veil" aria-hidden />
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
            <button
              className="btn-primary press"
              type="button"
              disabled={entering}
              aria-busy={entering}
              onClick={() => setEntering(true)}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </FullscreenShell>
  );
}
