import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { userService } from '../../services/userService';
import { queryKeys, staleTime } from '../../api/queryKeys';
import { unwrap, toMessage } from '../../api/queryFn';
import AuthTokenManager from '@/auth/authTokenManager';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

/**
 * Everything the three profile pages do with data.
 *
 * Admin, Organizer and Participant each carried their own copy of this: the same query, the same
 * one-shot seed, the same three mutations, the same object-URL dance for the avatar preview. The
 * ref guard that stops a background refetch from wiping a half-typed form had to be written — and
 * debugged — three separate times.
 *
 * What genuinely differs between those pages is presentation: placeholder wording, whether account
 * deletion is offered, and which validator runs on the password. That stays in the pages. Only the
 * data lives here.
 *
 * @param {{ onDeleted?: () => void }} [options]
 */
export function useProfileEditor(options = {}) {
  const { onDeleted } = options;
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    description: '',
    role: AuthTokenManager.getRole() || '',
  });

  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [tempAvatar, setTempAvatar] = useState(null);
  const [tempAvatarUrl, setTempAvatarUrl] = useState('');

  const { data: profile } = useQuery({
    queryKey: queryKeys.users.profile(),
    queryFn: () => unwrap(userService.getProfile()),
    staleTime: staleTime.long,
  });

  // Seed the controlled form the first time the profile arrives, and only then.
  // Without the guard, refetch-on-focus overwrites whatever is being typed.
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

  // Release the last preview URL when the page goes away.
  useEffect(
    () => () => {
      if (tempAvatarUrl) URL.revokeObjectURL(tempAvatarUrl);
    },
    [tempAvatarUrl]
  );

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const openAvatarDialog = useCallback(() => setAvatarDialogOpen(true), []);

  const closeAvatarDialog = useCallback(() => {
    setTempAvatarUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return '';
    });
    setTempAvatar(null);
    setAvatarDialogOpen(false);
  }, []);

  /**
   * Accepts a picked file, rejecting anything that is not a reasonably sized image.
   * The name is sanitised because the upload endpoint puts it straight into an object key.
   */
  const handleAvatarChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const safeName = encodeURIComponent(file.name.replace(/[^\w.-]/g, '_'));
    const renamed = new File([file], safeName, { type: file.type });

    if (!renamed.type.startsWith('image/')) {
      toast.warning('Please select a valid image file.');
      return;
    }
    if (renamed.size > MAX_AVATAR_BYTES) {
      toast.warning('File size exceeds the 5MB limit. Please select a smaller image.');
      return;
    }

    setTempAvatarUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(renamed);
    });
    setTempAvatar(renamed);
  }, []);

  const invalidateProfile = useCallback(
    () => queryClient.invalidateQueries({ queryKey: queryKeys.users.profile() }),
    [queryClient]
  );

  const updateProfile = useMutation({
    mutationFn: (data) => unwrap(userService.updateProfile(data)),
    onSuccess: () => {
      toast.success('Profile updated successfully');
      invalidateProfile();
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
      invalidateProfile();
      closeAvatarDialog();
    },
    onError: (error) => toast.error(toMessage(error)),
  });

  const removeAccount = useMutation({
    mutationFn: () => unwrap(userService.deleteUser(AuthTokenManager.getUserId())),
    onSuccess: () => {
      toast.success('Your account has been deleted.');
      AuthTokenManager.clearSession();
      if (onDeleted) onDeleted();
      else window.location.href = '/';
    },
    onError: (error) => toast.error(toMessage(error)),
  });

  /** Saves the form, minus the read-only role, keeping the current avatar. */
  const saveProfile = useCallback(() => {
    const { role, ...profileData } = formData;
    updateProfile.mutate({ ...profileData, avatarUrl });
  }, [formData, avatarUrl, updateProfile]);

  const saveAvatar = useCallback(() => {
    if (tempAvatar) uploadAvatar.mutate(tempAvatar);
  }, [tempAvatar, uploadAvatar]);

  const deleteAccount = useCallback(() => removeAccount.mutate(), [removeAccount]);

  return {
    profile,
    formData,
    setFormData,
    handleChange,
    avatarUrl,

    avatarDialogOpen,
    openAvatarDialog,
    closeAvatarDialog,
    tempAvatar,
    tempAvatarUrl,
    handleAvatarChange,
    saveAvatar,
    uploading: uploadAvatar.isPending,

    saveProfile,
    saving: updateProfile.isPending,

    deleteAccount,
    deleting: removeAccount.isPending,
  };
}

export default useProfileEditor;
