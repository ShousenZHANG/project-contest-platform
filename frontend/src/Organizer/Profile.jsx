/**
 * @file Profile.jsx
 * @description
 * Organizer profile page. Migrated from MUI to shadcn/ui.
 * Allows view/update name, password, description, and avatar.
 * Allows account deletion. Email and role are read-only.
 */

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import apiClient from '../api/apiClient';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import AuthTokenManager from '@/auth/authTokenManager';


function OrganizerProfile() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    description: '',
    role: AuthTokenManager.getRole() || '',
  });

  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [tempAvatar, setTempAvatar] = useState(null);
  const [tempAvatarUrl, setTempAvatarUrl] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await apiClient.get('/users/profile');
        const data = response.data;
        if (data) {
          setFormData({
            name: data.name || '',
            email: data.email || '',
            password: '',
            description: data.description || '',
            role: AuthTokenManager.getRole() || '',
          });
          setAvatarUrl(data.avatarUrl);
        }
      } catch {
        // Failed to fetch user data
      }
    };

    fetchUserData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password) {
      const passwordRegex = /^(?=.*[A-Z]).{8,}$/;
      if (!passwordRegex.test(formData.password)) {
        toast.error(
          'Password must be at least 8 characters and contain at least one uppercase letter.'
        );
        return;
      }
    }

    try {
      const { role, ...profileData } = formData;
      await apiClient.put('/users/profile', { ...profileData, avatarUrl });
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error updating profile');
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (tempAvatarUrl) URL.revokeObjectURL(tempAvatarUrl);
      setTempAvatar(file);
      setTempAvatarUrl(URL.createObjectURL(file));
    }
  };

  const handleAvatarSave = async () => {
    if (!tempAvatar) return;

    const formDataUpload = new FormData();
    formDataUpload.append('file', tempAvatar);

    try {
      const response = await apiClient.post('/users/profile/avatar', formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const data = response.data;
      if (data?.avatarUrl) {
        setAvatarUrl(data.avatarUrl);
        window.location.reload();
      } else {
        toast.error('Error uploading avatar');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error uploading avatar');
    }

    setTempAvatar(null);
    setTempAvatarUrl('');
    setAvatarDialogOpen(false);
  };

  const handleAvatarDialogClose = () => {
    if (tempAvatarUrl) URL.revokeObjectURL(tempAvatarUrl);
    setTempAvatar(null);
    setTempAvatarUrl('');
    setAvatarDialogOpen(false);
  };

  const handleDeleteAccount = async () => {
    const userId = AuthTokenManager.getUserId();
    try {
      await apiClient.delete(`/users/${userId}`);
      toast.success('Your account has been deleted.');
      AuthTokenManager.clearSession();
      window.location.href = '/';
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error deleting account.');
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  useEffect(() => {
    return () => {
      if (tempAvatarUrl) URL.revokeObjectURL(tempAvatarUrl);
    };
  }, [tempAvatarUrl]);

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <button
            type="button"
            onClick={() => setAvatarDialogOpen(true)}
            className="rounded-full ring-offset-background transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Change avatar"
          >
            <Avatar className="h-20 w-20">
              <AvatarImage src={avatarUrl || '/OIP.jpg'} alt="User Avatar" />
              <AvatarFallback>
                {(formData.name || formData.email || 'U').slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </button>
          <div className="flex flex-col">
            <CardTitle className="text-2xl">My Profile</CardTitle>
            <p className="text-sm text-muted-foreground">
              Update your account details and preferences
            </p>
          </div>
        </CardHeader>

        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter a new password"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description || ''}
                  onChange={handleChange}
                  placeholder="Tell us about yourself"
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="role">User Role</Label>
                <Input
                  id="role"
                  type="text"
                  name="role"
                  value={formData.role}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>

            <div className="sticky bottom-0 -mx-6 mt-6 flex items-center justify-end gap-2 border-t border-border bg-card px-6 py-3">
              <Button
                type="button"
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                Delete Account
              </Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Dialog open={avatarDialogOpen} onOpenChange={(o) => !o && handleAvatarDialogClose()}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Upload Avatar</DialogTitle>
          </DialogHeader>
          <input
            accept="image/*"
            type="file"
            onChange={handleAvatarChange}
            className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
          />
          <DialogFooter>
            <Button variant="outline" onClick={handleAvatarDialogClose}>
              Cancel
            </Button>
            <Button onClick={handleAvatarSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete your account? This action is
            irreversible.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAccount}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default OrganizerProfile;
