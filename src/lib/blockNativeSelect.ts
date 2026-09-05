function isEditable(target: EventTarget | null) {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}

function prevent(e: Event) {
  e.preventDefault();
}

/** WKWebView: no long-press callout, no copy/cut. Fields still accept typing. */
export function blockNativeSelect() {
  document.addEventListener("contextmenu", prevent, { capture: true });
  document.addEventListener("copy", prevent, { capture: true });
  document.addEventListener("cut", prevent, { capture: true });
  document.addEventListener("dragstart", prevent, { capture: true });
  document.addEventListener(
    "selectstart",
    (e) => {
      if (isEditable(e.target)) return;
      e.preventDefault();
    },
    { capture: true },
  );
}
