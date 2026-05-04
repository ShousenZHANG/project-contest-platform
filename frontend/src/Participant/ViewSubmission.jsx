/**
 * ViewSubmission.jsx
 *
 * Participant view for submission details. Migrated from MUI to shadcn/ui.
 *
 * Role: Participant
 * Developer: Beiqi Dai
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../api/apiClient';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import ViewVote from './ViewVote';

function ViewSubmission() {
  const navigate = useNavigate();
  const { submissionId } = useParams();

  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get(`/submissions/public/${submissionId}`)
      .then((res) => {
        setSubmission(res.data);
        setLoading(false);
      })
      .catch(() => {
        toast.error('Failed to obtain the work information');
        setLoading(false);
      });
  }, [submissionId]);

  const handleOpenCommentsPage = () => {
    navigate(`/comments/${submissionId}`);
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-warning" />
        <p className="mt-3 text-sm text-muted-foreground">
          Loading the work information...
        </p>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="p-6">
        <p className="text-lg font-medium text-destructive">
          The work was not found.
        </p>
        <Button onClick={handleGoBack} className="mt-3">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Button
        variant="ghost"
        onClick={handleGoBack}
        className="mb-4 text-warning hover:text-warning hover:bg-warning/10"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Go back
      </Button>

      <h1 className="mb-6 text-center text-2xl font-bold text-foreground">
        Submission Details
      </h1>

      <Card className="shadow-md">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-warning text-warning-foreground">
                <tr>
                  <th className="px-3 py-3 text-center font-medium">Title</th>
                  <th className="px-3 py-3 text-center font-medium">Description</th>
                  <th className="px-3 py-3 text-center font-medium">File Name</th>
                  <th className="px-3 py-3 text-center font-medium">File Type</th>
                  <th className="px-3 py-3 text-center font-medium">File</th>
                  <th className="px-3 py-3 text-center font-medium">Review Status</th>
                  <th className="px-3 py-3 text-center font-medium">Vote</th>
                  <th className="px-3 py-3 text-center font-medium">Comment</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-3 py-3 text-center">{submission.title}</td>
                  <td className="px-3 py-3 text-center">{submission.description}</td>
                  <td className="px-3 py-3 text-center">{submission.fileName}</td>
                  <td className="px-3 py-3 text-center">{submission.fileType}</td>
                  <td className="px-3 py-3 text-center">
                    <Button
                      asChild
                      className="bg-warning text-warning-foreground hover:bg-warning/90"
                    >
                      <a href={submission.fileUrl} target="_blank" rel="noopener noreferrer">
                        View File
                      </a>
                    </Button>
                  </td>
                  <td className="px-3 py-3 text-center">{submission.reviewStatus}</td>
                  <td className="px-3 py-3 text-center">
                    <ViewVote submissionId={submissionId} />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <Button
                      variant="outline"
                      onClick={handleOpenCommentsPage}
                      className="border-warning text-warning hover:bg-warning/10"
                    >
                      View comment
                    </Button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ViewSubmission;
