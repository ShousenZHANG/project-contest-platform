/**
 * Project.jsx
 *
 * Participant project list & submissions. Migrated from MUI to shadcn/ui.
 *
 * Role: Participant
 * Developer: Beiqi Dai
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Trophy, ChevronLeft, ChevronRight } from 'lucide-react';
import apiClient from '../../api/apiClient';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { SubmitDialog } from './Submitbottom';
import TeamRegistrations from '../team/TeamRegistrations';

function Project() {
  const [userData, setUserData] = useState(null);
  const [registrationData, setRegistrationData] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, size: 10, pages: 0 });
  const [allowedTypes, setAllowedTypes] = useState([]);
  const [viewMode, setViewMode] = useState('personal');

  const [openSubmitDialog, setOpenSubmitDialog] = useState(false);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get('/users/profile');
        setUserData(res.data);
      } catch (error) {
        // Failed to fetch user data
      }
    })();
  }, []);

  const fetchRegistrations = useCallback(
    async (currentPage = 1) => {
      try {
        const res = await apiClient.get('/registrations/my', {
          params: { page: currentPage, size: pagination.size },
        });
        const data = res.data;
        setRegistrationData(Array.isArray(data.data) ? data.data : []);
        setPagination((prev) => ({
          ...prev,
          total: data.total ?? 0,
          page: data.page ?? 1,
          pages: data.pages ?? 0,
        }));
      } catch (error) {
        setRegistrationData([]);
      }
    },
    [pagination.size]
  );

  useEffect(() => {
    if (!userData) return;
    if (viewMode === 'personal') {
      fetchRegistrations(pagination.page);
    }
  }, [userData, pagination.page, viewMode, fetchRegistrations]);

  useEffect(() => {
    if (viewMode !== 'personal' || !userData || registrationData.length === 0) return;
    registrationData
      .filter((item) => item.hasSubmitted && !item.fileName)
      .forEach(async (item) => {
        try {
          const res = await apiClient.get(`/submissions/${item.competitionId}`);
          const submissionData = res.data;
          setRegistrationData((prev) =>
            prev.map((reg) =>
              reg.competitionId === item.competitionId
                ? {
                    ...reg,
                    fileName: submissionData.fileName,
                    reviewStatus: submissionData.reviewStatus,
                  }
                : reg
            )
          );
        } catch (err) {
          // Error fetching submission details
        }
      });
  }, [registrationData, userData, viewMode]);

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
      const detailRes = await apiClient.get(`/competitions/${selectedCompetitionId}`);
      const competitionDetail = detailRes.data;
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

      await apiClient.post('/submissions/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Submission uploaded!');
      setRegistrationData((prev) =>
        prev.map((item) =>
          item.competitionId === selectedCompetitionId
            ? { ...item, hasSubmitted: true, fileName: file.name }
            : item
        )
      );
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
                      {registrationData.length === 0 && (
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
                onClick={() => setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
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
                onClick={() => setPagination((prev) => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
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
