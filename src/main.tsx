import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { applyDocumentLocale, prepareLocale } from "./i18n";
import { blockNativeSelect } from "./lib/blockNativeSelect";
import { installNativeIapBridge } from "./lib/nativeIap";

applyDocumentLocale();
blockNativeSelect();
installNativeIapBridge();

// The inline shell stays interactive while the non-blocking app stylesheet loads.
const stylesheet = document.getElementById("app-styles") as HTMLLinkElement | null;
const stylesReady = !stylesheet || stylesheet.media === "all" ? Promise.resolve() : new Promise<void>((resolve) => {
  stylesheet.addEventListener("load", () => resolve(), { once: true });
});
void Promise.all([
  stylesReady,
  Promise.race([
    prepareLocale(),
    new Promise<void>((resolve) => window.setTimeout(resolve, 1200)),
  ]),
]).then(() => createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
));
