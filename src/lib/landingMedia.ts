import { armInlineVideo } from "./media";
import { publicUrl } from "./publicUrl";

export const LANDING_POSTER = publicUrl("/images/splash-poster.jpg");
export const LANDING_VIDEO = publicUrl("/videos/landing.mp4");

let clip: HTMLVideoElement | null = null;
let parking: HTMLDivElement | null = null;

function ensureParking() {
  if (parking || typeof document === "undefined") return parking;
  parking = document.createElement("div");
  parking.setAttribute("aria-hidden", "true");
  parking.style.cssText = "position:fixed;width:1px;height:1px;opacity:0;overflow:hidden;pointer-events:none;";
  document.body.appendChild(parking);
  return parking;
}

function ensureClip() {
  if (clip) return clip;
  clip = document.createElement("video");
  clip.className = "splash-clip";
  clip.setAttribute("aria-hidden", "true");
  armInlineVideo(clip);
  clip.loop = true;
  clip.autoplay = true;
  clip.preload = "auto";
  clip.poster = LANDING_POSTER;
  clip.src = LANDING_VIDEO;
  clip.load();
  void clip.play().catch(() => undefined);
  ensureParking()?.appendChild(clip);
  return clip;
}

export function warmLandingMedia() {
  if (typeof document === "undefined") return;
  const img = new Image();
  img.src = LANDING_POSTER;
  ensureClip();
}

export function isLandingFrameReady(video: HTMLVideoElement) {
  return video.videoWidth > 0 && video.readyState >= 2;
}

export function mountLandingVideo(host: HTMLElement, onReady: () => void) {
  const video = ensureClip();
  const mark = () => {
    if (isLandingFrameReady(video)) onReady();
  };
  video.addEventListener("loadeddata", mark);
  video.addEventListener("canplay", mark);
  video.addEventListener("playing", mark);
  host.appendChild(video);
  void video.play().catch(() => undefined);
  mark();
  return () => {
    video.removeEventListener("loadeddata", mark);
    video.removeEventListener("canplay", mark);
    video.removeEventListener("playing", mark);
    ensureParking()?.appendChild(video);
  };
}
