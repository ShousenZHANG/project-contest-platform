/**
 * ProtectedRoute — guards routes that require authentication.
 *
 * Usage A (wrap a single child):
 *   <ProtectedRoute roles={["Organizer"]}>
 *     <OrganizerPage />
 *   </ProtectedRoute>
 *
 * Usage B (route layout — renders nested routes via <Outlet />):
 *   <Route element={<ProtectedRoute roles={["Admin"]} />}>
 *     <Route path="/foo" element={<Foo />} />
 *   </Route>
 *
 * Unauthenticated users are redirected to /login.
 * Authenticated users without the required role are redirected to /.
 */

import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && roles.length > 0) {
    // Compared case-insensitively on purpose. The database stores TitleCase
    // ("Participant"), the OAuth paths pass uppercase, and every backend role
    // check uses equalsIgnoreCase. An exact match here would bounce the user to
    // the homepage with no error shown, which is close to impossible to debug
    // from the outside.
    const allowed = roles.some((r) => r.toLowerCase() === String(user?.role ?? '').toLowerCase());
    if (!allowed) {
      return <Navigate to="/" replace />;
    }
  }

  return children ?? <Outlet />;
}

export default ProtectedRoute;
