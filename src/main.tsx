import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { applyDocumentLocale } from "./i18n";
import { blockNativeSelect } from "./lib/blockNativeSelect";
import { warmLandingMedia } from "./lib/landingMedia";
import { installNativeIapBridge } from "./lib/nativeIap";
import "./styles.css";

applyDocumentLocale();
blockNativeSelect();
installNativeIapBridge();
warmLandingMedia();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
