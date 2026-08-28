/** Shell session: bootstraps from persisted tokens on reload (GET /users/me),
 *  exposes login/signup/logout. The kit's AuthProvider only covers in-memory
 *  flows; persistence across reloads is a shell concern. */

import type { LoginRequest, SignupRequest } from "@billgen/ui";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { api, tokenStore } from "../lib/api";

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  organizationId: string;
  role: string;
  /** The interface language this person chose, or null if they never have.
   *  Null is meaningful: it means "follow the company", not "prefers French". */
  language: string | null;
}

type SessionStatus = "loading" | "anonymous" | "authenticated";

interface SessionContextValue {
  status: SessionStatus;
  user: SessionUser | null;
  login(body: LoginRequest): Promise<void>;
  signup(body: SignupRequest): Promise<void>;
  logout(): Promise<void>;
  /** Dev only — see devBootstrap below. Absent from a production build. */
  devBootstrap(): Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside <SessionProvider>");
  return value;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!tokenStore.getAccess() && !tokenStore.getRefresh()) {
      setStatus("anonymous");
      return;
    }
    api
      .me()
      .then((me) => {
        if (cancelled) return;
        setUser({
          id: me.id,
          email: me.email,
          displayName: me.display_name,
          organizationId: me.organization_id,
          role: me.role,
          language: me.language ?? null,
        });
        setStatus("authenticated");
      })
      .catch(() => {
        if (cancelled) return;
        tokenStore.clear();
        setStatus("anonymous");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (body: LoginRequest) => {
    const result = await api.login(body);
    setUser({
      id: result.user_id,
      email: result.email,
      displayName: result.display_name,
      organizationId: result.organization_id,
      role: result.role,
      //  Login does not return it; `/users/me` fills it in on the next load.
      //  Until then the provider falls back to the company default.
      language: null,
    });
    setStatus("authenticated");
  }, []);

  const signup = useCallback(async (body: SignupRequest) => {
    const result = await api.signup(body);
    setUser({
      id: result.user_id,
      email: result.email,
      displayName: result.display_name,
      organizationId: result.organization_id,
      role: "owner",
      //  A new account has chosen nothing yet, so the provider falls back to
      //  the company default and then the browser.
      language: null,
    });
    setStatus("authenticated");
  }, []);

  /**
   * Sign in with no credentials, against a local API started with
   * DESKTOP_MODE=true. This is not a back door bolted on for convenience: it
   * calls POST /auth/desktop-bootstrap, which is the desktop build's real
   * login path, and which the API 404s unless desktop_mode is set. Hosting it
   * is impossible by construction — api/config.py raises ConfigurationError
   * on a production start with desktop_mode=true (tests/api/test_config_guards.py).
   *
   * The `import.meta.env.DEV` guard at the call site is a second, independent
   * lock: Vite statically replaces it with `false` in a production build, so
   * the button below is tree-shaken out of the shipped bundle entirely.
   */
  const devBootstrap = useCallback(async () => {
    const result = await api.desktopBootstrap();
    setUser({
      id: result.user_id,
      email: result.email,
      displayName: result.display_name,
      organizationId: result.organization_id,
      role: result.role,
      //  Login does not return it; `/users/me` fills it in on the next load.
      //  Until then the provider falls back to the company default.
      language: null,
    });
    setStatus("authenticated");
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
      setStatus("anonymous");
    }
  }, []);

  return (
    <SessionContext.Provider
      value={{ status, user, login, signup, logout, devBootstrap }}
    >
      {children}
    </SessionContext.Provider>
  );
}
