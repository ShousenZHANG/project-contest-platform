/**
 * @file Sidebar.jsx
 * @description
 * Admin sidebar navigation. Migrated from MUI/CSS to shadcn/ui + Tailwind.
 * Highlights the active route, gates clicks behind an auth token check, and
 * routes admins to Dashboard, Profile, Account Management, and Competitions.
 *
 * Role: Admin
 * Developer: Zhaoyi Yang
 */

import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, User, Users, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

const NAV_ITEMS = [
  { to: '/AdminDashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/AdminProfile', label: 'Profile', icon: User },
  { to: '/AdminAccountManage', label: 'Accounts', icon: Users },
  { to: '/AllCompetitions', label: 'Competitions', icon: Trophy },
];

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavigate = (event, to) => {
    event.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('You are not authorized. Please log in first.');
      return;
    }
    navigate(to);
  };

  return (
    <aside
      className="sticky top-0 hidden h-screen w-56 flex-col border-r border-border bg-card md:flex"
      aria-label="Admin navigation"
    >
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Trophy className="h-4 w-4" />
        </div>
        <span className="text-sm font-semibold tracking-tight">Admin Console</span>
      </div>

      <nav className="flex-1 space-y-0.5 p-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.to);
          return (
            <a
              key={item.to}
              href={item.to}
              onClick={(e) => handleNavigate(e, item.to)}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </a>
          );
        })}
      </nav>
    </aside>
  );
}

export default Sidebar;
