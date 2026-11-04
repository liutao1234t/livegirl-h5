// The iOS shell reloads the entry URL when WebKit restarts its content process.
const key = "livehub-home-return-until";

export function rememberLiveHubReturn() {
  localStorage.setItem(key, String(Date.now() + 15_000));
}

export function hasPendingLiveHubReturn() {
  return Number(localStorage.getItem(key)) > Date.now();
}

export function clearLiveHubReturn() {
  localStorage.removeItem(key);
}
