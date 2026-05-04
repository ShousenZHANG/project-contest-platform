/**
 * RoleSelectModal.jsx
 *
 * Role-picker modal shown before login/register. Migrated from CSS modal to
 * shadcn/ui Dialog. Behavior preserved: clicking a role calls onSelectRole(role)
 * and closing the dialog calls onClose.
 *
 * Developer: Zhaoyi Yang, Ziqi Yi (migrated)
 */

import React from 'react';
import { Users, Briefcase } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Button } from '../components/ui/button';

function RoleSelectModal({ onSelectRole, onClose }) {
  const handleOpenChange = (open) => {
    if (!open) onClose?.();
  };

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold tracking-tight">
            Select Your Role
          </DialogTitle>
          <DialogDescription>
            Choose how you want to use the platform.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-auto flex-col gap-2 py-6 hover:border-primary hover:bg-primary/5"
            onClick={() => onSelectRole('Participant')}
          >
            <Users className="h-6 w-6 text-primary" />
            <span className="text-base font-semibold">Participant</span>
            <span className="text-xs font-normal text-muted-foreground text-center">
              Join contests and submit work
            </span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-auto flex-col gap-2 py-6 hover:border-primary hover:bg-primary/5"
            onClick={() => onSelectRole('Organizer')}
          >
            <Briefcase className="h-6 w-6 text-primary" />
            <span className="text-base font-semibold">Organizer</span>
            <span className="text-xs font-normal text-muted-foreground text-center">
              Run contests and manage entries
            </span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default RoleSelectModal;
