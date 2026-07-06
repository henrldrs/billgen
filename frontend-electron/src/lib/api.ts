/** Desktop API wiring. The sidecar port is assigned at runtime by the Rust
 *  shell and read via the `api_base_url` Tauri command. Falls back to a fixed
 *  dev URL when running under plain `vite` (browser) without the shell. */

import { ApiClient, MemoryTokenStore } from "@billgen/ui";

async function tauriInvoke<T>(cmd: string): Promise<T | null> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<T>(cmd);
  } catch {
    // not running inside the Tauri shell
    return null;
  }
}

async function resolveBaseUrl(): Promise<string> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const url = await tauriInvoke<string | null>("api_base_url");
    if (url) return url;
    // brief wait while the Rust side spawns the sidecar and learns the port
    await new Promise((resolve) => setTimeout(resolve, 200));
    if (attempt === 0 && url === null) break; // not in Tauri at all → use fallback
  }
  return (import.meta.env.VITE_API_URL as string | undefined) ?? "http://127.0.0.1:8000";
}

export const tokenStore = new MemoryTokenStore();

export async function createApi(): Promise<ApiClient> {
  const baseUrl = await resolveBaseUrl();
  return new ApiClient({ baseUrl, tokens: tokenStore });
}
