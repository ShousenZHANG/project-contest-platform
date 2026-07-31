import React from 'react';
import { Outlet } from 'react-router-dom';
import PageTransition from './PageTransition';

/**
 * PublicLayout — minimal wrapper for unauthenticated routes (no sidebar).
 * Per-page hero/topbar markup is owned by the route itself.
 *
 * The skip link and the #main landmark live here rather than in each page,
 * because a keyboard visitor needs them on every public route and AppShell
 * already provides the same pair for authenticated ones.
 */
export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <PageTransition>
        <main id="main">
          <Outlet />
        </main>
      </PageTransition>
    </div>
  );
}
