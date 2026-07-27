/**
 * @file AdminProfile.jsx
 * @description
 * Admin profile management page. Migrated from MUI to shadcn/ui + Tailwind.
 * Admins can view/update their name, password (validated), and description,
 * preview a new avatar before uploading, and see read-only email and role.
 *
 * Role: Admin
 * Developer: Zhaoyi Yang
 */

import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { userService } from '../services/userService';
import { queryKeys, staleTime } from '../api/queryKeys';
import { unwrap, toMessage } from '../api/queryFn';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { cn } from '../lib/utils';
import AuthTokenManager from '@/auth/authTokenManager';


const PASSWORD_REGEX = /^(?=.*[A-Z]).{8,}$/;

function AdminProfile() {
  useDocumentTitle('Admin Profile');
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

  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: queryKeys.users.profile(),
    queryFn: () => unwrap(userService.getProfile()),
    staleTime: staleTime.long,
  });

  // Seed the controlled form the first time the profile arrives, and only then.
  // Without the guard, every background refetch hands back a fresh object and
  // this effect would overwrite whatever the admin was in the middle of typing.
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
    setAvatarUrl(profile.avatarUrl || '');
  }, [profile]);

  const closeAvatarDialog = () => {
    if (tempAvatarUrl) {
      URL.revokeObjectURL(tempAvatarUrl);
    }
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
      setAvatarUrl(data?.avatarUrl ?? '');
      toast.success('Avatar updated');
      queryClient.invalidateQueries({ queryKey: queryKeys.users.profile() });
      closeAvatarDialog();
    },
    onError: (error) => toast.error(toMessage(error)),
  });

  const saving = updateProfile.isPending;
  const uploading = uploadAvatar.isPending;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password && !PASSWORD_REGEX.test(formData.password)) {
      toast.error(
        'Password must be at least 8 characters and include one uppercase letter.'
      );
      return;
    }

    const { role, ...profileData } = formData;
    updateProfile.mutate({ ...profileData, avatarUrl });
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (tempAvatarUrl) {
        URL.revokeObjectURL(tempAvatarUrl);
      }
      setTempAvatar(file);
      setTempAvatarUrl(URL.createObjectURL(file));
    }
  };

  const handleAvatarSave = () => {
    if (!tempAvatar) return;

    // The old implementation called window.location.reload() here to make the
    // new avatar appear. Invalidating the profile query does the same job
    // without throwing the page away. The dialog stays open until the upload
    // lands, so the spinner still means something.
    uploadAvatar.mutate(tempAvatar);
  };

  useEffect(() => {
    return () => {
      if (tempAvatarUrl) {
        URL.revokeObjectURL(tempAvatarUrl);
      }
    };
  }, [tempAvatarUrl]);

  const initials = (formData.name || formData.email || 'A')
    .split(/[@.\s]+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() || '')
    .join('');

  return (
    <div className="p-6">
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
          <CardDescription>
            Update your account details and avatar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setAvatarDialogOpen(true)}
              className="group relative rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Change avatar"
            >
              <Avatar className="h-20 w-20">
                {avatarUrl && <AvatarImage src={avatarUrl} alt="Avatar" />}
                <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                  {initials || 'A'}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <Camera className="h-5 w-5 text-white" />
              </div>
            </button>
            <div>
              <p className="text-sm font-medium">{formData.name || 'Admin'}</p>
              <p className="text-xs text-muted-foreground">{formData.email}</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your name"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                disabled
                className="cursor-not-allowed bg-muted"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Leave blank to keep current"
                autoComplete="new-password"
              />
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters and include one uppercase letter.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                name="description"
                value={formData.description || ''}
                onChange={handleChange}
                placeholder="Tell us about yourself"
                rows={4}
                className={cn(
                  'flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm',
                  'placeholder:text-muted-foreground',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="role">User Role</Label>
              <Input
                id="role"
                name="role"
                value={formData.role}
                disabled
                className="cursor-not-allowed bg-muted"
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  'Save changes'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Avatar dialog */}
      <Dialog
        open={avatarDialogOpen}
        onOpenChange={(o) => (o ? setAvatarDialogOpen(true) : closeAvatarDialog())}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload avatar</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-2">
            <Avatar className="h-24 w-24">
              {(tempAvatarUrl || avatarUrl) && (
                <AvatarImage
                  src={tempAvatarUrl || avatarUrl}
                  alt="Preview"
                />
              )}
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                {initials || 'A'}
              </AvatarFallback>
            </Avatar>

            <Input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="cursor-pointer"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeAvatarDialog}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAvatarSave}
              disabled={!tempAvatar || uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading…
                </>
              ) : (
                'Save avatar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AdminProfile;
