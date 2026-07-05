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
}

type SessionStatus = "loading" | "anonymous" | "authenticated";

interface SessionContextValue {
  status: SessionStatus;
  user: SessionUser | null;
  login(body: LoginRequest): Promise<void>;
  signup(body: SignupRequest): Promise<void>;
  logout(): Promise<void>;
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
    <SessionContext.Provider value={{ status, user, login, signup, logout }}>
      {children}
    </SessionContext.Provider>
  );
}
