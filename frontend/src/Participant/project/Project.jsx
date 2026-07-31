/**
 * Project.jsx
 *
 * Participant project list & submissions. Migrated from MUI to shadcn/ui.
 *
 * Role: Participant
 * Developer: Beiqi Dai
 */

import React, { useState } from 'react';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Trophy, ChevronLeft, ChevronRight } from 'lucide-react';
import { userService } from '../../services/userService';
import { competitionService } from '../../services/competitionService';
import { registrationService, submissionService } from '../../services/registrationService';
import { queryKeys, staleTime } from '../../api/queryKeys';
import { unwrap } from '../../api/queryFn';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { SubmitDialog } from './Submitbottom';
import TeamRegistrations from '../team/TeamRegistrations';

function Project() {
  const [page, setPage] = useState(1);
  const [allowedTypes, setAllowedTypes] = useState([]);
  const [viewMode, setViewMode] = useState('personal');
  const PAGE_SIZE = 10;

  const [openSubmitDialog, setOpenSubmitDialog] = useState(false);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState(null);

  const navigate = useNavigate();

  const queryClient = useQueryClient();

  const { data: userData = null } = useQuery({
    queryKey: queryKeys.users.profile(),
    queryFn: () => unwrap(userService.getProfile()),
    staleTime: staleTime.long,
  });

  const listParams = { page, size: PAGE_SIZE };

  const { data: registrationPage, isPending: registrationsPending } = useQuery({
    queryKey: queryKeys.registrations.mine(listParams),
    queryFn: () => unwrap(registrationService.getMyRegistrations(listParams)),
    enabled: Boolean(userData) && viewMode === 'personal',
    staleTime: staleTime.short,
  });

  const registrations = Array.isArray(registrationPage && registrationPage.data)
    ? registrationPage.data
    : [];

  const pagination = {
    total: (registrationPage && registrationPage.total) || 0,
    page: (registrationPage && registrationPage.page) || 1,
    size: PAGE_SIZE,
    pages: (registrationPage && registrationPage.pages) || 0,
  };

  // Rows that say a submission exists but carry no file name need a second
  // read to fill it in. This used to be an effect that wrote back into the same
  // state it depended on, which is a re-render loop waiting to happen.
  const needsDetail = registrations.filter((r) => r.hasSubmitted && !r.fileName);

  const detailQueries = useQueries({
    queries: needsDetail.map((r) => ({
      queryKey: queryKeys.submissions.detail(r.competitionId),
      queryFn: () => unwrap(submissionService.getMine(r.competitionId)),
      staleTime: staleTime.medium,
    })),
  });

  const detailByCompetition = {};
  needsDetail.forEach((r, i) => {
    const detail = detailQueries[i] && detailQueries[i].data;
    if (detail) detailByCompetition[r.competitionId] = detail;
  });

  const registrationData = registrations.map((r) => {
    const detail = detailByCompetition[r.competitionId];
    return detail
      ? { ...r, fileName: detail.fileName, reviewStatus: detail.reviewStatus }
      : r;
  });

  const handleOpenSubmitDialog = (competitionId) => {
    setSelectedCompetitionId(competitionId);
    setOpenSubmitDialog(true);
  };

  const handleCloseSubmitDialog = () => {
    setOpenSubmitDialog(false);
    setSelectedCompetitionId(null);
  };

  const handleDialogSubmit = async ({ title, description, file }) => {
    if (!file) {
      toast.warning('Please select a file to upload!');
      handleCloseSubmitDialog();
      return;
    }

    try {
      // fetchQuery reuses the cached competition when the detail page or a
      // sibling view has already read it.
      const competitionDetail = await queryClient.fetchQuery({
        queryKey: queryKeys.competitions.detail(selectedCompetitionId),
        queryFn: () => unwrap(competitionService.getById(selectedCompetitionId)),
        staleTime: staleTime.medium,
      });
      const allowedSubmissionTypes = competitionDetail.allowedSubmissionTypes || [];
      setAllowedTypes(allowedSubmissionTypes);

      const fileExtension = file.name.split('.').pop().toLowerCase();
      const allowedLower = allowedSubmissionTypes.map((t) => t.toLowerCase());
      const extensionMap = {
        image: ['jpg', 'jpeg', 'png'],
        code: ['py', 'js', 'ts', 'java', 'cpp', 'c', 'cs', 'rb', 'go', 'rs', 'swift', 'kt'],
        text: ['txt', 'md', 'rtf', 'csv', 'log', 'doc', 'docx', 'pdf', 'odt'],
      };
      const isMatched =
        allowedLower.includes(fileExtension) ||
        Object.entries(extensionMap).some(
          ([key, list]) => allowedLower.includes(key) && list.includes(fileExtension)
        );
      if (!isMatched) {
        const readable = allowedSubmissionTypes.flatMap((type) => {
          const lower = type.toLowerCase();
          return extensionMap[lower] || [type];
        });
        toast.warning(`Invalid file type. Allowed: ${readable.join(', ')}`);
        handleCloseSubmitDialog();
        return;
      }

      const formData = new FormData();
      formData.append('competitionId', selectedCompetitionId);
      formData.append('title', title);
      formData.append('description', description);
      formData.append('file', file);

      await unwrap(submissionService.upload(formData));

      toast.success('Submission uploaded!');
      queryClient.invalidateQueries({ queryKey: queryKeys.registrations.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.submissions.all });
    } catch (error) {
      toast.error('Upload failed. Please try again.');
    } finally {
      handleCloseSubmitDialog();
    }
  };

  const handleViewSubmissionDetail = (competitionId) => {
    navigate(`/project-detail/${competitionId}`);
  };

  const reviewBadgeVariant = (status) => {
    const s = (status || '').toUpperCase();
    if (s === 'APPROVED') return 'success';
    if (s === 'REJECTED') return 'destructive';
    if (s === 'PENDING') return 'warning';
    return 'secondary';
  };

  return (
    <>
      <div className="p-6">
        {/* Header */}
        <div className="mb-5 flex items-center gap-3 rounded-lg border bg-card p-4 shadow-sm">
          <Trophy className="h-7 w-7 text-warning" />
          <h2 className="text-2xl font-bold text-foreground">Joined Competitions</h2>
        </div>

        {/* Toggle */}
        <div className="mb-4 flex gap-2">
          <Button
            variant={viewMode === 'personal' ? 'default' : 'outline'}
            onClick={() => setViewMode('personal')}
            className={viewMode === 'personal' ? 'bg-warning text-warning-foreground hover:bg-warning/90' : 'border-warning text-warning hover:bg-warning/10'}
          >
            Individual
          </Button>
          <Button
            variant={viewMode === 'team' ? 'default' : 'outline'}
            onClick={() => setViewMode('team')}
            className={viewMode === 'team' ? 'bg-warning text-warning-foreground hover:bg-warning/90' : 'border-warning text-warning hover:bg-warning/10'}
          >
            Team
          </Button>
        </div>

        {viewMode === 'personal' ? (
          <>
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/40">
                      <tr className="text-left">
                        <th className="px-3 py-2 font-medium">Contest Name</th>
                        <th className="px-3 py-2 font-medium">Category</th>
                        <th className="px-3 py-2 font-medium">Competition Status</th>
                        <th className="px-3 py-2 font-medium">Submission Name</th>
                        <th className="px-3 py-2 font-medium">Submission Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registrationData.map((item, idx) => (
                        <tr
                          key={`${item.competitionId}-${idx}`}
                          className="border-b last:border-b-0 hover:bg-muted/20"
                        >
                          <td className="px-3 py-2 font-medium">{item.competitionName}</td>
                          <td className="px-3 py-2 text-muted-foreground">{item.category}</td>
                          <td className="px-3 py-2">
                            <Badge variant="outline">{item.status || 'Unknown'}</Badge>
                          </td>
                          <td className="px-3 py-2">
                            {!item.hasSubmitted ? (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={item.status !== 'ONGOING'}
                                onClick={() => handleOpenSubmitDialog(item.competitionId)}
                              >
                                Submit
                              </Button>
                            ) : (
                              <Button
                                variant="link"
                                className="h-auto p-0 text-primary"
                                onClick={() => handleViewSubmissionDetail(item.competitionId)}
                              >
                                {item.fileName || 'No file'}
                              </Button>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {item.hasSubmitted ? (
                              <Badge variant={reviewBadgeVariant(item.reviewStatus)}>
                                {(item.reviewStatus || 'PENDING').toUpperCase()}
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Not Submitted</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                      {registrationsPending && (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                            Loading your registrations...
                          </td>
                        </tr>
                      )}
                      {!registrationsPending && registrationData.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                            No registrations yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Pagination */}
            <div className="mt-4 flex items-center justify-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={pagination.page <= 1}
                aria-label="Previous page"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.pages || 1}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={pagination.page >= pagination.pages}
                aria-label="Next page"
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <TeamRegistrations userData={userData} />
        )}
      </div>

      <SubmitDialog
        open={openSubmitDialog}
        onClose={handleCloseSubmitDialog}
        onSubmit={handleDialogSubmit}
        allowedTypes={allowedTypes}
      />
    </>
  );
}

export default Project;
