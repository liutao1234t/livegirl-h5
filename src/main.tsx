import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { blockNativeSelect } from "./lib/blockNativeSelect";
import { bootstrapFirebase } from "./lib/firebase";
import { installNativeIapBridge } from "./lib/nativeIap";
import "./styles.css";

blockNativeSelect();
installNativeIapBridge();
void bootstrapFirebase();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
