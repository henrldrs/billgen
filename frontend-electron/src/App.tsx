import { ApiClient, BillGenProvider, ErrorState, LoadingScreen } from "@billgen/ui";
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
        <LoadingScreen label="Starting BillGen…" />
      </div>
    );
  }

  if (boot.status === "error") {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
        <ErrorState
          title="Could not start BillGen"
          description={`${boot.message} — the local service did not respond. Try relaunching the app.`}
        />
      </div>
    );
  }

  return (
    <BillGenProvider client={boot.api}>
      <DesktopShell />
    </BillGenProvider>
  );
}
