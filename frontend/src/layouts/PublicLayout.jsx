import React from 'react';
import { Outlet } from 'react-router-dom';

/**
 * PublicLayout — minimal wrapper for unauthenticated routes (no sidebar).
 * Per-page hero/topbar markup is owned by the route itself.
 */
export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Outlet />
    </div>
  );
}
