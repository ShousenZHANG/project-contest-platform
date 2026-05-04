import { useMemo, useState, type ComponentType } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Trophy,
  Users,
  FileText,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Menu,
  Briefcase,
  ClipboardCheck,
  ShieldCheck,
  Home,
  User,
  PlusCircle,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Separator } from '../components/ui/separator';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';

interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  roles?: string[];
}

interface SidebarProps {
  role?: string;
  userEmail?: string;
}

function normalizeRole(role?: string) {
  return (role || '').trim().toUpperCase();
}

function encodeSegment(value?: string) {
  return encodeURIComponent(value || '');
}

function buildNavItems(role?: string, userEmail?: string): NavItem[] {
  const normalizedRole = normalizeRole(role);
  const email = encodeSegment(userEmail);

  const items: NavItem[] = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/contest-list', label: 'Browse Contests', icon: Trophy },
  ];

  if (normalizedRole === 'PARTICIPANT') {
    items.push(
      { to: `/profile/${email}`, label: 'Profile', icon: User, roles: ['PARTICIPANT'] },
      { to: `/contest/${email}`, label: 'Competitions', icon: Trophy, roles: ['PARTICIPANT'] },
      { to: `/teams/${email}`, label: 'Teams', icon: Users, roles: ['PARTICIPANT'] },
      { to: `/project/${email}`, label: 'Submissions', icon: FileText, roles: ['PARTICIPANT'] },
      { to: `/rating/${email}`, label: 'Scoring Queue', icon: ClipboardCheck, roles: ['PARTICIPANT'] }
    );
  }

  if (normalizedRole === 'ORGANIZER') {
    items.push(
      { to: `/OrganizerProfile/${email}`, label: 'Profile', icon: User, roles: ['ORGANIZER'] },
      { to: `/OrganizerDashboard/${email}`, label: 'Dashboard', icon: BarChart3, roles: ['ORGANIZER'] },
      { to: `/OrganizerContestList/${email}`, label: 'Competitions', icon: Briefcase, roles: ['ORGANIZER'] },
      { to: `/OrganizerContest/${email}`, label: 'Create Contest', icon: PlusCircle, roles: ['ORGANIZER'] }
    );
  }

  if (normalizedRole === 'ADMIN') {
    items.push(
      { to: '/AdminDashboard', label: 'Dashboard', icon: ShieldCheck, roles: ['ADMIN'] },
      { to: '/AdminAccountManage', label: 'Accounts', icon: Users, roles: ['ADMIN'] },
      { to: '/AllCompetitions', label: 'Competitions', icon: Trophy, roles: ['ADMIN'] },
      { to: '/AdminProfile', label: 'Profile', icon: User, roles: ['ADMIN'] }
    );
  }

  return items.filter((item) => !item.roles || item.roles.includes(normalizedRole));
}

interface NavListProps {
  items: NavItem[];
  collapsed?: boolean;
  onNavigate?: () => void;
}

function NavList({ items, collapsed = false, onNavigate }: NavListProps) {
  return (
    <nav className="flex-1 space-y-0.5 p-2">
      {items.map((item) => {
        const Icon = item.icon;
        const link = (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground',
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
  );
}

function Brand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="flex h-14 items-center gap-2 border-b px-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Trophy className="h-4 w-4" />
      </div>
      {!collapsed && <span className="truncate text-sm font-semibold tracking-tight">Questora</span>}
    </div>
  );
}

export function Sidebar({ role, userEmail }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleItems = useMemo(() => buildNavItems(role, userEmail), [role, userEmail]);

  return (
    <TooltipProvider delayDuration={0}>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="fixed left-3 top-2.5 z-40 md:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Primary navigation</SheetTitle>
          </SheetHeader>
          <Brand />
          <NavList items={visibleItems} onNavigate={() => setMobileOpen(false)} />
          <div className="border-t p-3 text-xs text-muted-foreground">
            Signed in as {role || 'User'}
          </div>
          <SheetClose className="sr-only">Close navigation</SheetClose>
        </SheetContent>
      </Sheet>

      <aside
        className={cn(
          'sticky top-0 hidden h-screen flex-col border-r bg-card transition-all duration-200 md:flex',
          collapsed ? 'w-16' : 'w-60'
        )}
        aria-label="Primary navigation"
      >
        <Brand collapsed={collapsed} />

        <NavList items={visibleItems} collapsed={collapsed} />

        <Separator />

        <div className="p-2">
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
