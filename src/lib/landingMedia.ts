import { armInlineVideo } from "./media";
import { publicUrl } from "./publicUrl";

export const LANDING_POSTER = publicUrl("/images/splash-poster.jpg");
export const LANDING_VIDEO = publicUrl("/videos/landing.mp4");

export function mountLandingVideo(host: HTMLElement, onReady: () => void) {
  const video = document.createElement("video");
  video.className = "splash-clip";
  video.setAttribute("aria-hidden", "true");
  armInlineVideo(video);
  video.loop = true;
  video.autoplay = true;
  video.preload = "auto";
  video.poster = LANDING_POSTER;
  let disposed = false;
  let revealed = false;
  let frame = 0;
  let raf = 0;
  const reveal = () => {
    if (disposed || revealed) return;
    revealed = true;
    onReady();
  };
  const playing = () => {
    // Older WebViews lack video-frame callbacks. Allow a paint before revealing.
    if (typeof video.requestVideoFrameCallback === "function") return;
    raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        if (!video.paused && video.readyState >= 2) reveal();
      });
    });
  };
  video.addEventListener("playing", playing);
  host.appendChild(video);
  if (typeof video.requestVideoFrameCallback === "function") {
    frame = video.requestVideoFrameCallback(reveal);
  }
  video.src = LANDING_VIDEO;
  void video.play().catch(() => {
    // Keep the poster and Continue button usable when autoplay is unavailable.
  });
  return () => {
    disposed = true;
    video.removeEventListener("playing", playing);
    if (frame) video.cancelVideoFrameCallback(frame);
    cancelAnimationFrame(raf);
    video.pause();
    video.removeAttribute("src");
    video.load();
    video.remove();
  };
}
