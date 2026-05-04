import React from 'react';
import { Outlet } from 'react-router-dom';
import { AppShell } from './AppShell';
import { useAuth } from '../context/AuthContext';

/**
 * Route layout that renders the AppShell (sidebar + topbar) around any nested
 * routes. Pulls user identity from AuthContext.
 *
 * Usage:
 *   <Route element={<ProtectedRoute><AuthenticatedShell /></ProtectedRoute>}>
 *     <Route path="..." element={<Page />} />
 *   </Route>
 */
export default function AuthenticatedShell() {
  const { user } = useAuth();
  return (
    <AppShell role={user?.role} userEmail={user?.email}>
      <Outlet />
    </AppShell>
  );
}
