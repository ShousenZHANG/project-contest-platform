/**
 * Profile.jsx
 *
 * Participant profile management. Migrated from MUI to shadcn/ui + Tailwind.
 *
 * Role: Participant
 * Developer: Beiqi Dai
 */

import React, { useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useProfileEditor } from '@/shared/hooks/useProfileEditor';
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const {
    formData,
    handleChange,
    avatarUrl,
    avatarDialogOpen,
    openAvatarDialog,
    closeAvatarDialog: handleAvatarDialogClose,
    tempAvatar,
    tempAvatarUrl,
    handleAvatarChange,
    saveAvatar: handleAvatarSave,
    uploading,
    saveProfile,
    saving: submitting,
    deleteAccount,
  } = useProfileEditor();

  const handleDeleteAccount = () => {
    setDeleteDialogOpen(false);
    deleteAccount();
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (formData.password && !PASSWORD_REGEX.test(formData.password)) {
      toast.warning(
        'Password must be at least 8 characters and contain at least one uppercase letter.'
      );
      return;
    }

    saveProfile();
  };




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
              onClick={() => openAvatarDialog()}
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

      <Dialog open={avatarDialogOpen} onOpenChange={(open) => (!open ? handleAvatarDialogClose() : openAvatarDialog())}>
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
