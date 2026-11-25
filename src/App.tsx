import { useEffect } from "react";
import { BrowserRouter, useLocation, useNavigate } from "react-router-dom";
import { useKeyboardInset } from "./hooks/useKeyboardInset";
import { applyDocumentLocale, prepareLocale, useActiveLocale, useLocaleStore } from "./i18n";
import { NavStage } from "./shells/NavStage";
import { OverlayHost } from "./shells/OverlayHost";
import { useAppStore } from "./store/appStore";
import { useHostsStore } from "./store/hostsStore";
import { IncomingCallLayer } from "./shells/IncomingCallLayer";
import { IncomingCallGate, startIncomingCallDispatch } from "./store/incomingCallStore";
import { startSayHiDispatch, useSayHiStore } from "./store/sayHiStore";

export function App() {
  const uiLocale = useActiveLocale();
  useKeyboardInset();
  useEffect(() => {
    applyDocumentLocale();
    let active = true;
    void prepareLocale(uiLocale).then(() => {
      if (active) useLocaleStore.setState((s) => ({ revision: s.revision + 1 }));
    });
    return () => { active = false; };
  }, [uiLocale]);

  const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, "") || undefined;

  return (
    <BrowserRouter basename={routerBasename}>
      <StartupTasks />
      <div className="app-root">
        <NavStage />
        <IncomingCallLayer />
        <OverlayHost />
        <IncomingCallGate />
      </div>
    </BrowserRouter>
  );
}

// Keep catalog requests and dispatchers away from the landing video's first frame.
function StartupTasks() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (document.documentElement.dataset.bootContinue !== "1") return;
    delete document.documentElement.dataset.bootContinue;
    void useAppStore.getState().startSession();
    const livehubReturn = new URLSearchParams(window.location.search).get("livehub") === "1";
    navigate(livehubReturn ? "/app/home?livehub=1" : "/app/home", { replace: true });
  }, [navigate]);
  const inApp = pathname !== "/";
  useEffect(() => {
    if (!inApp) return;
    const timer = window.setTimeout(() => {
      void useHostsStore.getState().refreshHosts().then(() => {
        useSayHiStore.getState().ensureOnlineNow();
      });
      startSayHiDispatch();
      startIncomingCallDispatch();
    }, 400);
    return () => window.clearTimeout(timer);
  }, [inApp]);
  return null;
}
