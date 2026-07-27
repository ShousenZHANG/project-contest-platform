/**
 * Profile.jsx
 *
 * Participant profile management. Migrated from MUI to shadcn/ui + Tailwind.
 *
 * Role: Participant
 * Developer: Beiqi Dai
 */

import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { userService } from '../../services/userService';
import { queryKeys, staleTime } from '../../api/queryKeys';
import { unwrap, toMessage } from '../../api/queryFn';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import AuthTokenManager from '@/auth/authTokenManager';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';

const PASSWORD_REGEX = /^(?=.*[A-Z]).{8,}$/;

function Profile() {
  useDocumentTitle('My Profile');
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

  // Seed the controlled form the first time the profile arrives, and only then.
  // A background refetch must not overwrite edits in progress.
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
      toast.success('Profile updated successfully!');
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
        toast.error('Error uploading avatar.');
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
      setTimeout(() => {
        window.location.href = '/';
      }, 1200);
    },
    onError: (error) => toast.error(toMessage(error)),
    onSettled: () => setDeleteDialogOpen(false),
  });

  const submitting = updateProfile.isPending;
  const uploading = uploadAvatar.isPending;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password && !PASSWORD_REGEX.test(formData.password)) {
      toast.warning(
        'Password must be at least 8 characters and contain at least one uppercase letter.'
      );
      return;
    }

    const { role, ...profileData } = formData;
    updateProfile.mutate({ ...profileData, avatarUrl });
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const newFileName = file.name.replace(/[^\w.-]/g, '_');
    const encodedFileName = encodeURIComponent(newFileName);
    const renamedFile = new File([file], encodedFileName, { type: file.type });

    if (tempAvatarUrl) URL.revokeObjectURL(tempAvatarUrl);

    if (!renamedFile.type.startsWith('image/')) {
      toast.warning('Please select a valid image file.');
      return;
    }

    if (renamedFile.size > 5 * 1024 * 1024) {
      toast.warning('File size exceeds the 5MB limit. Please select a smaller image.');
      return;
    }

    setTempAvatar(renamedFile);
    setTempAvatarUrl(URL.createObjectURL(renamedFile));
  };

  // The old implementation reloaded the page to show the new avatar.
  // Invalidating the profile query does the same job without discarding it.
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

  const initials = (formData.name || formData.email || 'U').slice(0, 2).toUpperCase();

  return (
    <div className="p-6">
      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>My Profile</CardTitle>
          <CardDescription>Manage your account info and avatar.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex items-center gap-4">
            <button
              type="button"
              onClick={() => setAvatarDialogOpen(true)}
              className="group relative rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Avatar className="h-24 w-24 border-2 border-background shadow-md">
                <AvatarImage src={avatarUrl || '/OIP.jpg'} alt="User Avatar" />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <Camera className="h-5 w-5 text-white" />
              </span>
            </button>
            <div>
              <p className="text-sm font-medium text-foreground">{formData.name || 'Unnamed'}</p>
              <p className="text-xs text-muted-foreground">{formData.email}</p>
            </div>
          </div>

          <form className="grid grid-cols-1 gap-5 md:grid-cols-2" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter name"
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
                placeholder="Enter email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter new password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">User Role</Label>
              <Input id="role" type="text" name="role" value={formData.role} disabled />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                name="description"
                value={formData.description || ''}
                onChange={handleChange}
                placeholder="Tell us about yourself"
                rows={5}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="flex flex-wrap gap-3 md:col-span-2">
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                Delete Account
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Dialog open={avatarDialogOpen} onOpenChange={(open) => (!open ? handleAvatarDialogClose() : setAvatarDialogOpen(true))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Avatar</DialogTitle>
            <DialogDescription>Select a new image (max 5MB).</DialogDescription>
          </DialogHeader>
          <input
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="text-sm"
          />
          {tempAvatarUrl && (
            <img
              src={tempAvatarUrl}
              alt="preview"
              className="mt-2 h-32 w-32 rounded-md object-cover"
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleAvatarDialogClose}>
              Cancel
            </Button>
            <Button onClick={handleAvatarSave} disabled={uploading || !tempAvatar}>
              {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete your account? This action is irreversible.
            </DialogDescription>
          </DialogHeader>
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

export default Profile;
