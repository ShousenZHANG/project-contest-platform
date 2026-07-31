/**
 * @file MyTeamsDialog.jsx
 * @description
 * Lists the user's joined/created teams; the creator can edit or delete.
 * Migrated from MUI to shadcn/ui + Tailwind. confirm()/alert() replaced
 * with sonner toasts and a shadcn Dialog for delete confirmation.
 *
 * Role: Participant
 * Developer: Beiqi Dai
 */

import React, { useEffect, useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Loader2, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import EditTeamDialog from './EditTeamDialog';
import { teamService } from '@/services/teamService';
import { queryKeys, staleTime } from '@/api/queryKeys';
import { unwrap, toMessage } from '@/api/queryFn';

function MyTeamsDialog({
  open,
  myTeams,
  onClose,
  onDelete,
  userData,
  onUpdate,
}) {
  const [editTeamId, setEditTeamId] = useState(null);
  const [teamToDelete, setTeamToDelete] = useState(null);

  // The creator of each team decides whether the edit and delete controls show.
  // These used to be fetched in a sequential for-loop, so a dialog listing ten
  // teams waited out ten round trips one after another.
  const creatorQueries = useQueries({
    queries: (open ? myTeams : []).map((team) => ({
      queryKey: queryKeys.teams.creator(team.id),
      queryFn: () => unwrap(teamService.getCreator(team.id)),
      staleTime: staleTime.long,
    })),
  });

  const loading = creatorQueries.some((q) => q.isPending);
  const error = '';

  const creatorMap = {};
  (open ? myTeams : []).forEach((team, i) => {
    const creator = creatorQueries[i] && creatorQueries[i].data;
    creatorMap[team.id] = creator ? creator.id : null;
  });

  const { data: teamToEdit = null, error: editError } = useQuery({
    queryKey: queryKeys.teams.detail(editTeamId),
    queryFn: () => unwrap(teamService.getById(editTeamId)),
    enabled: Boolean(editTeamId),
    staleTime: staleTime.medium,
  });

  // Fire the toast from an effect, not during render: the error stays set
  // until the query is retried, so a render-time toast would repeat forever.
  useEffect(() => {
    if (editError) {
      toast.error('Failed to load team info: ' + toMessage(editError));
      setEditTeamId(null);
    }
  }, [editError]);

  const editOpen = Boolean(editTeamId) && Boolean(teamToEdit);

  const handleOpenEdit = (team) => setEditTeamId(team.id);

  const confirmDelete = () => {
    if (teamToDelete) {
      onDelete(teamToDelete.id);
      setTeamToDelete(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>My Teams</DialogTitle>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : myTeams.length > 0 ? (
              <ul className="divide-y divide-border rounded-md border border-border">
                {myTeams.map((team) => {
                  const creatorId = creatorMap[team.id];
                  const isCreator = creatorId === userData.userId;

                  return (
                    <li
                      key={team.id}
                      className="flex items-center justify-between gap-3 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {team.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {team.description || 'No description'}
                        </p>
                      </div>
                      {isCreator && (
                        <div className="flex shrink-0 gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEdit(team)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setTeamToDelete(team)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </Button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                You have not joined any teams.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {teamToEdit && (
        <EditTeamDialog
          open={editOpen}
          onClose={() => setEditTeamId(null)}
          team={teamToEdit}
          userData={userData}
          onUpdated={() => {
            setEditTeamId(null);
            onUpdate();
          }}
        />
      )}

      <Dialog
        open={Boolean(teamToDelete)}
        onOpenChange={(o) => !o && setTeamToDelete(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete team?</DialogTitle>
            <DialogDescription>
              Delete &ldquo;{teamToDelete?.name}&rdquo;? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTeamToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default MyTeamsDialog;
