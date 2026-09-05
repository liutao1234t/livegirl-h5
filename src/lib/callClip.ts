import { armInlineVideo } from "./media";

const HAVE_CURRENT_DATA = 2;

type ClipSession = {
  url: string;
  video: HTMLVideoElement;
  abort: AbortController;
  ready: boolean;
  whenReady: Promise<void>;
};

let session: ClipSession | null = null;
let retainAcrossNav = false;
let releaseTimer: number | undefined;

function cancelReleaseTimer() {
  if (typeof window === "undefined") return;
  window.clearTimeout(releaseTimer);
  releaseTimer = undefined;
}

export function isCallClipFrameReady(video: HTMLVideoElement) {
  return video.videoWidth > 0 && video.readyState >= HAVE_CURRENT_DATA;
}

function armVideo(video: HTMLVideoElement) {
  armInlineVideo(video);
  video.preload = "auto";
}

function waitForFirstFrame(video: HTMLVideoElement, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    let settled = false;

    const succeed = () => {
      if (settled || !isCallClipFrameReady(video)) return;
      settled = true;
      cleanup();
      video.pause();
      resolve();
    };

    const fail = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error("call-clip"));
    };

    const onAbort = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new DOMException("Aborted", "AbortError"));
    };

    const cleanup = () => {
      video.removeEventListener("loadeddata", succeed);
      video.removeEventListener("loadedmetadata", succeed);
      video.removeEventListener("canplay", succeed);
      video.removeEventListener("playing", succeed);
      video.removeEventListener("timeupdate", succeed);
      video.removeEventListener("error", fail);
      signal.removeEventListener("abort", onAbort);
    };

    video.addEventListener("loadeddata", succeed);
    video.addEventListener("loadedmetadata", succeed);
    video.addEventListener("canplay", succeed);
    video.addEventListener("playing", succeed);
    video.addEventListener("timeupdate", succeed);
    video.addEventListener("error", fail);
    signal.addEventListener("abort", onAbort);

    if (typeof video.requestVideoFrameCallback === "function") {
      video.requestVideoFrameCallback(() => succeed());
    }

    succeed();
    void video.play().catch(() => undefined);
  });
}

function destroySession() {
  cancelReleaseTimer();
  if (!session) return;
  session.abort.abort();
  const { video } = session;
  video.pause();
  video.removeAttribute("src");
  video.load();
  video.remove();
  session = null;
  retainAcrossNav = false;
}

export function primeCallClip(url: string, handlers: { onFirstFrame?: () => void; onError?: () => void } = {}) {
  retainAcrossNav = false;

  if (session?.url === url) {
    if (session.ready) handlers.onFirstFrame?.();
    else {
      void session.whenReady.then(() => handlers.onFirstFrame?.()).catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        handlers.onError?.();
      });
    }
    return () => {
      if (!retainAcrossNav) destroySession();
    };
  }

  destroySession();

  const video = document.createElement("video");
  armVideo(video);
  video.className = "call-clip-warm";
  video.setAttribute("aria-hidden", "true");
  video.src = url;
  document.body.appendChild(video);

  const abort = new AbortController();
  const next: ClipSession = {
    url,
    video,
    abort,
    ready: false,
    whenReady: waitForFirstFrame(video, abort.signal).then(() => {
      if (session === next) next.ready = true;
    }),
  };
  session = next;

  void next.whenReady.then(() => handlers.onFirstFrame?.()).catch((err) => {
    if (err instanceof DOMException && err.name === "AbortError") return;
    handlers.onError?.();
  });

  return () => {
    if (!retainAcrossNav) destroySession();
  };
}

export function nudgeCallClipPlay() {
  if (!session) return;
  void session.video.play().catch(() => undefined);
}

export function isCallClipPrimed(url: string) {
  return Boolean(session && session.url === url && session.ready);
}

export function retainCallClip() {
  retainAcrossNav = true;
}

export function attachCallClip(host: HTMLElement, url: string) {
  let video: HTMLVideoElement;
  if (session?.url === url) {
    video = session.video;
  } else {
    destroySession();
    video = document.createElement("video");
    armVideo(video);
    video.src = url;
    session = {
      url,
      video,
      abort: new AbortController(),
      ready: false,
      whenReady: Promise.resolve(),
    };
  }
  video.className = "";
  video.removeAttribute("aria-hidden");
  host.appendChild(video);
  return video;
}

export function releaseCallClip(opts?: { afterMs?: number }) {
  const afterMs = opts?.afterMs ?? 0;
  cancelReleaseTimer();
  if (afterMs <= 0) {
    destroySession();
    return;
  }
  const current = session;
  if (!current) return;
  current.video.pause();
  releaseTimer = window.setTimeout(() => {
    releaseTimer = undefined;
    if (session === current) destroySession();
  }, afterMs);
}
