import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import { applyTheme, storedTheme } from "@billgen/ui";
import "./styles.css";

// Apply the persisted theme before first paint so the window doesn't flash light.
applyTheme(storedTheme());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
