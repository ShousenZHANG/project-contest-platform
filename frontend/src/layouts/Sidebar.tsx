import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Trophy,
  Users,
  FileText,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Award,
  Briefcase,
  ClipboardCheck,
  ShieldCheck,
  Home,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Separator } from '../components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/contests', label: 'Browse Contests', icon: Trophy },
  // Participant
  { to: '/my-competitions', label: 'My Competitions', icon: Briefcase, roles: ['PARTICIPANT'] },
  { to: '/my-submissions', label: 'My Submissions', icon: FileText, roles: ['PARTICIPANT'] },
  // Organizer
  { to: '/organizer/dashboard', label: 'Dashboard', icon: BarChart3, roles: ['ORGANIZER'] },
  { to: '/organizer/contests', label: 'My Contests', icon: Trophy, roles: ['ORGANIZER'] },
  { to: '/organizer/judges', label: 'Judges', icon: Users, roles: ['ORGANIZER'] },
  // Judge
  { to: '/judge/scoring', label: 'Scoring Queue', icon: ClipboardCheck, roles: ['JUDGE'] },
  { to: '/judge/winners', label: 'Winners', icon: Award, roles: ['JUDGE'] },
  // Admin
  { to: '/admin/users', label: 'Users', icon: Users, roles: ['ADMIN'] },
  { to: '/admin/dashboard', label: 'Admin Dashboard', icon: ShieldCheck, roles: ['ADMIN'] },
];

interface SidebarProps {
  role?: string;
}

export function Sidebar({ role }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role || ''));

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'sticky top-0 hidden h-screen flex-col border-r bg-card transition-all duration-200 md:flex',
          collapsed ? 'w-16' : 'w-60'
        )}
        aria-label="Primary navigation"
      >
        {/* Brand */}
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Trophy className="h-4 w-4" />
          </div>
          {!collapsed && (
            <span className="text-sm font-semibold tracking-tight">Compete</span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 p-2">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const link = (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground',
                    collapsed && 'justify-center px-2'
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            );

            return collapsed ? (
              <Tooltip key={item.to}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            ) : (
              link
            );
          })}
        </nav>

        <Separator />

        {/* Footer */}
        <div className="p-2">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground',
                collapsed && 'justify-center px-2'
              )
            }
          >
            <Settings className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Settings</span>}
          </NavLink>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed((c) => !c)}
            className="mt-1 w-full"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
