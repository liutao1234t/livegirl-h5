import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/appStore";
import { FullscreenShell } from "../shells/Shells";
import { publicUrl } from "../lib/publicUrl";

const SPLASH_LOADING_MS = 1000;

export function SplashPage() {
  const navigate = useNavigate();
  const startSession = useAppStore((s) => s.startSession);
  const [entering, setEntering] = useState(false);

  useEffect(() => {
    if (!entering) return;
    const t = window.setTimeout(() => {
      startSession();
      navigate("/app/home", { replace: true });
    }, SPLASH_LOADING_MS);
    return () => window.clearTimeout(t);
  }, [entering, startSession, navigate]);

  return (
    <FullscreenShell>
      <div className="splash">
        <div className="splash-bg">
          <img src={publicUrl("/images/splash-bg.png")} alt="" />
        </div>
        <div className="splash-body">
          <h1>
            Connect with the
            <br />
            World
          </h1>
          <p className="lead">
            Experience premium 1-on-1 video chats. Meet fascinating people in an exclusive, high-end digital LiveGirl designed for genuine connection.
          </p>
          <button
            className="btn-primary press"
            type="button"
            disabled={entering}
            aria-busy={entering}
            onClick={() => setEntering(true)}
          >
            Get Started
            <span className="icon-box" style={{ width: 16, height: 16 }}>
              <img className="icon" src={publicUrl("/icons/arrow.svg")} alt="" />
            </span>
          </button>
          <p className="legal">
            By continuing, you agree to our{" "}
            <button type="button" onClick={() => navigate("/legal/terms")}>
              Terms of Use
            </button>
            ,{" "}
            <button type="button" onClick={() => navigate("/legal/privacy")}>
              Privacy Policy
            </button>
            , and{" "}
            <button type="button" onClick={() => navigate("/legal/license")}>
              User License Agreement
            </button>
            .
          </p>
        </div>
        {entering ? (
          <div className="splash-loading" role="status" aria-live="polite" aria-label="Loading">
            <span className="pay-spinner" />
          </div>
        ) : null}
      </div>
    </FullscreenShell>
  );
}
