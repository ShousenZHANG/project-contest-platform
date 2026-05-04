/**
 * @file ViewSubmission.jsx
 * @description
 * Lists approved submissions for a competition with vote/comment actions.
 * Migrated from MUI to shadcn/ui + Tailwind. Compact table density. Uses
 * sonner for transient errors and shadcn Button for actions.
 *
 * Role: Participant
 * Developer: Zhaoyi Yang
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Loader2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/api/apiClient';
import ViewVote from '../ViewVote';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

function reviewBadgeVariant(status) {
  const s = (status || '').toUpperCase();
  if (s === 'APPROVED') return 'success';
  if (s === 'REJECTED') return 'destructive';
  if (s === 'PENDING') return 'warning';
  return 'secondary';
}

function ViewSubmission() {
  const { competitionId } = useParams();
  const navigate = useNavigate();

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const res = await apiClient.get(
          `/submissions/public/approved?competitionId=${competitionId}`
        );
        setSubmissions(res.data.data || []);
      } catch (error) {
        const msg =
          error.response?.data ||
          error.message ||
          'Network error fetching submissions';
        setErrorMessage(typeof msg === 'string' ? msg : 'Network error');
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, [competitionId]);

  useEffect(() => {
    if (errorMessage) toast.error(errorMessage);
  }, [errorMessage]);

  const handleOpenCommentsPage = (submissionId) => {
    navigate(`/comments/${submissionId}`);
  };

  const handleGoBack = () => navigate(-1);

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex items-center">
          <Button variant="ghost" size="sm" onClick={handleGoBack}>
            <ArrowLeft className="h-4 w-4" />
            Go back
          </Button>
        </div>

        <h1 className="mb-6 text-center text-3xl font-bold text-foreground">
          Approved Submissions
        </h1>

        {loading ? (
          <div className="flex h-[40vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : errorMessage ? (
          <p className="text-center text-destructive">{errorMessage}</p>
        ) : submissions.length === 0 ? (
          <p className="text-center text-muted-foreground">
            No approved submissions found.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-primary text-primary-foreground">
                  <tr>
                    <th className="px-3 py-2 text-center font-semibold">Title</th>
                    <th className="px-3 py-2 text-center font-semibold">
                      Description
                    </th>
                    <th className="px-3 py-2 text-center font-semibold">
                      File Name
                    </th>
                    <th className="px-3 py-2 text-center font-semibold">
                      File Type
                    </th>
                    <th className="px-3 py-2 text-center font-semibold">File</th>
                    <th className="px-3 py-2 text-center font-semibold">
                      Review Status
                    </th>
                    <th className="px-3 py-2 text-center font-semibold">Vote</th>
                    <th className="px-3 py-2 text-center font-semibold">
                      Comment
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((submission) => {
                    const sid = submission.id || submission._id;
                    return (
                      <tr
                        key={sid}
                        className="border-b border-border last:border-0 hover:bg-muted/40"
                      >
                        <td className="px-3 py-2 text-center text-foreground">
                          {submission.title}
                        </td>
                        <td className="px-3 py-2 text-center text-foreground">
                          {submission.description}
                        </td>
                        <td className="px-3 py-2 text-center text-foreground">
                          {submission.fileName}
                        </td>
                        <td className="px-3 py-2 text-center text-foreground">
                          {submission.fileType}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Button asChild size="sm">
                            <a
                              href={submission.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              View File
                            </a>
                          </Button>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Badge variant={reviewBadgeVariant(submission.reviewStatus)}>
                            {submission.reviewStatus}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <ViewVote submissionId={sid} />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenCommentsPage(sid)}
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            View comment
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ViewSubmission;
