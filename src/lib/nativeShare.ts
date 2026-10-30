import { h5AppleAppId } from "../data/appClient";
import { useAppStore } from "../store/appStore";

export function appStoreUrl() {
  return `https://apps.apple.com/app/id${h5AppleAppId()}`;
}

export function appStoreReviewUrl() {
  return `https://itunes.apple.com/app/id${h5AppleAppId()}?mt=8&action=write-review`;
}

function isShareAbort(err: unknown) {
  return err instanceof DOMException && err.name === "AbortError";
}

async function copyAppLink() {
  try {
    await navigator.clipboard.writeText(appStoreUrl());
    useAppStore.getState().showToast("Link copied");
  } catch {
    /* still usable without a share target */
  }
}

/** WKWebView / Safari: Web Share API → system share sheet. Needs a secure context. */
export function shareAppDownload() {
  if (typeof navigator.share === "function") {
    void navigator.share({ title: "LiveGirl", url: appStoreUrl() }).catch((err) => {
      if (isShareAbort(err)) return;
      void copyAppLink();
    });
    return;
  }
  void copyAppLink();
}
