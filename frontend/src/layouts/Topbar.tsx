import { Bell, Search, LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { ThemeToggle } from '../components/ThemeToggle';
import AuthTokenManager from '../auth/authTokenManager';
import { useAuth } from '../context/AuthContext';

interface TopbarProps {
  role?: string;
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  onSearch?: (query: string) => void;
}

function profilePathForRole(role?: string, userEmail?: string) {
  const normalizedRole = (role || '').trim().toUpperCase();
  const email = encodeURIComponent(userEmail || '');

  if (normalizedRole === 'ADMIN') return '/AdminProfile';
  if (normalizedRole === 'ORGANIZER') return `/OrganizerProfile/${email}`;
  if (normalizedRole === 'PARTICIPANT') return `/profile/${email}`;
  return '/';
}

export function Topbar({ role, userName, userEmail, userAvatar, onSearch }: TopbarProps) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    AuthTokenManager.clearSession();
    logout();
    navigate('/login', { replace: true });
  };

  const initials = (userName || userEmail || 'U')
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-end gap-2 border-b bg-background/95 px-3 pl-14 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:gap-4 md:px-4">
      <div className="relative hidden min-w-0 flex-1 sm:block md:ml-auto md:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search competitions, teams..."
          className="pl-9"
          onChange={(e) => onSearch?.(e.target.value)}
          aria-label="Search"
        />
      </div>

      <ThemeToggle />

      <Button variant="ghost" size="icon" aria-label="Notifications">
        <Bell className="h-4 w-4" />
      </Button>

      {userName || userEmail ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Account menu" className="rounded-full">
              <Avatar className="h-8 w-8">
                {userAvatar && <AvatarImage src={userAvatar} alt={userName || ''} />}
                <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                  {initials || 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col">
              <span className="text-sm font-semibold">{userName || 'User'}</span>
              {userEmail && (
                <span className="truncate text-xs font-normal text-muted-foreground">
                  {userEmail}
                </span>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate(profilePathForRole(role, userEmail))}>
              <User className="h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button variant="default" size="sm" onClick={() => navigate('/login')}>
          Sign in
        </Button>
      )}
    </header>
  );
}
