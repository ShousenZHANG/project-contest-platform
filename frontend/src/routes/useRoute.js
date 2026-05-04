import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';
import { ROUTES } from './routeManifest';
import AuthTokenManager from '../auth/authTokenManager';

/**
 * Hook for type-safe route navigation using the route manifest.
 *
 * Usage:
 *   const route = useRoute();
 *   route.go('ORGANIZER_PROFILE', { email: 'user@example.com' });
 *   route.href('PUBLIC_CONTEST_DETAIL', { id: '123' })  // → '/publiccontest-detail/123'
 *   route.isAllowed('ADMIN_DASHBOARD')                  // → false if not Admin
 */
export function useRoute() {
  const navigate = useNavigate();

  const buildPath = useCallback((key, params = {}) => {
    const entry = ROUTES[key];
    if (!entry) throw new Error(`Unknown route key: ${key}`);
    return Object.entries(params).reduce(
      (path, [k, v]) => path.replace(`:${k}`, encodeURIComponent(String(v))),
      entry.path
    );
  }, []);

  const go = useCallback((key, params = {}, options = {}) => {
    navigate(buildPath(key, params), options);
  }, [navigate, buildPath]);

  const href = useCallback((key, params = {}) => buildPath(key, params), [buildPath]);

  const isAllowed = useCallback((key) => {
    const entry = ROUTES[key];
    if (!entry) return false;
    if (entry.roles.length === 0) return true;
    const role = AuthTokenManager.getRole();
    return entry.roles.includes(role);
  }, []);

  return { go, href, isAllowed, ROUTES };
}
