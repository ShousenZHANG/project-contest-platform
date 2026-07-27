/**
 * @file Profile.jsx
 * @description
 * Organizer profile page. Migrated from MUI to shadcn/ui.
 * Allows view/update name, password, description, and avatar.
 * Allows account deletion. Email and role are read-only.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';
import { userService } from '../services/userService';
import { queryKeys, staleTime } from '../api/queryKeys';
import { unwrap, toMessage } from '../api/queryFn';
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
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const profileSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(50, 'Name is too long'),
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .refine(
      (v) => v === '' || (v.length >= 8 && /[A-Z]/.test(v)),
      'Password must be at least 8 characters with one uppercase letter'
    ),
  description: z.string().max(500, 'Description is too long'),
});


function OrganizerProfile() {
  useDocumentTitle('My Profile');
  const [errors, setErrors] = useState({});
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

  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: queryKeys.users.profile(),
    queryFn: () => unwrap(userService.getProfile()),
    staleTime: staleTime.long,
  });

  // Seed the controlled form the first time the profile arrives, and only then:
  // without the guard a background refetch would overwrite whatever the
  // organizer was in the middle of typing.
  const seeded = useRef(false);
  useEffect(() => {
    if (!profile || seeded.current) return;
    seeded.current = true;
    setFormData({
      name: profile.name || '',
      email: profile.email || '',
      password: '',
      description: profile.description || '',
      role: AuthTokenManager.getRole() || '',
    });
    setAvatarUrl(profile.avatarUrl);
  }, [profile]);

  const handleAvatarDialogClose = () => {
    if (tempAvatarUrl) URL.revokeObjectURL(tempAvatarUrl);
    setTempAvatar(null);
    setTempAvatarUrl('');
    setAvatarDialogOpen(false);
  };

  const updateProfile = useMutation({
    mutationFn: (data) => unwrap(userService.updateProfile(data)),
    onSuccess: () => {
      toast.success('Profile updated successfully');
      queryClient.invalidateQueries({ queryKey: queryKeys.users.profile() });
    },
    onError: (error) => toast.error(toMessage(error)),
  });

  const uploadAvatar = useMutation({
    mutationFn: (file) => {
      const body = new FormData();
      body.append('file', file);
      return unwrap(userService.uploadAvatar(body));
    },
    onSuccess: (data) => {
      if (!data?.avatarUrl) {
        toast.error('Error uploading avatar');
        return;
      }
      setAvatarUrl(data.avatarUrl);
      toast.success('Avatar updated');
      queryClient.invalidateQueries({ queryKey: queryKeys.users.profile() });
      handleAvatarDialogClose();
    },
    onError: (error) => toast.error(toMessage(error)),
  });

  const deleteAccount = useMutation({
    mutationFn: () => unwrap(userService.deleteUser(AuthTokenManager.getUserId())),
    onSuccess: () => {
      toast.success('Your account has been deleted.');
      AuthTokenManager.clearSession();
      window.location.href = '/';
    },
    onError: (error) => toast.error(toMessage(error)),
    onSettled: () => setDeleteDialogOpen(false),
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = profileSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setErrors(fieldErrors);
      const first = Object.values(fieldErrors).flat()[0];
      toast.error(first || 'Please fix the highlighted fields');
      return;
    }
    setErrors({});

    const { role, ...profileData } = formData;
    updateProfile.mutate({ ...profileData, avatarUrl });
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (tempAvatarUrl) URL.revokeObjectURL(tempAvatarUrl);
      setTempAvatar(file);
      setTempAvatarUrl(URL.createObjectURL(file));
    }
  };

  // The old implementation reloaded the whole page to show the new avatar.
  // Invalidating the profile query does the same job, and the dialog stays open
  // until the upload lands so its disabled state means something.
  const handleAvatarSave = () => {
    if (!tempAvatar) return;
    uploadAvatar.mutate(tempAvatar);
  };

  const handleDeleteAccount = () => deleteAccount.mutate();

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
                  aria-invalid={Boolean(errors.name)}
                />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name[0]}</p>
                )}
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
                  aria-invalid={Boolean(errors.email)}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email[0]}</p>
                )}
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
                  aria-invalid={Boolean(errors.password)}
                />
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password[0]}</p>
                )}
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
                  aria-invalid={Boolean(errors.description)}
                />
                {errors.description && (
                  <p className="text-xs text-destructive">{errors.description[0]}</p>
                )}
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
