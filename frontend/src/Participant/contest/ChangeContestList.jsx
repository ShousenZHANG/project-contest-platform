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
import { toast } from 'sonner';
import apiClient from '@/api/apiClient';
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

  const handleJoinClick = async (e) => {
    e.stopPropagation();
    const token = localStorage.getItem('token');
    if (!token) {
      toast.warning('Please log in first!');
      return;
    }

    try {
      await apiClient.post(`/registrations/${contest.id}`);
      toast.success('Registration successful!');
    } catch (error) {
      const errData = error.response?.data;
      if (errData?.error === 'You have already registered for this competition') {
        setOpenDialog(true);
      } else {
        toast.error('Registration failed due to network or server error.');
      }
    }
  };

  const handleCancelRegistration = async () => {
    try {
      await apiClient.delete(`/registrations/${contest.id}`);
      toast.success('Registration cancelled successfully!');
      setOpenDialog(false);
    } catch {
      toast.error('Cancellation failed due to network or server error.');
    }
  };

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
          <Button size="sm" onClick={handleJoinClick}>
            Join
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
