/**
 * TopBar.jsx
 *
 * Participant top navigation bar. Migrated to shadcn/ui + Tailwind.
 *
 * Role: Participant
 * Developer: Beiqi Dai
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import apiClient from '../../api/apiClient';
import logo from './LOGO.png';
import { Button } from '../../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';

function TopBar() {
  const [open, setOpen] = useState(false);
  const [, setProjectName] = useState(
    localStorage.getItem('projectName') || 'Please set a project name'
  );
  const [avatarUrl, setAvatarUrl] = useState('');
  const navigate = useNavigate();
  const userName = localStorage.getItem('email') || 'Participant';

  useEffect(() => {
    const fetchProjectName = async () => {
      try {
        const res = await apiClient.get('/api/project/info');
        const data = res.data;
        if (data.success && data.projectName) {
          localStorage.setItem('projectName', `Welcome To ${data.projectName}`);
          setProjectName(`Welcome To ${data.projectName}`);
        }
      } catch {
        setProjectName('Please set a project name');
      }
    };

    if (!localStorage.getItem('projectName')) {
      fetchProjectName();
    }

    const handler = () => {
      setProjectName(localStorage.getItem('projectName') || 'Please set a project name');
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  useEffect(() => {
    const fetchUserAvatar = async () => {
      try {
        const res = await apiClient.get('/users/profile');
        if (res.data?.avatarUrl) {
          setAvatarUrl(res.data.avatarUrl);
        }
      } catch (error) {
        // Avatar fetch failed silently
      }
    };

    fetchUserAvatar();
  }, []);

  const handleConfirmLogout = async () => {
    try {
      await apiClient.post('/users/logout');
    } catch (err) {
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
    const email = localStorage.getItem('email');
    if (email) {
      navigate(`/Profile/${email}`);
    }
  };

  const initials = (userName.split('@')[0] || 'U').slice(0, 2).toUpperCase();

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4">
      <div className="flex items-center gap-3">
        <img src={logo} alt="Logo" className="h-9 w-9 object-contain" />
        <h1 className="text-lg font-semibold text-foreground">Questora</h1>
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden text-sm text-muted-foreground sm:inline">
          Hi, {userName.split('@')[0]}
        </span>
        <button
          onClick={handleAvatarClick}
          className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Avatar className="h-9 w-9 cursor-pointer">
            <AvatarImage src={avatarUrl || '/OIP.jpg'} alt="User Avatar" />
            <AvatarFallback>{initials}</AvatarFallback>
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
            <DialogDescription>Are you sure you want to log out?</DialogDescription>
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
