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

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/api/apiClient';
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
  const [registrations, setRegistrations] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    size: 10,
    pages: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openTeamDialog, setOpenTeamDialog] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState({
    competitionId: null,
    teamId: null,
  });
  const [allowedTypes] = useState([]);

  const navigate = useNavigate();

  const fetchAllTeamRegistrations = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError('');
      try {
        const teamsRes = await apiClient.get('/teams/my-joined', {
          params: { page, size: pagination.size },
        });
        const teamsData = teamsRes.data;
        const teamsList = Array.isArray(teamsData.data) ? teamsData.data : [];

        const regs = [];
        for (const team of teamsList) {
          try {
            const compRes = await apiClient.get(
              `/registrations/teams/${team.id}/competitions`,
              { params: { page: 1, size: 100 } }
            );
            const compData = compRes.data;
            const compList = Array.isArray(compData.data) ? compData.data : [];
            compList.forEach((c) => {
              regs.push({
                competitionId: c.competitionId || c.id,
                competitionName: c.competitionName || c.name || '',
                teamId: team.id,
                teamName: team.name,
                hasSubmitted: c.hasSubmitted,
                fileName: c.fileName || '',
                reviewStatus: c.reviewStatus || '',
              });
            });
          } catch {
            // skip teams where competition fetch fails
          }
        }

        setRegistrations(regs);
        setPagination({
          total: teamsData.total || regs.length,
          page: teamsData.page || page,
          size: teamsData.size || pagination.size,
          pages: teamsData.pages || 1,
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[TeamRegistrations] error:', err);
        setError(
          err.response?.data?.error ||
            err.message ||
            'Failed to load team registrations.'
        );
        setRegistrations([]);
      } finally {
        setLoading(false);
      }
    },
    [pagination.size]
  );

  useEffect(() => {
    if (!userData) return;
    fetchAllTeamRegistrations(pagination.page);
  }, [userData, pagination.page, fetchAllTeamRegistrations]);

  useEffect(() => {
    if (loading || error) return;
    registrations.forEach(async (reg) => {
      if (reg.hasSubmitted && !reg.fileName) {
        try {
          const res = await apiClient.get(
            `/submissions/public/teams/${reg.competitionId}/${reg.teamId}`
          );
          const sub = res.data;
          setRegistrations((prev) =>
            prev.map((r) =>
              r.teamId === reg.teamId && r.competitionId === reg.competitionId
                ? { ...r, fileName: sub.fileName, reviewStatus: sub.reviewStatus }
                : r
            )
          );
        } catch {
          // 404s ignored for enrichment
        }
      }
    });
  }, [registrations, loading, error]);

  const openSubmissionDialog = async (competitionId, teamId) => {
    const userId = userData?.userId || AuthTokenManager.getUserId();
    if (!userId) {
      const msg = 'You are not logged in or user ID is missing.';
      setError(msg);
      toast.error(msg);
      return;
    }

    try {
      const res = await apiClient.get('/teams/public/created', {
        params: { userId, page: 1, size: 100 },
      });

      const isCreator = (res.data.data || []).some(
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

      await apiClient.post(
        `/submissions/teams/upload?${params.toString()}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      setRegistrations((prev) =>
        prev.map((r) =>
          r.teamId === teamId && r.competitionId === competitionId
            ? { ...r, hasSubmitted: true, fileName: file.name }
            : r
        )
      );
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
