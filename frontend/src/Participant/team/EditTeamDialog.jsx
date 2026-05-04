/**
 * @file EditTeamDialog.jsx
 * @description
 * Dialog for editing team details and managing members (creator only).
 * Migrated from MUI to shadcn/ui + react-hook-form + zod (teamSchema).
 * confirm() and alert() replaced with shadcn Dialog and sonner toasts.
 *
 * Role: Participant
 * Developer: Beiqi Dai
 */

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { teamSchema } from '@/shared/schemas/teamSchema';
import { updateTeam, removeTeamMember, getTeamDetail } from './teamApi';

const formSchema = z.object({
  name: teamSchema.shape.name,
  description: teamSchema.shape.description,
});

function EditTeamDialog({ open, onClose, team, userData, onUpdated }) {
  const [members, setMembers] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [memberToRemove, setMemberToRemove] = useState(null);

  const isCreator = team?.createdBy === userData.userId;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', description: '' },
  });

  useEffect(() => {
    if (!team) return;
    reset({ name: team.name || '', description: team.description || '' });
    setLoadError('');
    if (isCreator) {
      getTeamDetail(team.id)
        .then((data) => setMembers(data.members || []))
        .catch((err) =>
          setLoadError('Failed to load team members: ' + err.message)
        );
    }
  }, [team, isCreator, reset]);

  const onSubmit = (values) => {
    return new Promise((resolve) => {
      updateTeam(
        team.id,
        { name: values.name.trim(), description: (values.description || '').trim() },
        userData,
        {
          onSuccess: () => {
            toast.success('Team updated successfully');
            onUpdated();
            resolve();
          },
          onError: (msg) => {
            toast.error(msg);
            resolve();
          },
        }
      );
    });
  };

  const confirmRemove = async () => {
    const member = memberToRemove;
    if (!member) return;
    try {
      await removeTeamMember(team.id, member.userId, userData);
      setMembers((prev) => prev.filter((m) => m.userId !== member.userId));
      toast.success('Member removed successfully');
      onUpdated();
    } catch (err) {
      toast.error('Failed to remove: ' + err.message);
    } finally {
      setMemberToRemove(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Team</DialogTitle>
          </DialogHeader>

          {loadError && (
            <p className="text-sm text-destructive">{loadError}</p>
          )}

          <form
            id="edit-team-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="edit-team-name">Team Name</Label>
              <Input
                id="edit-team-name"
                {...register('name')}
                aria-invalid={Boolean(errors.name)}
              />
              {errors.name && (
                <p className="text-xs text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-team-desc">Description</Label>
              <textarea
                id="edit-team-desc"
                rows={3}
                {...register('description')}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
              {errors.description && (
                <p className="text-xs text-destructive">
                  {errors.description.message}
                </p>
              )}
            </div>
          </form>

          {isCreator && members.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">
                Team Members
              </p>
              <ul className="divide-y divide-border rounded-md border border-border">
                {members.map((member) => {
                  const canRemove = member.userId !== userData.userId;
                  return (
                    <li
                      key={member.userId}
                      className="flex items-center justify-between gap-3 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {member.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {member.email || member.description}
                        </p>
                      </div>
                      {canRemove && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setMemberToRemove(member)}
                        >
                          Remove
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="edit-team-form"
              disabled={isSubmitting}
            >
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(memberToRemove)}
        onOpenChange={(o) => !o && setMemberToRemove(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove member?</DialogTitle>
            <DialogDescription>
              Remove {memberToRemove?.name} from the team?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMemberToRemove(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmRemove}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default EditTeamDialog;
