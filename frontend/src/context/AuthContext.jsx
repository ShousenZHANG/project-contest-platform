/**
 * AuthContext centralizes authentication state for the React tree.
 *
 * Provides:
 *   - user: { userId, email, role } | null
 *   - token: string | null
 *   - login(): persist auth data and update state
 *   - logout(): clear auth data and update state
 *   - isAuthenticated: boolean convenience flag
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AuthTokenManager from "@/auth/authTokenManager";

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

function readSessionState() {
  const session = AuthTokenManager.getSession();
  return {
    token: session.token,
    user: sessionToUser(session),
  };
}

export function AuthProvider({ children }) {
  const [state, setState] = useState(readSessionState);

  useEffect(() => {
    return AuthTokenManager.subscribe(() => {
      setState(readSessionState());
    });
  }, []);

  const login = useCallback(({ userId, email, role, accessToken }) => {
    AuthTokenManager.setSession({
      token: accessToken,
      userId,
      email,
      role,
    });
    setState(readSessionState());
  }, []);

  const logout = useCallback(() => {
    AuthTokenManager.clearSession();
    setState(readSessionState());
  }, []);

  const value = useMemo(
    () => ({
      user: state.user,
      token: state.token,
      isAuthenticated: Boolean(state.token),
      login,
      logout,
    }),
    [state.user, state.token, login, logout]
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
