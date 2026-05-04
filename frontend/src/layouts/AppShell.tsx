import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

interface AppShellProps {
  children: ReactNode;
  role?: string;
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
}

/**
 * Authenticated app shell — sidebar + topbar + main content.
 * Mobile: sidebar collapses to a Sheet (handled inside Sidebar).
 *
 * Wrap protected routes:
 *   <AppShell role={user.role}><Outlet /></AppShell>
 */
export function AppShell({ children, role, userName, userEmail, userAvatar }: AppShellProps) {
  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <Sidebar role={role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar userName={userName} userEmail={userEmail} userAvatar={userAvatar} />
        <main id="main" className="flex-1 overflow-auto p-4 md:p-6 lg:p-8" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
