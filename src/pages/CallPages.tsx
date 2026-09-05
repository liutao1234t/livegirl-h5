import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getGirl } from "../data/girls";
import {
  attachCallClip,
  isCallClipFrameReady,
  isCallClipPrimed,
  nudgeCallClipPlay,
  primeCallClip,
  releaseCallClip,
  retainCallClip,
} from "../lib/callClip";
import { isUsableVideoUrl, setMediaMuted } from "../lib/media";
import { CALL_INSUFFICIENT_TOAST, canPlaceCall, formatCallRate, FREE_CALL_ENDS, FREE_CALL_SEC, openCoinShop, showCallPaywall, useCallRate } from "../lib/paywall";
import { armCameraPreview, requestFrontCamera, stopFrontCamera } from "../lib/userCamera";
import { HANGUP_EXIT_MS } from "../shells/navMotion";
import { FullscreenShell } from "../shells/Shells";
import { cancelEndCallPop, formatCallClock, scheduleEndCallPop, useAppStore } from "../store/appStore";
import { dismissIncoming, ignoreNextProfileView, useIncomingCallStore } from "../store/incomingCallStore";
import { publicUrl } from "../lib/publicUrl";

const UNAVAILABLE_MS = 10_000;
const CONNECT_HOLD_MS = 6_000;

function msUntil(deadline: number) {
  return Math.max(0, deadline - Date.now());
}

export function OutgoingCallPage() {
  const { id = "isabella" } = useParams();
  const girl = getGirl(id);
  const navigate = useNavigate();
  const callRate = useCallRate(girl.ratePerMin);
  const [unavailable, setUnavailable] = useState(false);
  const enteredRef = useRef(false);
  const startedAt = useRef(Date.now());
  const failTimer = useRef<number | undefined>(undefined);
  const holdTimer = useRef<number | undefined>(undefined);
  const clip = girl.videoUrl?.trim() ?? "";
  const hasClip = isUsableVideoUrl(clip);
  const alreadyCalled = useAppStore((s) => (s.calledGirlIds ?? []).includes(girl.id));
  const canConnect = hasClip && !alreadyCalled;

  useEffect(() => {
    enteredRef.current = false;
    setUnavailable(false);
    startedAt.current = Date.now();
    window.clearTimeout(failTimer.current);
    window.clearTimeout(holdTimer.current);
    failTimer.current = undefined;
    holdTimer.current = undefined;

    const clearTimers = () => {
      window.clearTimeout(failTimer.current);
      window.clearTimeout(holdTimer.current);
      failTimer.current = undefined;
      holdTimer.current = undefined;
    };

    if (!canConnect) {
      failTimer.current = window.setTimeout(() => setUnavailable(true), UNAVAILABLE_MS);
      return clearTimers;
    }

    const holdUntil = Date.now() + CONNECT_HOLD_MS;

    const goInCall = () => {
      if (enteredRef.current) return;
      enteredRef.current = true;
      clearTimers();
      retainCallClip();
      navigate(`/call/in/${id}`, { replace: true });
    };

    const stop = primeCallClip(clip, {
      onFirstFrame: () => {
        if (enteredRef.current) return;
        window.clearTimeout(failTimer.current);
        failTimer.current = undefined;
        const wait = msUntil(holdUntil);
        if (wait <= 0) {
          goInCall();
          return;
        }
        window.clearTimeout(holdTimer.current);
        holdTimer.current = window.setTimeout(goInCall, wait);
      },
      onError: () => {
        if (enteredRef.current || failTimer.current != null) return;
        const wait = Math.max(0, UNAVAILABLE_MS - (Date.now() - startedAt.current));
        failTimer.current = window.setTimeout(() => setUnavailable(true), wait);
      },
    });

    return () => {
      clearTimers();
      stop();
    };
  }, [canConnect, clip, id, navigate]);

  return (
    <FullscreenShell>
      <div className="call-screen">
        <img className="bg blur" src={girl.photo} alt="" />
        <div className="veil" />
        <div className="call-center">
          <div className="pulse-avatar">
            <img src={girl.id === "isabella" ? publicUrl("/images/calling-portrait.png") : girl.photo} alt="" />
          </div>
          <div className="encrypt">
            <span className="icon-box" style={{ width: 10, height: 12 }}>
              <img className="icon" src={publicUrl("/icons/lock.svg")} alt="" />
            </span>
            End-to-End Encrypted
          </div>
          <h1>{girl.name}</h1>
          <p className="status">Calling...</p>
          <p className="rate">
            <span className="icon-box" style={{ width: 12, height: 11 }}>
              <img className="icon" src={publicUrl("/icons/call-rate.png")} alt="" />
            </span>
            {formatCallRate(callRate)}
          </p>
          <div className="call-actions">
            <div className="call-hang-stack">
              {unavailable ? (
                <p className="call-unavailable" role="status">
                  The other party is currently unavailable.
                </p>
              ) : null}
              <button
                className="hang press"
                type="button"
                aria-label="Cancel"
                onClick={() => {
                  stopFrontCamera();
                  navigate(-1);
                }}
              >
                <span className="icon-box" style={{ width: 34, height: 13 }}>
                  <img className="icon" src={publicUrl("/icons/hangup.svg")} alt="" />
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </FullscreenShell>
  );
}

