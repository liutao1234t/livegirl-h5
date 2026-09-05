/** Keep clips inside the WebView. iOS otherwise hijacks double-tap into the system player. */
export function armInlineVideo(video: HTMLVideoElement) {
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.controls = false;
  video.disablePictureInPicture = true;
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "");
  video.setAttribute("muted", "");
  video.setAttribute("controlslist", "nofullscreen nodownload noremoteplayback");
  video.setAttribute("disablepictureinpicture", "");
  video.setAttribute("x-webkit-airplay", "deny");
}

export function setMediaMuted(video: HTMLVideoElement, muted: boolean) {
  video.muted = muted;
  video.defaultMuted = muted;
  if (muted) video.setAttribute("muted", "");
  else video.removeAttribute("muted");
}

export function isUsableVideoUrl(url: string | undefined | null): boolean {
  const value = url?.trim() ?? "";
  if (!value) return false;
  try {
    const parsed = new URL(value, typeof window !== "undefined" ? window.location.origin : "https://local.invalid");
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
