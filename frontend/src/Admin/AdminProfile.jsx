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

import React from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useProfileEditor } from '@/shared/hooks/useProfileEditor';
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
  const {
    formData,
    handleChange,
    avatarUrl,
    avatarDialogOpen,
    openAvatarDialog,
    closeAvatarDialog,
    tempAvatar,
    tempAvatarUrl,
    handleAvatarChange,
    saveAvatar: handleAvatarSave,
    uploading,
    saveProfile,
    saving,
  } = useProfileEditor();

  const handleSubmit = (e) => {
    e.preventDefault();

    if (formData.password && !PASSWORD_REGEX.test(formData.password)) {
      toast.error(
        'Password must be at least 8 characters and include one uppercase letter.'
      );
      return;
    }

    saveProfile();
  };

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
              onClick={() => openAvatarDialog()}
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
        onOpenChange={(o) => (o ? openAvatarDialog() : closeAvatarDialog())}
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
