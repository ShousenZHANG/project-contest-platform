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
 * Authenticated app shell: sidebar, topbar, and main content.
 * Mobile: sidebar collapses to a Sheet handled inside Sidebar.
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
      <Sidebar role={role} userEmail={userEmail} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar role={role} userName={userName} userEmail={userEmail} userAvatar={userAvatar} />
        <main
          id="main"
          className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6 lg:p-8"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
