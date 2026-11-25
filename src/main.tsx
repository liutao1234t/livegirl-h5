import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { applyDocumentLocale, prepareLocale } from "./i18n";
import { blockNativeSelect } from "./lib/blockNativeSelect";
import { installNativeIapBridge } from "./lib/nativeIap";
import "./styles.css";

applyDocumentLocale();
blockNativeSelect();
installNativeIapBridge();

// A slow language chunk must not hold the Continue button indefinitely.
void Promise.race([
  prepareLocale(),
  new Promise<void>((resolve) => window.setTimeout(resolve, 1200)),
]).then(() => createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
));
