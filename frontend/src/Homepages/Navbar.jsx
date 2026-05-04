/**
 * Navbar.jsx
 *
 * Public homepage navigation bar. Migrated from MUI/CSS to shadcn/ui + Tailwind.
 * Behavior preserved: routes to /contest-list and /how-to-use, opens
 * RoleSelectModal -> Login -> RegisterModal flow when "Log in" is clicked.
 *
 * Developer: Beiqi Dai (migrated)
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy } from 'lucide-react';

import Login from './Login';
import RegisterModal from './RegisterModal';
import RoleSelectModal from './RoleSelectModal';
import { Button } from '../components/ui/button';

function Navbar() {
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showRoleSelect, setShowRoleSelect] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);

  const handleLoginClick = () => setShowRoleSelect(true);
  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setShowRoleSelect(false);
    setShowLogin(true);
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-lg font-bold tracking-tight text-foreground"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
              <Trophy className="h-4 w-4" />
            </span>
            Questora
          </Link>

          <nav className="flex items-center gap-2 sm:gap-4">
            <Link
              to="/contest-list"
              className="hidden sm:inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              See All Contests
            </Link>
            <Link
              to="/how-to-use"
              className="hidden sm:inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              How To Use
            </Link>
            <Button onClick={handleLoginClick} size="sm" className="h-9 px-4">
              Log in
            </Button>
          </nav>
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
