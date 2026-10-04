/**
 * AuthContext centralizes authentication state for the React tree.
 *
 * Provides:
 *   - user: { userId, email, role } | null
 *   - token: string | null
 *   - login(): persist auth data and update state
 *   - logout(): revoke the current token and clear the local session immediately
 *   - isAuthenticated: boolean convenience flag
 */

import React, { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import AuthTokenManager from "@/auth/authTokenManager";
import { userService } from '../services/userService';

const AuthContext = createContext(null);

function sessionToUser(session) {
  if (session.token && session.userId) {
    return {
      userId: session.userId,
      email: session.email,
      role: session.role,
    };
  }
  return null;
}

export function AuthProvider({ children }) {
  const session = useSyncExternalStore(
    AuthTokenManager.subscribe,
    AuthTokenManager.getSession,
    AuthTokenManager.getSession
  );

  const login = useCallback(({ userId, email, role, accessToken }) => {
    AuthTokenManager.setSession({
      token: accessToken,
      userId,
      email,
      role,
    });
  }, []);

  const logout = useCallback(() => {
    const revocation = AuthTokenManager.isAuthenticated()
      ? userService.logout().catch(() => undefined)
      : Promise.resolve();
    // Clear now, even when the server is unreachable. The request retains the
    // captured token, and its eventual completion cannot clear a newer session.
    AuthTokenManager.clearSession();
    return revocation;
  }, []);

  const value = useMemo(
    () => ({
      user: sessionToUser(session),
      token: session.token,
      isAuthenticated: Boolean(session.token),
      login,
      logout,
    }),
    [session, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}

export default AuthContext;
