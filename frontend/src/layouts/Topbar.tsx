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

interface TopbarProps {
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  onSearch?: (query: string) => void;
}

export function Topbar({ userName, userEmail, userAvatar, onSearch }: TopbarProps) {
  const navigate = useNavigate();

  const handleLogout = () => {
    AuthTokenManager.clearSession();
    navigate('/login');
  };

  const initials = (userName || userEmail || 'U')
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Search */}
      <div className="relative ml-auto flex-1 md:grow-0 md:basis-80">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search competitions, teams…"
          className="pl-9"
          onChange={(e) => onSearch?.(e.target.value)}
          aria-label="Search"
        />
      </div>

      {/* Theme toggle */}
      <ThemeToggle />

      {/* Notifications */}
      <Button variant="ghost" size="icon" aria-label="Notifications">
        <Bell className="h-4 w-4" />
      </Button>

      {/* User menu */}
      {userName || userEmail ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Account menu" className="rounded-full">
              <Avatar className="h-8 w-8">
                {userAvatar && <AvatarImage src={userAvatar} alt={userName || ''} />}
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
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
            <DropdownMenuItem onClick={() => navigate('/profile')}>
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
