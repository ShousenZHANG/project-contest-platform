/**
 * @file TeamRegistrations.jsx
 * @description
 * Lists competitions registered by the user's teams; team leaders can submit.
 * Migrated from MUI to shadcn/ui + Tailwind. Compact density. Sonner replaces
 * Alert; native pagination buttons replace MUI Pagination. SubmitDialog is
 * still imported from project/Submitbottom (Phase 8 — keep MUI for now).
 *
 * Role: Participant (Team Leader)
 * Developer: Beiqi Dai
 */

import React, { useState } from 'react';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { teamService } from '@/services/teamService';
import { registrationService, submissionService } from '@/services/registrationService';
import { queryKeys, staleTime } from '@/api/queryKeys';
import { unwrap, toMessage } from '@/api/queryFn';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SubmitDialog } from '../project/Submitbottom';
import AuthTokenManager from '@/auth/authTokenManager';


function reviewBadgeVariant(status) {
  const s = (status || '').toUpperCase();
  if (s === 'APPROVED') return 'success';
  if (s === 'REJECTED') return 'destructive';
  if (s === 'PENDING') return 'warning';
  return 'secondary';
}

function TeamRegistrations({ userData }) {
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    size: 10,
    pages: 0,
  });
  const [error, setError] = useState('');
  const [openTeamDialog, setOpenTeamDialog] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState({
    competitionId: null,
    teamId: null,
  });
  const [allowedTypes] = useState([]);

  const navigate = useNavigate();

  const queryClient = useQueryClient();
  const PAGE_SIZE = pagination.size;

  const teamsParams = { page: pagination.page, size: PAGE_SIZE };

  const { data: teamsPage, isPending: teamsPending } = useQuery({
    queryKey: queryKeys.teams.myJoined(teamsParams),
    queryFn: () => unwrap(teamService.getMyJoined(teamsParams)),
    enabled: Boolean(userData),
    staleTime: staleTime.short,
  });

  const teamsList = Array.isArray(teamsPage && teamsPage.data) ? teamsPage.data : [];

  // One query per team instead of a sequential for-loop, so ten teams cost one
  // round trip rather than ten in a row, and each is cached on its own key.
  const competitionQueries = useQueries({
    queries: teamsList.map((team) => ({
      queryKey: [...queryKeys.registrations.all, 'teamCompetitions', team.id],
      queryFn: () =>
        unwrap(registrationService.getTeamCompetitions(team.id, { page: 1, size: 100 })),
      staleTime: staleTime.short,
    })),
  });

  const baseRegistrations = teamsList.flatMap((team, i) => {
    const payload = competitionQueries[i] && competitionQueries[i].data;
    const list = Array.isArray(payload && payload.data) ? payload.data : [];
    return list.map((c) => ({
      competitionId: c.competitionId || c.id,
      competitionName: c.competitionName || c.name || '',
      teamId: team.id,
      teamName: team.name,
      hasSubmitted: c.hasSubmitted,
      fileName: c.fileName || '',
      reviewStatus: c.reviewStatus || '',
    }));
  });

  // Rows that claim a submission but carry no file name need a second read.
  // This was an effect writing back into the state it depended on.
  const needsDetail = baseRegistrations.filter((r) => r.hasSubmitted && !r.fileName);

  const detailQueries = useQueries({
    queries: needsDetail.map((r) => ({
      queryKey: [
        ...queryKeys.submissions.all,
        'teamSubmission',
        r.competitionId,
        r.teamId,
      ],
      queryFn: () =>
        unwrap(submissionService.getTeamSubmission(r.competitionId, r.teamId)),
      retry: false,
      staleTime: staleTime.medium,
    })),
  });

  const detailByRow = {};
  needsDetail.forEach((r, i) => {
    const detail = detailQueries[i] && detailQueries[i].data;
    if (detail) detailByRow[`${r.teamId}:${r.competitionId}`] = detail;
  });

  const registrations = baseRegistrations.map((r) => {
    const detail = detailByRow[`${r.teamId}:${r.competitionId}`];
    return detail
      ? { ...r, fileName: detail.fileName, reviewStatus: detail.reviewStatus }
      : r;
  });

  const loading = teamsPending || competitionQueries.some((q) => q.isPending);

  const openSubmissionDialog = async (competitionId, teamId) => {
    const userId = userData?.userId || AuthTokenManager.getUserId();
    if (!userId) {
      const msg = 'You are not logged in or user ID is missing.';
      setError(msg);
      toast.error(msg);
      return;
    }

    try {
      const createdParams = { userId, page: 1, size: 100 };
      const created = await queryClient.fetchQuery({
        queryKey: queryKeys.teams.created(createdParams),
        queryFn: () => unwrap(teamService.getCreatedTeams(createdParams)),
        staleTime: staleTime.medium,
      });

      const isCreator = ((created && created.data) || []).some(
        (team) => team.id === teamId
      );

      if (!isCreator) {
        const msg = 'You are not the team leader. Please ask the leader to submit.';
        setError(msg);
        toast.error(msg);
        return;
      }

      setSelectedTeam({ competitionId, teamId });
      setOpenTeamDialog(true);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[openSubmissionDialog]', err);
      const msg = 'Unable to verify team leader status.';
      setError(msg);
      toast.error(msg);
    }
  };

  const handleCloseTeamDialog = () => setOpenTeamDialog(false);

  const handleTeamDialogSubmit = async ({ title, description, file }) => {
    if (!file) {
      const msg = 'Please select a file to upload!';
      setError(msg);
      toast.error(msg);
      setOpenTeamDialog(false);
      return;
    }
    try {
      const { competitionId, teamId } = selectedTeam;
      const params = new URLSearchParams({
        competitionId,
        teamId,
        title,
        description,
      });
      const formData = new FormData();
      formData.append('file', file);

      formData.append('competitionId', competitionId);
      formData.append('teamId', teamId);
      formData.append('title', title);
      formData.append('description', description);

      await unwrap(submissionService.uploadForTeam(formData));

      queryClient.invalidateQueries({ queryKey: queryKeys.registrations.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.submissions.all });
      toast.success('Submission uploaded.');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[TeamRegistrations] submission error:', err);
      const msg = 'Team upload failed. Please try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setOpenTeamDialog(false);
    }
  };

  const handleViewDetail = (competitionId, teamId) => {
    navigate(`/team-project-detail/${competitionId}/team/${teamId}`);
  };

  const goToPage = (p) => {
    if (p < 1 || p > pagination.pages) return;
    setPagination((prev) => ({ ...prev, page: p }));
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">
        Team Submission Records
      </h2>
      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/60 text-foreground">
                <tr>
                  <th className="px-3 py-2 font-semibold">Competition Name</th>
                  <th className="px-3 py-2 font-semibold">Team Name</th>
                  <th className="px-3 py-2 font-semibold">Submitted File</th>
                  <th className="px-3 py-2 font-semibold">Review Status</th>
                </tr>
              </thead>
              <tbody>
                {registrations.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-6 text-center text-muted-foreground"
                    >
                      No team registrations.
                    </td>
                  </tr>
                ) : (
                  registrations.map((item, idx) => (
                    <tr
                      key={`${item.teamId}-${item.competitionId}-${idx}`}
                      className="border-t border-border"
                    >
                      <td className="px-3 py-2">{item.competitionName}</td>
                      <td className="px-3 py-2">{item.teamName}</td>
                      <td className="px-3 py-2">
                        {!item.hasSubmitted ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              openSubmissionDialog(
                                item.competitionId,
                                item.teamId
                              )
                            }
                          >
                            Submit
                          </Button>
                        ) : item.fileName ? (
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto px-0"
                            onClick={() =>
                              handleViewDetail(item.competitionId, item.teamId)
                            }
                          >
                            {item.fileName}
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">Pending</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={reviewBadgeVariant(item.reviewStatus)}>
                          {(item.reviewStatus || 'PENDING').toUpperCase()}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={pagination.page <= 1}
            onClick={() => goToPage(pagination.page - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.pages}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={pagination.page >= pagination.pages}
            onClick={() => goToPage(pagination.page + 1)}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <SubmitDialog
        open={openTeamDialog}
        onClose={handleCloseTeamDialog}
        onSubmit={handleTeamDialogSubmit}
        allowedTypes={allowedTypes}
      />
    </div>
  );
}

export default TeamRegistrations;