export function IncomingCallPage({ girlId }: { girlId?: string } = {}) {
  const { id: routeId = "isabella" } = useParams();
  const id = girlId ?? routeId;
  const hosts = useIncomingCallStore((s) => s.hosts);
  const refreshHosts = useIncomingCallStore((s) => s.refreshHosts);
  const girl = hosts.find((h) => h.id === id) ?? getGirl(id);
  const navigate = useNavigate();
  const location = useLocation();
  const callRate = useCallRate(girl.ratePerMin);
  const [accepted, setAccepted] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const enteredRef = useRef(false);
  const leavingRef = useRef(false);
  const acceptedRef = useRef(false);
  const clipFailedRef = useRef(false);
  const startedAt = useRef(Date.now());
  const holdUntil = useRef(0);
  const failTimer = useRef<number | undefined>(undefined);
  const holdTimer = useRef<number | undefined>(undefined);
  const portrait = girl.photo || publicUrl("/images/incoming-portrait.png");
  const clip = girl.videoUrl?.trim() ?? "";
  const hasClip = isUsableVideoUrl(clip);
  const alreadyCalled = useAppStore((s) => (s.calledGirlIds ?? []).includes(girl.id));
  const resolved = girl.id === id;
  const canConnect = resolved && hasClip && !alreadyCalled;

  useEffect(() => {
    void refreshHosts();
  }, [refreshHosts]);

  const enterInCall = () => {
    if (enteredRef.current || leavingRef.current) return;
    enteredRef.current = true;
    window.clearTimeout(failTimer.current);
    window.clearTimeout(holdTimer.current);
    failTimer.current = undefined;
    holdTimer.current = undefined;
    retainCallClip();
    dismissIncoming({ instant: true });
    navigate(`/call/in/${id}`, { replace: location.pathname.startsWith("/call/") });
  };
  const enterInCallRef = useRef(enterInCall);
  enterInCallRef.current = enterInCall;

  const scheduleEnterInCall = () => {
    if (enteredRef.current || leavingRef.current) return;
    window.clearTimeout(failTimer.current);
    window.clearTimeout(holdTimer.current);
    failTimer.current = undefined;
    const wait = msUntil(holdUntil.current || Date.now() + CONNECT_HOLD_MS);
    if (wait <= 0) {
      enterInCallRef.current();
      return;
    }
    holdTimer.current = window.setTimeout(() => enterInCallRef.current(), wait);
  };
  const scheduleEnterInCallRef = useRef(scheduleEnterInCall);
  scheduleEnterInCallRef.current = scheduleEnterInCall;

  const revealUnavailable = () => {
    if (enteredRef.current || failTimer.current != null) return;
    const wait = Math.max(0, UNAVAILABLE_MS - (Date.now() - startedAt.current));
    failTimer.current = window.setTimeout(() => setUnavailable(true), wait);
  };

  useEffect(() => {
    enteredRef.current = false;
    leavingRef.current = false;
    acceptedRef.current = false;
    clipFailedRef.current = false;
    setAccepted(false);
    setUnavailable(false);
    window.clearTimeout(failTimer.current);
    window.clearTimeout(holdTimer.current);
    failTimer.current = undefined;
    holdTimer.current = undefined;
    return () => {
      window.clearTimeout(failTimer.current);
      window.clearTimeout(holdTimer.current);
    };
  }, [id]);

  useEffect(() => {
    if (!canConnect) return;

    const stop = primeCallClip(clip, {
      onFirstFrame: () => {
        if (acceptedRef.current) scheduleEnterInCallRef.current();
      },
      onError: () => {
        clipFailedRef.current = true;
        if (acceptedRef.current) revealUnavailable();
      },
    });

    return stop;
  }, [canConnect, clip]);

  const leaveIncoming = () => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    window.clearTimeout(failTimer.current);
    window.clearTimeout(holdTimer.current);
    failTimer.current = undefined;
    holdTimer.current = undefined;
    stopFrontCamera();
    dismissIncoming();
    if (location.pathname.startsWith("/call/incoming/")) navigate(-1);
  };

  const onAccept = () => {
    if (accepted || enteredRef.current || leavingRef.current || !resolved) return;
    if (!canPlaceCall(girl.ratePerMin, girl.videoUrl)) {
      dismissIncoming();
      showCallPaywall(navigate);
      return;
    }
    acceptedRef.current = true;
    startedAt.current = Date.now();
    holdUntil.current = Date.now() + CONNECT_HOLD_MS;
    void requestFrontCamera();
    setAccepted(true);
    nudgeCallClipPlay();
    if (canConnect && isCallClipPrimed(clip)) {
      scheduleEnterInCall();
      return;
    }
    if (!canConnect || clipFailedRef.current) {
      failTimer.current = window.setTimeout(() => setUnavailable(true), UNAVAILABLE_MS);
    }
  };

  return (
    <FullscreenShell>
      <div className="call-screen">
        <img className="bg blur" src={portrait} alt="" />
        <div className="veil" />
        <div className="call-center">
          <div className="pulse-avatar">
            <img src={portrait} alt="" />
          </div>
          <div className="encrypt">
            <span className="icon-box" style={{ width: 10, height: 12 }}>
              <img className="icon" src={publicUrl("/icons/lock.svg")} alt="" />
            </span>
            End-to-End Encrypted
          </div>
          <h1>{girl.name}</h1>
          <p className="status is-in">{accepted ? "Connecting..." : "Incoming Video Call..."}</p>
          <p className="rate">
            <span className="icon-box" style={{ width: 12, height: 11 }}>
              <img className="icon" src={publicUrl("/icons/call-rate.png")} alt="" />
            </span>
            {formatCallRate(callRate)}
          </p>
          <div className="call-actions">
            {accepted ? (
              <div className="call-hang-stack">
                {unavailable ? (
                  <p className="call-unavailable" role="status">
                    The other party is currently unavailable.
                  </p>
                ) : null}
                <button className="hang press" type="button" aria-label="Decline" onClick={leaveIncoming}>
                  <span className="icon-box" style={{ width: 34, height: 13 }}>
                    <img className="icon" src={publicUrl("/icons/hangup.svg")} alt="" />
                  </span>
                </button>
              </div>
            ) : (
              <>
                <div className="lbl">
                  <button className="hang press" type="button" aria-label="Decline" onClick={leaveIncoming}>
                    <span className="icon-box" style={{ width: 34, height: 13 }}>
                      <img className="icon" src={publicUrl("/icons/hangup.svg")} alt="" />
                    </span>
                  </button>
                  Decline
                </div>
                <div className="lbl accept-lbl">
                  <div className="accept-beat">
                    <button className="accept press" type="button" aria-label="Accept" onClick={onAccept}>
                      <span className="icon-box" style={{ width: 30, height: 24 }}>
                        <img className="icon" src={publicUrl("/icons/accept-video.svg")} alt="" />
                      </span>
                    </button>
                  </div>
                  Accept
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </FullscreenShell>
  );
}

export function InCallPage() {
  const { id = "isabella" } = useParams();
  const hosts = useIncomingCallStore((s) => s.hosts);
  const girl = hosts.find((h) => h.id === id) ?? getGirl(id);
  const navigate = useNavigate();
  const coins = useAppStore((s) => s.coins);
  const beginCall = useAppStore((s) => s.beginCall);
  const chargeCallTick = useAppStore((s) => s.chargeCallTick);
  const finishCall = useAppStore((s) => s.finishCall);
  const openOverlay = useAppStore((s) => s.openOverlay);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pipRef = useRef<HTMLVideoElement>(null);
  const startedAt = useRef(Date.now());
  const endedRef = useRef(false);
  const tickRef = useRef<number | undefined>(undefined);
  const [elapsed, setElapsed] = useState(0);
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [cameraLive, setCameraLive] = useState(false);
  const [clipReady, setClipReady] = useState(false);
  const clip = girl.videoUrl?.trim() || publicUrl("/media/call.mp4");
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const hangUp = (reason: "user" | "insufficient" | "freeEnd" = "user") => {
    if (endedRef.current) return;
    endedRef.current = true;
    if (tickRef.current != null) {
      window.clearInterval(tickRef.current);
      tickRef.current = undefined;
    }
    releaseCallClip({ afterMs: HANGUP_EXIT_MS + 80 });
    stopFrontCamera();
    const durationSec = Math.max(0, Math.floor((Date.now() - startedAt.current) / 1000));
    finishCall(girl.id, durationSec, `Video With ${girl.name}`);
    ignoreNextProfileView(girl.id);
    useAppStore.getState().closeOverlay();
    const leave = { replace: true as const, state: { hangupExit: true } };
    if (reason === "freeEnd") {
      useAppStore.getState().showToast(FREE_CALL_ENDS);
      navigate(`/profile/${girl.id}`, leave);
      return;
    }
    if (reason === "insufficient") {
      useAppStore.getState().showToast(CALL_INSUFFICIENT_TOAST);
      navigate(`/profile/${girl.id}`, leave);
      return;
    }
    navigate(`/profile/${girl.id}`, leave);
    scheduleEndCallPop(girl.id);
  };
  const hangUpRef = useRef(hangUp);
  hangUpRef.current = hangUp;

  useEffect(() => {
    endedRef.current = false;
    cancelEndCallPop();
  }, [girl.id]);

  useEffect(() => {
    if (endedRef.current) return;
    if (!beginCall(girl.id, girl.ratePerMin, girl.videoUrl)) {
      endedRef.current = true;
      releaseCallClip();
      stopFrontCamera();
      ignoreNextProfileView(girl.id);
      useAppStore.getState().closeOverlay();
      useAppStore.getState().showToast(CALL_INSUFFICIENT_TOAST);
      navigate(`/profile/${girl.id}`, { replace: true, state: { hangupExit: true } });
      return;
    }
    const started = useAppStore.getState().activeCall?.startedAt ?? Date.now();
    const isFree = Boolean(useAppStore.getState().activeCall?.isFree);
    startedAt.current = started;
    const initialSec = Math.max(0, Math.floor((Date.now() - started) / 1000));
    setElapsed(initialSec);
    if (isFree && initialSec >= FREE_CALL_SEC) {
      hangUpRef.current("freeEnd");
      return;
    }

    tickRef.current = window.setInterval(() => {
      if (endedRef.current) return;
      const sec = Math.max(0, Math.floor((Date.now() - started) / 1000));
      setElapsed(sec);
      if (isFree) {
        if (sec >= FREE_CALL_SEC) hangUpRef.current("freeEnd");
        return;
      }
      if (!chargeCallTick(sec)) hangUpRef.current("insufficient");
    }, 1000);

    return () => {
      if (tickRef.current != null) {
        window.clearInterval(tickRef.current);
        tickRef.current = undefined;
      }
    };
  }, [girl.id, girl.ratePerMin, girl.videoUrl, beginCall, chargeCallTick, navigate]);

  const hostRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const video = attachCallClip(host, clip);
    videoRef.current = video;
    setMediaMuted(video, mutedRef.current);
    const markReady = () => setClipReady(true);
    const onEnded = () => {
      if (!Number.isFinite(video.duration) || video.duration <= 0) return;
      if (video.currentTime + 0.05 < video.duration) return;
      hangUpRef.current("user");
    };
    const onError = () => {
      video.style.display = "none";
    };
    const keepPlaying = () => {
      if (endedRef.current || video.ended) return;
      void video.play().catch(() => undefined);
    };
    if (isCallClipFrameReady(video)) markReady();
    video.addEventListener("playing", markReady);
    video.addEventListener("ended", onEnded);
    video.addEventListener("error", onError);
    video.addEventListener("pause", keepPlaying);
    void video.play().catch(() => undefined);
    return () => {
      video.removeEventListener("playing", markReady);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("error", onError);
      video.removeEventListener("pause", keepPlaying);
      videoRef.current = null;
    };
  }, [clip]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    setMediaMuted(el, muted);
    if (!muted) void el.play().catch(() => undefined);
  }, [muted]);

  useEffect(() => {
    const pip = pipRef.current;
    if (!cameraOn) {
      stopFrontCamera();
      if (pip) pip.srcObject = null;
      setCameraLive(false);
      return;
    }

    let cancelled = false;
    void requestFrontCamera().then((media) => {
      if (cancelled) return;
      if (!media || !pip) {
        setCameraLive(false);
        return;
      }
      armCameraPreview(pip);
      pip.srcObject = media;
      void pip.play().then(() => {
        if (!cancelled) setCameraLive(true);
      }).catch(() => {
        if (!cancelled) setCameraLive(false);
      });
    });

    return () => {
      cancelled = true;
    };
  }, [cameraOn]);

  useEffect(() => () => stopFrontCamera(), []);

  return (
    <FullscreenShell>
      <div className="call-screen is-incall">
        <div ref={hostRef} className={`incall-clip ${clipReady ? "is-ready" : ""}`} />
        <div className="incall-hud">
          <div className="hud-pill hud-private">
            <span className="hud-lock" aria-hidden>
              <img className="icon" src={publicUrl("/icons/private.svg")} alt="" />
            </span>
            <span className="hud-private-copy">
              <strong>Private Chat</strong>
              <small>Protecting</small>
            </span>
          </div>
          <div className="hud-pill hud-timer">
            <span className="rec" />
            {formatCallClock(elapsed)}
          </div>
          <button
            className="hud-pill hud-coins press"
            type="button"
            aria-label="Get coins"
            onClick={() => openCoinShop(navigate)}
          >
            <img className="hud-coin" src={publicUrl("/images/coin.png")} alt="" />
            {coins.toLocaleString()}
          </button>
        </div>
        <div className={`pip ${cameraLive && cameraOn ? "is-live" : "is-off"}`}>
          <video ref={pipRef} className="pip-cam" playsInline muted autoPlay />
        </div>
        <div className="incall-bar">
          <button className="glass-btn press" type="button" aria-label={muted ? "Unmute" : "Mute"} onClick={() => setMuted((v) => !v)}>
            <img className="icon" src={muted ? publicUrl("/icons/mic-off.svg") : publicUrl("/icons/mic.svg")} alt="" />
          </button>
          <button
            className="glass-btn press"
            type="button"
            aria-label={cameraOn ? "Turn camera off" : "Turn camera on"}
            onClick={() => setCameraOn((v) => !v)}
          >
            <img className="icon" src={cameraOn ? publicUrl("/icons/camera.svg") : publicUrl("/icons/camera-off.svg")} alt="" />
          </button>
          <button className="hang incall-hang press" type="button" aria-label="End call" onClick={() => hangUp("user")}>
            <img className="icon" src={publicUrl("/icons/hangup-phone.svg")} alt="" />
          </button>
          <button className="glass-btn press" type="button" aria-label="Gift" onClick={() => openOverlay("gift", id)}>
            <img className="icon" src={publicUrl("/icons/gift.svg")} alt="" />
          </button>
        </div>
      </div>
    </FullscreenShell>
  );
}
