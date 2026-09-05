import { useLayoutEffect } from "react";

function pinWindow() {
  if (window.scrollX || window.scrollY) window.scrollTo(0, 0);
  if (document.documentElement.scrollTop) document.documentElement.scrollTop = 0;
  if (document.body.scrollTop) document.body.scrollTop = 0;
}

function applyViewport() {
  pinWindow();
  const root = document.documentElement;
  const vv = window.visualViewport;
  if (!vv) {
    root.style.removeProperty("--vv-top");
    root.style.removeProperty("--vv-height");
    root.classList.remove("is-keyboard");
    return;
  }

  root.style.setProperty("--vv-top", `${Math.max(0, vv.offsetTop)}px`);
  root.style.setProperty("--vv-height", `${Math.max(0, vv.height)}px`);
  const occluded = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
  root.classList.toggle("is-keyboard", occluded > 48);
}

function keepFieldVisible() {
  const target = document.activeElement;
  if (!(target instanceof HTMLElement)) return;
  if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") return;

  let parent = target.parentElement;
  while (parent && parent !== document.body) {
    const style = window.getComputedStyle(parent);
    const scrollable =
      parent.scrollHeight > parent.clientHeight + 1 &&
      (style.overflowY === "auto" || style.overflowY === "scroll");
    if (scrollable) {
      const rect = target.getBoundingClientRect();
      const box = parent.getBoundingClientRect();
      if (rect.bottom > box.bottom) parent.scrollTop += rect.bottom - box.bottom + 16;
      else if (rect.top < box.top) parent.scrollTop -= box.top - rect.top + 16;
      return;
    }
    parent = parent.parentElement;
  }
}

/** Keep the app in the visual viewport so the keyboard overlays instead of shoving the whole page. */
export function useKeyboardInset() {
  useLayoutEffect(() => {
    const vv = window.visualViewport;
    let raf = 0;
    const sync = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(applyViewport);
    };

    const onFocus = () => {
      sync();
      requestAnimationFrame(keepFieldVisible);
    };

    applyViewport();
    vv?.addEventListener("resize", sync);
    vv?.addEventListener("scroll", sync);
    window.addEventListener("focusin", onFocus);
    window.addEventListener("focusout", sync);
    window.addEventListener("scroll", sync, true);

    return () => {
      cancelAnimationFrame(raf);
      vv?.removeEventListener("resize", sync);
      vv?.removeEventListener("scroll", sync);
      window.removeEventListener("focusin", onFocus);
      window.removeEventListener("focusout", sync);
      window.removeEventListener("scroll", sync, true);
      const root = document.documentElement;
      root.style.removeProperty("--vv-top");
      root.style.removeProperty("--vv-height");
      root.classList.remove("is-keyboard");
    };
  }, []);
}
