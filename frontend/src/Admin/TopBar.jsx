/**
 * @file TopBar.jsx
 * @description
 * Admin top navigation bar. Migrated to shadcn/ui + Tailwind.
 * Shows a personalised greeting, the user's avatar (clickable -> Profile),
 * and a logout action that confirms via shadcn Dialog and toasts via sonner.
 *
 * Role: Admin
 * Developer: Zhaoyi Yang
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../api/apiClient';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

function TopBar() {
  const [open, setOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [email, setEmail] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    setEmail(localStorage.getItem('email') || '');

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
    if (email) {
      navigate('/AdminProfile');
    }
  };

  const initials = (email || 'A')
    .split(/[@.\s]+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() || '')
    .join('');

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex flex-col">
        <h1 className="text-base font-semibold tracking-tight">
          Welcome back, Admin
        </h1>
        <p className="text-xs text-muted-foreground">
          Logged in as <span className="font-medium text-foreground">{email}</span>
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleAvatarClick}
          className="rounded-full ring-offset-background transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Open profile"
        >
          <Avatar className="h-9 w-9">
            {avatarUrl && <AvatarImage src={avatarUrl} alt="User avatar" />}
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {initials || 'A'}
            </AvatarFallback>
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
        <DialogContent>
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
