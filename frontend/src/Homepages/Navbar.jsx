/**
 * Navbar.jsx
 *
 * Public homepage navigation bar (shadcn/ui + Tailwind). Desktop shows inline
 * links; below the `sm` breakpoint they collapse into an accessible Sheet drawer
 * so mobile users can still reach every destination.
 *
 * Behavior preserved: routes to /contest-list and /how-to-use, opens
 * RoleSelectModal -> Login -> RegisterModal flow when "Log in" is clicked.
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Menu } from 'lucide-react';

import Login from './Login';
import RegisterModal from './RegisterModal';
import RoleSelectModal from './RoleSelectModal';
import { Button } from '../components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../components/ui/sheet';

const NAV_LINKS = [
  { to: '/contest-list', label: 'See All Contests' },
  { to: '/how-to-use', label: 'How To Use' },
];

function Navbar() {
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showRoleSelect, setShowRoleSelect] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLoginClick = () => setShowRoleSelect(true);
  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setShowRoleSelect(false);
    setShowLogin(true);
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link
            to="/"
            className="flex items-center gap-2 text-lg font-bold tracking-tight text-foreground"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
              <Trophy className="h-4 w-4" />
            </span>
            Questora
          </Link>

          {/* Desktop navigation */}
          <nav className="hidden items-center gap-4 sm:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
            <Button onClick={handleLoginClick} size="sm" className="h-9 px-4">
              Log in
            </Button>
          </nav>

          {/* Mobile navigation */}
          <div className="sm:hidden">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <nav className="mt-6 flex flex-col gap-1">
                  {NAV_LINKS.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setMenuOpen(false)}
                      className="rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      {link.label}
                    </Link>
                  ))}
                  <Button
                    onClick={() => {
                      setMenuOpen(false);
                      handleLoginClick();
                    }}
                    className="mt-3 w-full"
                  >
                    Log in
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {showRoleSelect && (
        <RoleSelectModal
          onSelectRole={handleRoleSelect}
          onClose={() => setShowRoleSelect(false)}
        />
      )}

      {showLogin && (
        <Login
          role={selectedRole}
          onClose={() => setShowLogin(false)}
          onShowRegister={() => {
            setShowLogin(false);
            setShowRegister(true);
          }}
        />
      )}

      {showRegister && (
        <RegisterModal
          onClose={() => setShowRegister(false)}
          role={selectedRole}
        />
      )}
    </>
  );
}

export default Navbar;
