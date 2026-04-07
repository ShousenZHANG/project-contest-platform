/**
 * ProtectedRoute — guards routes that require authentication.
 *
 * Usage:
 *   <ProtectedRoute>          — any authenticated user
 *     <MyPage />
 *   </ProtectedRoute>
 *
 *   <ProtectedRoute roles={["Organizer", "Admin"]}>
 *     <OrganizerPage />
 *   </ProtectedRoute>
 *
 * Unauthenticated users are redirected to /login.
 * Authenticated users without the required role are redirected to /.
 */

import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && roles.length > 0 && user) {
    const userRole = user.role;
    if (!roles.includes(userRole)) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
}

export default ProtectedRoute;
