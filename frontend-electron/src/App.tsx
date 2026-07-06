import { ApiClient, BillGenProvider, Spinner } from "@billgen/ui";
import { useEffect, useState } from "react";

import { DesktopShell } from "./DesktopShell";
import { createApi } from "./lib/api";

type BootState =
  | { status: "connecting" }
  | { status: "ready"; api: ApiClient }
  | { status: "error"; message: string };

export function App() {
  const [boot, setBoot] = useState<BootState>({ status: "connecting" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const api = await createApi();
        await api.desktopBootstrap(); // local single-user session
        if (!cancelled) setBoot({ status: "ready", api });
      } catch (error) {
        if (!cancelled) {
          setBoot({
            status: "error",
            message: error instanceof Error ? error.message : "Startup failed",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (boot.status === "connecting") {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
        <Spinner label="Starting BillGen…" />
      </div>
    );
  }

  if (boot.status === "error") {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
        <div role="alert" style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: "1.2rem" }}>Could not start BillGen</h1>
          <p style={{ color: "#b42318" }}>{boot.message}</p>
          <p style={{ color: "#4b5a6b", fontSize: "0.9rem" }}>
            The local service did not respond. Try relaunching the app.
          </p>
        </div>
      </div>
    );
  }

  return (
    <BillGenProvider client={boot.api}>
      <DesktopShell />
    </BillGenProvider>
  );
}
