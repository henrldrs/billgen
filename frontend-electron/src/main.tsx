import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import { applyStoredAppearance, applyTheme, storedTheme } from "@billgen/ui";
import "./styles.css";

// Apply the persisted theme and appearance before first paint so the window
// doesn't flash light, comfortable and blurred at someone who chose otherwise.
applyTheme(storedTheme());
applyStoredAppearance();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
