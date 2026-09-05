/** Front-camera preview for the in-call PiP. Local only — never uploaded. */

let epoch = 0;
let stream: MediaStream | null = null;
let inflight: Promise<MediaStream | null> | null = null;

function isLive(media: MediaStream | null) {
  return Boolean(media?.getVideoTracks().some((track) => track.readyState === "live"));
}

function stopStream(media: MediaStream | null) {
  media?.getTracks().forEach((track) => track.stop());
}

async function openStream(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("camera-unavailable");
  }
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: "user" },
    });
  } catch {
    return navigator.mediaDevices.getUserMedia({ audio: false, video: true });
  }
}

export function stopFrontCamera() {
  epoch += 1;
  inflight = null;
  stopStream(stream);
  stream = null;
}

export function requestFrontCamera(): Promise<MediaStream | null> {
  if (isLive(stream)) return Promise.resolve(stream);
  if (inflight) return inflight;

  const myEpoch = epoch;
  inflight = openStream()
    .then((next) => {
      if (epoch !== myEpoch) {
        stopStream(next);
        return null;
      }
      stopStream(stream);
      stream = next;
      return next;
    })
    .catch(() => {
      if (epoch !== myEpoch) return null;
      stream = null;
      return null;
    })
    .finally(() => {
      if (epoch === myEpoch) inflight = null;
    });

  return inflight;
}

export function armCameraPreview(video: HTMLVideoElement) {
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.controls = false;
  video.disablePictureInPicture = true;
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "");
  video.setAttribute("muted", "");
  video.setAttribute("autoplay", "");
}