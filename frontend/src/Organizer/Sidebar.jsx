/**
 * @file Sidebar.jsx
 * @description
 * Sidebar navigation for Organizer role. Migrated from raw CSS to Tailwind.
 * Uses shadcn primitives for consistency.
 */

import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, User, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import AuthTokenManager from '@/auth/authTokenManager';


function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activePath, setActivePath] = useState(location.pathname);
  const email = AuthTokenManager.getEmail();

  const handleLinkClick = (event, path) => {
    const token = AuthTokenManager.getToken();
    if (!token) {
      event.preventDefault();
      toast.error('You are not authorized. Please log in first.');
      return;
    }
    setActivePath(path);
  };

  const handleProfileClick = (event) => {
    event.preventDefault();
    const token = AuthTokenManager.getToken();
    if (!token) {
      toast.error('You are not authorized. Please log in first.');
      return;
    }
    if (email) {
      navigate(`/OrganizerProfile/${email}`);
      setActivePath(`/OrganizerProfile/${email}`);
    }
  };

  const linkClass = (active) =>
    cn(
      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
      active
        ? 'bg-primary text-primary-foreground'
        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
    );

  return (
    <aside className="flex h-full w-56 flex-col border-r border-border bg-card p-3">
      <nav className="flex flex-col gap-1">
        <NavLink
          to={`/OrganizerDashboard/${email}`}
          onClick={(e) => handleLinkClick(e, `/OrganizerDashboard/${email}`)}
          className={({ isActive }) =>
            linkClass(isActive || activePath.startsWith('/OrganizerDashboard'))
          }
        >
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </NavLink>

        <a
          href={`/OrganizerProfile/${email}`}
          onClick={handleProfileClick}
          className={linkClass(activePath.startsWith('/OrganizerProfile'))}
        >
          <User className="h-4 w-4" />
          Profile
        </a>

        <NavLink
          to={`/OrganizerContestList/${email}`}
          onClick={(e) => handleLinkClick(e, `/OrganizerContestList/${email}`)}
          className={({ isActive }) =>
            linkClass(isActive || activePath.startsWith('/OrganizerContestList'))
          }
        >
          <Trophy className="h-4 w-4" />
          Contests
        </NavLink>
      </nav>
    </aside>
  );
}

export default Sidebar;
