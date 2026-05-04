/**
 * @file TopBar.jsx
 * @description
 * Top navigation bar for Organizer role. Migrated from MUI to shadcn/ui.
 * Displays welcome line, avatar, and logout dialog.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import apiClient from '../api/apiClient';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';

function TopBar() {
  const [open, setOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [email, setEmail] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    setEmail(localStorage.getItem('email'));

    const fetchUserAvatar = async () => {
      try {
        const res = await apiClient.get('/users/profile');
        if (res.data?.avatarUrl) {
          setAvatarUrl(res.data.avatarUrl);
        }
      } catch {
        // Avatar fetch failed silently
      }
    };

    fetchUserAvatar();
  }, []);

  const handleConfirmLogout = async () => {
    try {
      await apiClient.post('/users/logout');
    } catch {
      // Logout API call failed silently
    }

    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('email');
    localStorage.removeItem('role');
    setOpen(false);
    window.location.href = '/';
  };

  const handleAvatarClick = () => {
    if (email) navigate(`/OrganizerProfile/${email}`);
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background px-6">
      <div className="flex flex-col">
        <p className="text-sm font-semibold text-foreground">Welcome back, Organizer</p>
        <p className="text-xs text-muted-foreground">
          Logged in as <span className="font-medium text-foreground">{email}</span>
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleAvatarClick}
          className="rounded-full ring-offset-background transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Open profile"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={avatarUrl || '/OIP.jpg'} alt="User Avatar" />
            <AvatarFallback>{(email || 'U').slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
        </button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(true)}
          aria-label="Log out"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Log out reminder</DialogTitle>
            <DialogDescription>
              Are you sure you want to log out?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmLogout}>
              Log out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}

export default TopBar;
