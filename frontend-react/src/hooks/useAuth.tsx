import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

import type { LoginRequest, SignupRequest } from "../types";
import { useApi } from "../providers/BillGenProvider";

export interface Session {
  userId: string;
  email: string;
  displayName: string;
  organizationId: string;
  role: string;
}

interface AuthContextValue {
  session: Session | null;
  signup(body: SignupRequest): Promise<Session>;
  login(body: LoginRequest): Promise<Session>;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return value;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const api = useApi();
  const [session, setSession] = useState<Session | null>(null);

  const signup = useCallback(
    async (body: SignupRequest) => {
      const result = await api.signup(body);
      const next: Session = {
        userId: result.user_id,
        email: result.email,
        displayName: result.display_name,
        organizationId: result.organization_id,
        role: "owner",
      };
      setSession(next);
      return next;
    },
    [api],
  );

  const login = useCallback(
    async (body: LoginRequest) => {
      const result = await api.login(body);
      const next: Session = {
        userId: result.user_id,
        email: result.email,
        displayName: result.display_name,
        organizationId: result.organization_id,
        role: result.role,
      };
      setSession(next);
      return next;
    },
    [api],
  );

  const logout = useCallback(async () => {
    await api.logout();
    setSession(null);
  }, [api]);

  return (
    <AuthContext.Provider value={{ session, signup, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
