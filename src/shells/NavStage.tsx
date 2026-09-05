import { useCallback, useEffect, useLayoutEffect, useRef, useState, type AnimationEvent } from "react";
import { useLocation, useNavigationType, type Location } from "react-router-dom";
import { AppRoutes } from "./AppRoutes";
import { decideNavAnim, HANGUP_EXIT_MS, shellKind, type NavAnim, type ShellKind } from "./navMotion";

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function paneClass(kind: ShellKind, extras: string[]) {
  return ["nav-pane", `is-${kind}`, ...extras.filter(Boolean)].join(" ");
}

export function NavStage() {
  const location = useLocation();
  const navType = useNavigationType();
  const reduceMotion = useReducedMotion();
  const locRef = useRef(location);

  const startKind = shellKind(location.pathname);
  const [tabLoc, setTabLoc] = useState<Location | null>(startKind === "tab" ? location : null);
  const [stackLoc, setStackLoc] = useState<Location | null>(startKind === "stack" ? location : null);
  const [stackLeave, setStackLeave] = useState<Location | null>(null);
  const [fullLoc, setFullLoc] = useState<Location | null>(startKind === "full" ? location : null);
  const [anim, setAnim] = useState<NavAnim>("none");
  const [fromKind, setFromKind] = useState<ShellKind>(startKind);

  const stackLocRef = useRef(stackLoc);
  stackLocRef.current = stackLoc;

  const hereKind = shellKind(location.pathname);

  const finish = useCallback(() => {
    setAnim("none");
    setStackLeave(null);
    const here = locRef.current;
    const kind = shellKind(here.pathname);
    if (kind === "tab") {
      setStackLoc(null);
      setFullLoc(null);
    } else if (kind === "stack") {
      setStackLoc(here);
      setFullLoc(null);
    } else {
      setFullLoc(here);
    }
  }, []);

  useLayoutEffect(() => {
    const prev = locRef.current;
    if (prev.key === location.key) return;
    locRef.current = location;
    const from = shellKind(prev.pathname);
    const to = shellKind(location.pathname);
    setFromKind(from);

    if (to === "tab") setTabLoc(location);
    else if (from === "tab") setTabLoc(prev);

    const nextAnim = decideNavAnim(prev.pathname, location.pathname, navType, reduceMotion, location.state);

    if (nextAnim === "none") {
      setAnim("none");
      setStackLeave(null);
      if (to === "tab") {
        setStackLoc(null);
        setFullLoc(null);
      } else if (to === "stack") {
        setStackLoc(location);
        setFullLoc(null);
      } else {
        setFullLoc(location);
      }
      return;
    }

    if (nextAnim === "push") {
      if (from === "stack" && to === "stack") setStackLeave(stackLocRef.current ?? prev);
      setStackLoc(location);
      setAnim("push");
      return;
    }

    if (nextAnim === "pop") {
      if (from === "stack" && to === "stack") {
        setStackLeave(stackLocRef.current ?? prev);
        setStackLoc(location);
      } else if (from === "stack" && to === "tab") {
        setStackLoc(prev);
        setStackLeave(null);
      }
      setAnim("pop");
      return;
    }

    if (nextAnim === "fade-in" || nextAnim === "slide-in-right") {
      setFullLoc(location);
      setAnim(nextAnim);
      return;
    }

    setFullLoc(prev);
    if (to === "stack") setStackLoc(location);
    setAnim(nextAnim);
  }, [location, navType, reduceMotion]);

  useEffect(() => {
    if (anim === "none") return;
    const t = window.setTimeout(finish, anim === "hangup" ? HANGUP_EXIT_MS + 50 : 450);
    return () => window.clearTimeout(t);
  }, [anim, location.key, finish]);

  const onPaneAnimEnd = (e: AnimationEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (
      e.animationName !== "nav-in-right" &&
      e.animationName !== "nav-out-right" &&
      e.animationName !== "nav-in-left" &&
      e.animationName !== "nav-out-left" &&
      e.animationName !== "nav-back" &&
      e.animationName !== "nav-forward" &&
      e.animationName !== "nav-fade-in" &&
      e.animationName !== "nav-fade-out" &&
      e.animationName !== "nav-hangup"
    ) {
      return;
    }
    finish();
  };

  const tabPushBack = anim === "push" && fromKind === "tab";
  const tabPopForward = anim === "pop" && hereKind === "tab";
  const tabCovered = Boolean(stackLoc) && !tabPushBack && !tabPopForward && hereKind !== "tab";

  const tabExtras = [
    tabPushBack ? "is-push-back" : "",
    tabPopForward ? "is-pop-forward" : "",
    !tabPushBack && !tabPopForward && tabCovered ? "is-covered" : "",
  ];

  const stackOnTop = (anim === "push" && hereKind === "stack") || (anim === "pop" && hereKind === "tab");
  const stackExtras = [
    anim === "push" ? "is-push-in" : "",
    anim === "pop" && hereKind === "tab" ? "is-pop-out" : "",
    anim === "pop" && hereKind === "stack" ? "is-pop-forward" : "",
    anim === "hangup" ? "is-hangup-back" : "",
    stackOnTop ? "is-on-top" : "",
  ];

  const leaveExtras = [
    anim === "push" ? "is-push-back" : "",
    anim === "pop" ? "is-pop-out is-on-top" : "",
  ];

  const fullExtras = [
    anim === "fade-in" ? "is-fade-in" : "",
    anim === "fade-out" ? "is-fade-out" : "",
    anim === "hangup" ? "is-hangup" : "",
    anim === "slide-in-right" ? "is-slide-in-right" : "",
    anim === "slide-out-right" ? "is-slide-out-right" : "",
  ];

  const showTab = Boolean(tabLoc);
  const showStack = Boolean(stackLoc);
  const showLeave = Boolean(stackLeave && stackLeave.key !== stackLoc?.key);
  const showFull = Boolean(fullLoc);

  return (
    <div className={`nav-stage${anim !== "none" ? " is-animating" : ""}`}>
      {showTab && tabLoc ? (
        <div
          className={paneClass("tab", tabExtras)}
          aria-hidden={hereKind !== "tab"}
          inert={hereKind !== "tab" ? true : undefined}
          onAnimationEnd={onPaneAnimEnd}
        >
          <AppRoutes location={tabLoc} />
        </div>
      ) : null}

      {showLeave && stackLeave ? (
        <div className={paneClass("stack", leaveExtras)} aria-hidden inert onAnimationEnd={onPaneAnimEnd}>
          <AppRoutes location={stackLeave} />
        </div>
      ) : null}

      {showStack && stackLoc ? (
        <div
          className={paneClass("stack", stackExtras)}
          aria-hidden={hereKind !== "stack"}
          inert={hereKind !== "stack" ? true : undefined}
          onAnimationEnd={onPaneAnimEnd}
        >
          <AppRoutes location={stackLoc} />
        </div>
      ) : null}

      {showFull && fullLoc ? (
        <div
          className={paneClass("full", fullExtras)}
          aria-hidden={hereKind !== "full"}
          inert={hereKind !== "full" ? true : undefined}
          onAnimationEnd={onPaneAnimEnd}
        >
          <AppRoutes location={fullLoc} />
        </div>
      ) : null}
    </div>
  );
}
