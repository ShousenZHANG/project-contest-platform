/**
 * JudgeSubmissions.jsx
 *
 * Allows judges to view, search, and review pending submissions. Migrated from MUI to shadcn/ui.
 *
 * Role: Judge
 * Developer: Zhaoyi Yang
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ChevronLeft, ChevronRight, Scale } from 'lucide-react';
import { judgeService } from '../services/judgeService';
import { queryKeys, staleTime } from '../api/queryKeys';
import { unwrap, toMessage } from '../api/queryFn';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

function JudgeSubmissions() {
  const { competitionId } = useParams();
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState(null);
  const navigate = useNavigate();

  const listParams = {
    competitionId,
    keyword,
    page,
    size: 10,
    sortOrder: 'desc',
  };

  const { data: listPage, isPending: loading, error } = useQuery({
    queryKey: queryKeys.judges.assignedSubmissions(competitionId, listParams),
    queryFn: () => unwrap(judgeService.getPendingSubmissions(listParams)),
    enabled: Boolean(competitionId),
    staleTime: staleTime.short,
  });

  const submissions = (listPage && listPage.data) || [];
  const totalPages = (listPage && listPage.pages) || 1;

  // Keyed by submission, so reopening a detail the judge already looked at
  // renders from cache.
  const { data: judgeDetail = null } = useQuery({
    queryKey: [...queryKeys.judges.all, 'detail', detailId],
    queryFn: () => unwrap(judgeService.getSubmissionDetail(detailId)),
    enabled: Boolean(detailId),
    staleTime: staleTime.medium,
  });

  const openDialog = Boolean(detailId);

  const handleViewJudgingDetail = (submissionId) => setDetailId(submissionId);

  return (
    <>
      <div className="p-6">
        <h2 className="mb-4 text-xl font-semibold text-foreground">
          Pending Submissions for Review
        </h2>

        <Input
          placeholder="Search by title..."
          value={keyword}
          onChange={(e) => {
            setPage(1);
            setKeyword(e.target.value);
          }}
          className="mb-4 max-w-md"
        />

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {toMessage(error)}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/40">
                    <tr className="text-left">
                      <th className="px-3 py-2 font-medium">#</th>
                      <th className="px-3 py-2 font-medium">Title</th>
                      <th className="px-3 py-2 font-medium">Description</th>
                      <th className="px-3 py-2 font-medium">Last Updated</th>
                      <th className="px-3 py-2 font-medium">File</th>
                      <th className="px-3 py-2 font-medium">Scored</th>
                      <th className="px-3 py-2 font-medium">Action</th>
                      <th className="px-3 py-2 font-medium">Rejudge</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((submission, index) => (
                      <tr key={submission.id} className="border-b last:border-b-0 hover:bg-muted/20">
                        <td className="px-3 py-2">{(page - 1) * 10 + index + 1}</td>
                        <td className="px-3 py-2 font-medium">{submission.title}</td>
                        <td className="px-3 py-2 text-muted-foreground max-w-xs truncate">
                          {submission.description}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {new Date(submission.lastUpdatedAt).toLocaleString()}
                        </td>
                        <td className="px-3 py-2">
                          <a
                            href={submission.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline-offset-4 hover:underline"
                          >
                            {submission.fileName || 'Download'}
                          </a>
                        </td>
                        <td className="px-3 py-2">
                          {submission.hasScored ? (
                            <Button
                              variant="link"
                              className="h-auto p-0 text-primary"
                              onClick={() => handleViewJudgingDetail(submission.id)}
                            >
                              Yes
                            </Button>
                          ) : (
                            <Badge variant="outline">No</Badge>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <Button
                            size="sm"
                            disabled={submission.hasScored}
                            onClick={() =>
                              navigate(`/RatingDetail/${competitionId}/${submission.id}`)
                            }
                          >
                            Review
                          </Button>
                        </td>
                        <td className="px-3 py-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!submission.hasScored}
                            onClick={() =>
                              navigate(`/ReRating/${competitionId}/${submission.id}`)
                            }
                          >
                            Rejudge
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {submissions.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                          No submissions found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Dialog open={openDialog} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2">
              <Scale className="h-5 w-5" />
              Judging Details
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Judge Comments:</strong>{' '}
              {judgeDetail?.judgeComments || 'No comments'}
            </p>
            <p>
              <strong>Total Score:</strong> {judgeDetail?.totalScore}
            </p>
            <p className="mt-3 font-semibold">Criteria Scores:</p>
            {judgeDetail?.scores?.map((s, idx) => (
              <div
                key={idx}
                className="rounded-md bg-muted/50 px-3 py-2"
              >
                <strong>{s.criterion}</strong>: {s.score}{' '}
                <span className="text-muted-foreground">(weight: {s.weight})</span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setDetailId(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default JudgeSubmissions;
