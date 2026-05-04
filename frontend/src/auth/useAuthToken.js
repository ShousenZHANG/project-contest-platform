import { useCallback } from 'react';
import AuthTokenManager from './authTokenManager';

/**
 * Hook to interact with the auth token layer.
 * Components should use this instead of direct localStorage access.
 */
export function useAuthToken() {
  const setSession = useCallback((sessionData) => {
    AuthTokenManager.setSession(sessionData);
  }, []);

  const clearSession = useCallback(() => {
    AuthTokenManager.clearSession();
  }, []);

  return {
    getToken: AuthTokenManager.getToken,
    getUserId: AuthTokenManager.getUserId,
    getEmail: AuthTokenManager.getEmail,
    getRole: AuthTokenManager.getRole,
    getSession: AuthTokenManager.getSession,
    isAuthenticated: AuthTokenManager.isAuthenticated,
    setSession,
    clearSession,
  };
}
