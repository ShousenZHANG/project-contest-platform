/**
 * @file ChangeContestList.jsx
 * @description
 * Single contest table row with Join/Cancel registration flow.
 * Migrated from MUI to shadcn/ui + Tailwind. Uses sonner toasts and a
 * shadcn Dialog for the "already registered" confirmation.
 *
 * Role: Participant
 * Developer: Beiqi Dai
 */

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { registrationService } from '@/services/registrationService';
import { queryKeys, staleTime } from '@/api/queryKeys';
import { unwrap } from '@/api/queryFn';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import AuthTokenManager from '@/auth/authTokenManager';


function statusDotClass(status) {
  const s = (status || '').toLowerCase();
  if (s === 'ongoing') return 'bg-success';
  if (s === 'upcoming') return 'bg-primary';
  if (s === 'completed') return 'bg-muted-foreground';
  return 'bg-border';
}

function ChangeContestList({ contest, onClick }) {
  const [openDialog, setOpenDialog] = useState(false);

  const handleRowClick = (e) => {
    onClick?.(e);
  };

  const queryClient = useQueryClient();
  const signedIn = Boolean(AuthTokenManager.getToken());
  const statusKey = [...queryKeys.registrations.all, 'status', contest?.id];

  // Knowing whether the user is already in lets the button say so, and gives
  // the mutations a value to flip optimistically. Without it the only way to
  // find out was to try to register and read the failure.
  const { data: isRegistered = false } = useQuery({
    queryKey: statusKey,
    queryFn: () => unwrap(registrationService.getStatus(contest.id)),
    select: (value) => value === true || value === 'true',
    enabled: signedIn && Boolean(contest?.id),
    staleTime: staleTime.short,
  });

  const invalidateRegistrations = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.registrations.all });

  /** Flip the cached status and hand back the previous value for rollback. */
  const setStatusOptimistically = async (next) => {
    await queryClient.cancelQueries({ queryKey: statusKey });
    const previous = queryClient.getQueryData(statusKey);
    queryClient.setQueryData(statusKey, next);
    return { previous };
  };

  const register = useMutation({
    mutationFn: () => unwrap(registrationService.register(contest.id)),
    onMutate: () => setStatusOptimistically(true),
    onSuccess: () => toast.success('Registration successful!'),
    onError: (error, _vars, context) => {
      const errData = error.response?.data;
      // 'Already registered' means the optimistic value was right and the
      // cached status was stale, so it stays flipped.
      if (errData?.error === 'You have already registered for this competition') {
        setOpenDialog(true);
        return;
      }
      if (context?.previous !== undefined) {
        queryClient.setQueryData(statusKey, context.previous);
      }
      toast.error('Registration failed due to network or server error.');
    },
    onSettled: invalidateRegistrations,
  });

  const cancelRegistration = useMutation({
    mutationFn: () => unwrap(registrationService.cancel(contest.id)),
    onMutate: () => setStatusOptimistically(false),
    onSuccess: () => toast.success('Registration cancelled successfully!'),
    onError: (_error, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(statusKey, context.previous);
      }
      toast.error('Cancellation failed due to network or server error.');
    },
    onSettled: () => {
      setOpenDialog(false);
      invalidateRegistrations();
    },
  });

  const handleJoinClick = (e) => {
    e.stopPropagation();
    if (!signedIn) {
      toast.warning('Please log in first!');
      return;
    }
    // Already in: go straight to the cancel prompt instead of provoking a
    // failed registration to get there.
    if (isRegistered) {
      setOpenDialog(true);
      return;
    }
    register.mutate();
  };

  const handleCancelRegistration = () => cancelRegistration.mutate();

  if (!contest) return null;

  return (
    <>
      <tr
        onClick={handleRowClick}
        className="cursor-pointer border-b border-border transition-colors hover:bg-muted/40"
      >
        <td className="px-4 py-3 text-sm text-foreground">{contest.title}</td>
        <td className="px-4 py-3 text-sm text-foreground">{contest.category}</td>
        <td className="px-4 py-3 text-sm text-foreground">{contest.date}</td>
        <td className="px-4 py-3 text-sm text-foreground">
          <span className="inline-flex items-center gap-2">
            <span
              className={cn(
                'inline-block h-2 w-2 rounded-full',
                statusDotClass(contest.status)
              )}
            />
            {contest.status}
          </span>
        </td>
        <td className="px-4 py-3 text-sm">
          <Button
            size="sm"
            variant={isRegistered ? 'outline' : 'default'}
            onClick={handleJoinClick}
          >
            {isRegistered ? 'Registered' : 'Join'}
          </Button>
        </td>
      </tr>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent
          onClick={(e) => e.stopPropagation()}
          className="max-w-md"
        >
          <DialogHeader>
            <DialogTitle>Already Registered</DialogTitle>
            <DialogDescription>
              You have already registered for this competition. Do you want to
              cancel your registration?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(false)}>
              No
            </Button>
            <Button variant="destructive" onClick={handleCancelRegistration}>
              Yes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ChangeContestList;
