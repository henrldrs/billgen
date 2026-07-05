/** Shell-owned API singleton. Token persistence via localStorage lives HERE,
 *  in the shell — the UI kit only sees the TokenStore interface. */

import { ApiClient, type Tokens, type TokenStore } from "@billgen/ui";

const STORAGE_KEY = "billgen.tokens";

export class LocalStorageTokenStore implements TokenStore {
  private read(): Tokens | null {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Tokens) : null;
    } catch {
      return null;
    }
  }

  getAccess(): string | null {
    return this.read()?.access_token ?? null;
  }

  getRefresh(): string | null {
    return this.read()?.refresh_token ?? null;
  }

  set(tokens: Tokens): void {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
  }

  clear(): void {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

export const tokenStore = new LocalStorageTokenStore();

export const api = new ApiClient({
  baseUrl:
    (import.meta.env.VITE_API_URL as string | undefined) ?? "http://127.0.0.1:8000",
  tokens: tokenStore,
  onAuthLost: () => {
    if (!window.location.pathname.startsWith("/login")) {
      window.location.assign("/login");
    }
  },
});
