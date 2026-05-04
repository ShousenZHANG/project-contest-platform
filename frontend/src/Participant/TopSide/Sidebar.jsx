/**
 * Sidebar.jsx
 *
 * Participant sidebar navigation. Migrated to Tailwind + lucide icons.
 *
 * Role: Participant
 * Developer: Beiqi Dai
 */

import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { User, Trophy, Users, FolderKanban, Star, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

function Sidebar() {
  const location = useLocation();
  const [activePath, setActivePath] = useState(location.pathname);
  const email = localStorage.getItem('email');

  const handleLinkClick = (event, path) => {
    const token = localStorage.getItem('token');
    if (!token) {
      event.preventDefault();
      toast.error('You are not authorized. Please log in first.');
      return;
    }
    setActivePath(path);
  };

  const linkClass = (active) =>
    cn(
      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
      active
        ? 'bg-primary text-primary-foreground'
        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
    );

  const items = [
    { to: `/profile/${email}`, prefix: '/profile', label: 'Profile', Icon: User },
    { to: `/contest/${email}`, prefix: '/contest', label: 'Contest', Icon: Trophy },
    { to: `/teams/${email}`, prefix: '/teams', label: 'Team', Icon: Users },
    { to: `/project/${email}`, prefix: '/project', label: 'Project', Icon: FolderKanban },
    { to: `/rating/${email}`, prefix: '/rating', label: 'Rating', Icon: Star },
  ];

  return (
    <aside className="flex h-full w-56 flex-col border-r border-border bg-card p-3">
      <nav className="flex flex-col gap-1">
        {items.map(({ to, prefix, label, Icon }) => (
          <NavLink
            key={prefix}
            to={to}
            onClick={(e) => handleLinkClick(e, to)}
            className={({ isActive }) =>
              linkClass(isActive || activePath.startsWith(prefix))
            }
          >
            <Icon className="h-4 w-4" />
            <span className="flex-1">{label}</span>
            {activePath.startsWith(prefix) && <ChevronRight className="h-3 w-3" />}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
