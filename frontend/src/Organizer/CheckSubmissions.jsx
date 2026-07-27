/**
 * @file CheckSubmissions.jsx
 * @description
 * Organizer submission review page. Migrated from MUI to shadcn/ui.
 * Compact table with Pagination, search, sort and a review Dialog.
 *
 * Role: Organizer
 */

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { Eye, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { competitionService } from '../services/competitionService';
import { submissionService } from '../services/registrationService';
import { queryKeys, staleTime } from '../api/queryKeys';
import { unwrap, toMessage } from '../api/queryFn';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
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

const SELECT_CLASS =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

const TEXTAREA_CLASS =
  'flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

function reviewVariant(status) {
  if (status === 'APPROVED') return 'success';
  if (status === 'REJECTED') return 'destructive';
  return 'warning';
}

function OrganizerSubmissions() {
  const { competitionId } = useParams();
  const navigate = useNavigate();
  const email = AuthTokenManager.getEmail();

  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [sortBy] = useState('createdAt');
  const [order, setOrder] = useState('desc');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reviewStatus, setReviewStatus] = useState('');
  const [reviewComments, setReviewComments] = useState('');

  const queryClient = useQueryClient();

  const listParams = { competitionId, page, size: 10, keyword, sortBy, order };
  const listKey = queryKeys.submissions.byCompetition(competitionId, listParams);

  const { data: listPage, isPending: loading } = useQuery({
    queryKey: listKey,
    queryFn: () => unwrap(submissionService.getPublic(listParams)),
    enabled: Boolean(competitionId),
    staleTime: staleTime.short,
  });

  const submissions = listPage?.data ?? [];
  const totalPages = listPage?.pages ?? 1;
  const totalCount = listPage?.total ?? 0;

  const { data: competition } = useQuery({
    queryKey: queryKeys.competitions.detail(competitionId),
    queryFn: () => unwrap(competitionService.getById(competitionId)),
    enabled: Boolean(competitionId),
    staleTime: staleTime.medium,
  });

  const competitionName = competition?.name || 'Unnamed Competition';

  const reviewSubmission = useMutation({
    mutationFn: (data) => unwrap(submissionService.review(data)),
    onSuccess: () => {
      toast.success('Review submitted successfully');
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.submissions.all });
    },
    onError: (error) => toast.error('Review failed: ' + toMessage(error)),
  });

  const handleSearch = (e) => {
    setKeyword(e.target.value);
    setPage(1);
  };

  const handleSortToggle = () => {
    setOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    setPage(1);
  };

  const handleViewDetail = (submission) => {
    setSelectedSubmission(submission);
    setReviewStatus(
      ['APPROVED', 'REJECTED'].includes(submission.reviewStatus) ? submission.reviewStatus : ''
    );
    setReviewComments(submission.reviewComments || '');
    setDialogOpen(true);
  };

  const handleReviewSubmit = () => {
    if (!selectedSubmission) return;
    reviewSubmission.mutate({
      submissionId: selectedSubmission.id,
      reviewStatus,
      reviewComments,
    });
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Submissions for: {competitionName}
        </h1>
      </div>

      <div className="mb-4 flex gap-2">
        <Input
          placeholder="Search by title or description"
          value={keyword}
          onChange={handleSearch}
          className="max-w-md"
        />
        <Button variant="outline" onClick={handleSortToggle}>
          Sort: {sortBy} ({order.toUpperCase()})
        </Button>
      </div>

      {loading ? (
        <div
          className="flex justify-center py-12"
          role="progressbar"
          aria-label="Loading submissions"
          aria-busy="true"
        >
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
        </div>
      ) : (
        <>
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2">Submitted</th>
                  <th className="px-3 py-2">Score</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {submissions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                      No submissions found.
                    </td>
                  </tr>
                ) : (
                  submissions.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-border last:border-0 hover:bg-muted/40"
                    >
                      <td className="px-3 py-1.5 font-medium text-foreground">{s.title}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">
                        <span className="line-clamp-1">{s.description}</span>
                      </td>
                      <td className="px-3 py-1.5 text-muted-foreground">
                        {new Date(s.createdAt).toLocaleString()}
                      </td>
                      <td className="px-3 py-1.5">
                        {s.totalScore != null ? (
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0"
                            onClick={() => navigate(`/submissions/${competitionId}/ratings`)}
                          >
                            {s.totalScore}
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5">
                        <Badge variant={reviewVariant(s.reviewStatus)}>
                          {s.reviewStatus ?? 'PENDING'}
                        </Badge>
                      </td>
                      <td className="px-3 py-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewDetail(s)}
                          aria-label="View detail"
                        >
                          <Eye className="h-4 w-4" />
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

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Submission Review</DialogTitle>
                <DialogDescription>
                  Approve or reject the submission and add review comments.
                </DialogDescription>
              </DialogHeader>
              {selectedSubmission && (
                <div className="space-y-3 text-sm">
                  <p>
                    <strong>Title:</strong> {selectedSubmission.title}
                  </p>
                  <p>
                    <strong>Description:</strong> {selectedSubmission.description}
                  </p>
                  <p>
                    <strong>File:</strong>{' '}
                    <a
                      href={selectedSubmission.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline"
                    >
                      {selectedSubmission.fileName}
                    </a>
                  </p>
                  <p>
                    <strong>Type:</strong> {selectedSubmission.fileType}
                  </p>
                  <p>
                    <strong>Time:</strong>{' '}
                    {new Date(selectedSubmission.createdAt).toLocaleString()}
                  </p>
                  {selectedSubmission.fileType?.startsWith('image') && (
                    <img
                      src={selectedSubmission.fileUrl}
                      alt="preview"
                      className="max-w-full rounded-md border border-border"
                    />
                  )}
                  <div className="space-y-1.5">
                    <Label htmlFor="reviewStatus">Review Status</Label>
                    <select
                      id="reviewStatus"
                      value={reviewStatus}
                      onChange={(e) => setReviewStatus(e.target.value)}
                      className={SELECT_CLASS}
                    >
                      <option value="">Select status</option>
                      <option value="APPROVED">APPROVED</option>
                      <option value="REJECTED">REJECTED</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="reviewComments">Review Comments</Label>
                    <textarea
                      id="reviewComments"
                      rows={4}
                      value={reviewComments}
                      onChange={(e) => setReviewComments(e.target.value)}
                      className={TEXTAREA_CLASS}
                    />
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleReviewSubmit}>Submit Review</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="mt-4">
            <Button
              variant="outline"
              onClick={() => navigate(`/OrganizerContestList/${email}`)}
            >
              Back to Contest List
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export default OrganizerSubmissions;
