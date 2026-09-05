import { useAppStore } from "../store/appStore";

export const APP_STORE_URL = "https://apps.apple.com/app/id6758287054";
export const APP_STORE_REVIEW_URL =
  "https://itunes.apple.com/app/id6758287054?mt=8&action=write-review";

function isShareAbort(err: unknown) {
  return err instanceof DOMException && err.name === "AbortError";
}

async function copyAppLink() {
  try {
    await navigator.clipboard.writeText(APP_STORE_URL);
    useAppStore.getState().showToast("Link copied");
  } catch {
    /* still usable without a share target */
  }
}

/** WKWebView / Safari: Web Share API → system share sheet. Needs a secure context. */
export function shareAppDownload() {
  if (typeof navigator.share === "function") {
    void navigator.share({ title: "LiveGirl", url: APP_STORE_URL }).catch((err) => {
      if (isShareAbort(err)) return;
      void copyAppLink();
    });
    return;
  }
  void copyAppLink();
}
