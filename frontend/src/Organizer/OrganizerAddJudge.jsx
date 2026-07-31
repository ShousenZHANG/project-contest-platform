/**
 * @file OrganizerAddJudge.jsx
 * @description
 * Manage judges for a specific competition. Add (with conflict check vs participants),
 * paginate, and delete. Migrated from MUI to shadcn/ui.
 *
 * Role: Organizer
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { competitionService } from '../services/competitionService';
import { registrationService } from '../services/registrationService';
import { queryKeys, staleTime } from '../api/queryKeys';
import { unwrap } from '../api/queryFn';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import AuthTokenManager from '@/auth/authTokenManager';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

function OrganizerAddJudge() {
  const { competitionId } = useParams();
  const navigate = useNavigate();
  const email = AuthTokenManager.getEmail();

  const [judgeEmail, setJudgeEmail] = useState('');
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });

  const queryClient = useQueryClient();
  const enabled = Boolean(competitionId);

  const { data: competition } = useQuery({
    queryKey: queryKeys.competitions.detail(competitionId),
    queryFn: () => unwrap(competitionService.getById(competitionId)),
    enabled,
    staleTime: staleTime.medium,
  });

  const competitionName = competition?.name || 'Unnamed Competition';

  const judgesParams = { page, size: 10 };
  const judgesKey = [...queryKeys.competitions.judges(competitionId), judgesParams];

  const { data: judgesPage, isPending: judgesPending } = useQuery({
    queryKey: judgesKey,
    queryFn: () => unwrap(competitionService.getJudges(competitionId, judgesParams)),
    enabled,
    staleTime: staleTime.short,
  });

  const judges = judgesPage?.data ?? [];
  const totalPages = judgesPage?.pages ?? 1;

  const participantsParams = { page: 1, size: 10000 };
  const { data: participantsEmails = new Set() } = useQuery({
    queryKey: queryKeys.registrations.participants(competitionId, participantsParams),
    queryFn: () =>
      unwrap(registrationService.getParticipants(competitionId, participantsParams)),
    // Only the email set is used here; keeping the raw page cached means the
    // participant list page can share this entry.
    select: (payload) => new Set((payload?.data ?? []).map((p) => p.email)),
    enabled,
    staleTime: staleTime.medium,
  });

  const refreshJudges = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.competitions.judges(competitionId) });

  const assignJudges = useMutation({
    mutationFn: (judgeEmails) =>
      unwrap(competitionService.assignJudges(competitionId, { judgeEmails })),
    onSuccess: (data) => {
      toast.success(typeof data === 'string' ? data : JSON.stringify(data));
      setJudgeEmail('');
      refreshJudges();
    },
    onError: (error) => {
      const errData = error.response?.data;
      toast.error(
        typeof errData === 'string'
          ? errData
          : errData?.error || 'Error assigning judge'
      );
    },
  });

  const removeJudge = useMutation({
    mutationFn: (judgeId) => unwrap(competitionService.removeJudge(competitionId, judgeId)),
    onSuccess: (data) => {
      toast.success(typeof data === 'string' ? data : 'Judge removed');
      refreshJudges();
    },
    onError: () => toast.error('Error deleting judge'),
    onSettled: () => setConfirmDelete({ open: false, id: null }),
  });

  const handleAddJudge = async () => {
    const trimmedEmails = judgeEmail
      .split(',')
      .map((e) => e.trim())
      .filter((e) => e);

    if (trimmedEmails.length === 0) {
      toast.warning('Judge email(s) cannot be empty');
      return;
    }

    const conflict = trimmedEmails.find((e) => participantsEmails.has(e));
    if (conflict) {
      toast.error(
        `${conflict} is already a participant in this competition and cannot be assigned as a judge.`
      );
      return;
    }

    assignJudges.mutate(trimmedEmails);
  };

  const handleConfirmDelete = () => {
    const judgeId = confirmDelete.id;
    if (judgeId) removeJudge.mutate(judgeId);
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Judges for: {competitionName}
        </h1>
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="judgeEmail">Judge Email(s)</Label>
          <Input
            id="judgeEmail"
            value={judgeEmail}
            onChange={(e) => setJudgeEmail(e.target.value)}
            placeholder="judge1@example.com, judge2@example.com"
          />
          <p className="text-xs text-muted-foreground">
            You can enter multiple emails separated by commas.
          </p>
        </div>
        <Button onClick={handleAddJudge}>Add Judge</Button>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {judgesPending ? (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">
                  Loading judges...
                </td>
              </tr>
            ) : judges.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">
                  No judges assigned yet.
                </td>
              </tr>
            ) : (
              judges.map((judge, index) => (
                <tr
                  key={judge.id || index}
                  className="border-b border-border last:border-0 hover:bg-muted/40"
                >
                  <td className="px-3 py-1.5 text-muted-foreground">
                    {(page - 1) * 10 + index + 1}
                  </td>
                  <td className="px-3 py-1.5 font-medium text-foreground">{judge.email}</td>
                  <td className="px-3 py-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-destructive text-destructive hover:bg-destructive/10"
                      onClick={() => setConfirmDelete({ open: true, id: judge.id })}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Page {page} of {totalPages}
        </p>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <Button
          variant="outline"
          onClick={() => navigate(`/OrganizerContestList/${email}`)}
        >
          Back to Contest List
        </Button>
      </div>

      <Dialog
        open={confirmDelete.open}
        onOpenChange={(open) => setConfirmDelete({ open, id: open ? confirmDelete.id : null })}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove judge?</DialogTitle>
            <DialogDescription>
              This will revoke the judge's assignment for this competition.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete({ open: false, id: null })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default OrganizerAddJudge;
