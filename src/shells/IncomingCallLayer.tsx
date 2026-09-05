import { useEffect, useLayoutEffect, useState, type AnimationEvent } from "react";
import { useLocation } from "react-router-dom";
import { IncomingCallPage } from "../pages/CallPages";
import { consumeSkipIncomingExit, useIncomingCallStore } from "../store/incomingCallStore";

const EXIT_MS = 450;

export function IncomingCallLayer() {
  const ringingGirlId = useIncomingCallStore((s) => s.ringingGirlId);
  const location = useLocation();
  const [shownId, setShownId] = useState<string | null>(null);
  const [phase, setPhase] = useState<"in" | "out">("in");

  useLayoutEffect(() => {
    if (ringingGirlId) {
      setShownId(ringingGirlId);
      setPhase("in");
      return;
    }
    if (!shownId) return;
    if (consumeSkipIncomingExit() || location.pathname.startsWith("/call/") || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShownId(null);
      return;
    }
    setPhase("out");
  }, [ringingGirlId, shownId, location.pathname]);

  useEffect(() => {
    if (phase !== "out" || !shownId) return;
    const t = window.setTimeout(() => setShownId(null), EXIT_MS);
    return () => window.clearTimeout(t);
  }, [phase, shownId]);

  const onAnimEnd = (e: AnimationEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (phase !== "out") return;
    if (e.animationName !== "nav-out-right") return;
    setShownId(null);
  };

  if (!shownId) return null;

  return (
    <div className={`incoming-layer is-${phase}`} key={shownId} onAnimationEnd={onAnimEnd}>
      <IncomingCallPage girlId={shownId} />
    </div>
  );
}
