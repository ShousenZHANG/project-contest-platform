/**
 * AuthContext — centralised authentication state.
 *
 * Provides:
 *   - user     : { userId, email, role } | null
 *   - token    : string | null
 *   - login()  : persist auth data and update state
 *   - logout() : clear auth data and navigate to /login
 *   - isAuthenticated : boolean convenience flag
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

const AuthContext = createContext(null);

function readStoredUser() {
  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");
  const email = localStorage.getItem("email");
  const role = localStorage.getItem("role");
  if (token && userId) {
    return { userId, email, role };
  }
  return null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  const [token, setToken] = useState(() => localStorage.getItem("token"));

  const login = useCallback(({ userId, email, role, accessToken }) => {
    localStorage.setItem("token", accessToken);
    localStorage.setItem("userId", userId);
    localStorage.setItem("email", email);
    localStorage.setItem("role", role);
    setToken(accessToken);
    setUser({ userId, email, role });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("email");
    localStorage.removeItem("role");
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: !!token,
      login,
      logout,
    }),
    [user, token, login, logout]
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
