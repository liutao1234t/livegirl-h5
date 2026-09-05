import type { NavigateFunction } from "react-router-dom";
import { getGirl } from "../data/girls";
import { isUsableVideoUrl } from "./media";
import { billedCallRate, isReward3Active, todayKey, useAppStore } from "../store/appStore";
import { requestFrontCamera } from "./userCamera";

export const NOT_ENOUGH_COINS = "Not enough coins";
export const CALL_INSUFFICIENT_TOAST = "No enough Coins";
export const FREE_CALL_SEC = 15;
export const FREE_CALL_ENDS = "Free call ends.";
export const FREE_REEL_COUNT = 8;

export function isReelLocked(index: number) {
  if (index < FREE_REEL_COUNT) return false;
  return !useAppStore.getState().isVip;
}

export function isDailyFreeCallAvailable(videoUrl?: string | null) {
  if (!isUsableVideoUrl(videoUrl)) return false;
  return useAppStore.getState().lastFreeCallDate !== todayKey();
}

export function callRatePerMin(listRate: number) {
  const { isVip, reward3Until } = useAppStore.getState();
  if (isReward3Active(reward3Until)) return 0;
  return billedCallRate(listRate, isVip);
}

export function useCallRate(listRate: number) {
  const isVip = useAppStore((s) => s.isVip);
  const reward3Until = useAppStore((s) => s.reward3Until);
  if (isReward3Active(reward3Until)) return 0;
  return billedCallRate(listRate, isVip);
}

export function formatCallRate(ratePerMin: number) {
  return ratePerMin > 0 ? `${ratePerMin}/min` : "Free";
}

export function canPlaceCall(ratePerMin: number, videoUrl?: string | null) {
  const rate = callRatePerMin(ratePerMin);
  if (rate <= 0 || useAppStore.getState().coins >= rate) return true;
  return isDailyFreeCallAvailable(videoUrl);
}

export function isInCallRoute() {
  if (typeof window === "undefined") return false;
  return window.location.pathname.startsWith("/call/in/");
}

/** During a video call, coins stay an Overlay so the clip keeps playing. */
export function openCoinShop(navigate: NavigateFunction, opts?: { replace?: boolean }) {
  if (useAppStore.getState().activeCall || isInCallRoute()) {
    useAppStore.getState().openOverlay("coins");
    return;
  }
  useAppStore.getState().closeOverlay();
  navigate("/coins", opts?.replace ? { replace: true } : undefined);
}

export function showCallPaywall(navigate: NavigateFunction, opts?: { replace?: boolean }) {
  const { boughtNewbieOffer, openOverlay, showToast } = useAppStore.getState();
  showToast(NOT_ENOUGH_COINS);
  if (boughtNewbieOffer) navigate("/coins", { replace: opts?.replace });
  else openOverlay("promo");
}

export function tryDial(girlId: string, ratePerMin: number, navigate: NavigateFunction) {
  const girl = getGirl(girlId);
  if (!canPlaceCall(ratePerMin, girl.videoUrl)) {
    showCallPaywall(navigate);
    return false;
  }
  void requestFrontCamera();
  navigate(`/call/outgoing/${girlId}`);
  return true;
}

export function openNewUserOffer(navigate: NavigateFunction) {
  const { boughtNewbieOffer, openOverlay } = useAppStore.getState();
  if (boughtNewbieOffer) navigate("/coins");
  else openOverlay("promo");
}
