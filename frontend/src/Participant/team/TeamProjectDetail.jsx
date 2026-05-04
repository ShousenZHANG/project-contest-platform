/**
 * @file TeamProjectDetail.jsx
 * @description
 * View, edit, or delete a team's submission. Migrated from MUI to shadcn/ui
 * + Tailwind. confirm() replaced with shadcn Dialog. sonner replaces Snackbar.
 *
 * Role: Participant (Team Leader)
 * Developer: Beiqi Dai
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  Pencil,
  Trash2,
  Save,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function reviewBadgeVariant(status) {
  const s = (status || '').toUpperCase();
  if (s === 'APPROVED') return 'success';
  if (s === 'REJECTED') return 'destructive';
  if (s === 'PENDING') return 'warning';
  return 'secondary';
}

function TeamProjectDetail() {
  const { competitionId, teamId } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreator, setIsCreator] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [updatedTitle, setUpdatedTitle] = useState('');
  const [updatedDescription, setUpdatedDescription] = useState('');
  const [updatedFile, setUpdatedFile] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const userId = localStorage.getItem('userId');

  useEffect(() => {
    const fetchSubmission = async () => {
      try {
        const res = await apiClient.get(
          `/submissions/public/teams/${competitionId}/${teamId}`
        );
        const data = res.data;
        setSubmission(data);
        setUpdatedTitle(data.title || '');
        setUpdatedDescription(data.description || '');
      } catch (err) {
        if (err.response?.status === 404) setError('Submission not found.');
        else
          setError(
            err.response?.data || err.message || 'Failed to load submission.'
          );
      } finally {
        setLoading(false);
      }
    };

    const checkIfCreator = async () => {
      try {
        const res = await apiClient.get('/teams/public/created', {
          params: { userId, page: 1, size: 100 },
        });
        const is = res.data.data?.some((team) => team.id === teamId);
        setIsCreator(Boolean(is));
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to verify creator:', err);
      }
    };

    fetchSubmission();
    checkIfCreator();
  }, [competitionId, teamId, userId]);

  const handleSaveEdit = async () => {
    try {
      const formData = new FormData();
      formData.append('competitionId', competitionId);
      formData.append('teamId', teamId);
      formData.append('title', updatedTitle);
      formData.append('description', updatedDescription);
      if (updatedFile) formData.append('file', updatedFile);

      await apiClient.post('/submissions/teams/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Submission updated successfully!');
      setEditMode(false);
    } catch (err) {
      const msg = err.response?.data || err.message;
      toast.error(typeof msg === 'string' ? msg : 'Update failed');
    }
  };

  const handleDelete = async () => {
    setConfirmDelete(false);
    if (!submission?.submissionId) return;
    try {
      await apiClient.delete(
        `/submissions/teams/${submission.submissionId}`
      );
      toast.success('Submission deleted.');
      setTimeout(() => navigate(-1), 1200);
    } catch (err) {
      const msg = err.response?.data || err.message;
      toast.error(typeof msg === 'string' ? msg : 'Delete failed');
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="px-4 py-6">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
          Go Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Team Submission Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {editMode ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tpd-title">Title</Label>
                  <Input
                    id="tpd-title"
                    value={updatedTitle}
                    onChange={(e) => setUpdatedTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tpd-desc">Description</Label>
                  <textarea
                    id="tpd-desc"
                    rows={4}
                    value={updatedDescription}
                    onChange={(e) => setUpdatedDescription(e.target.value)}
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tpd-file">File</Label>
                  <Input
                    id="tpd-file"
                    type="file"
                    onChange={(e) => setUpdatedFile(e.target.files?.[0] ?? null)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveEdit}>
                    <Save className="h-4 w-4" />
                    Save
                  </Button>
                  <Button variant="outline" onClick={() => setEditMode(false)}>
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-semibold">Title:</span>{' '}
                  {submission.title}
                </p>
                <p>
                  <span className="font-semibold">Description:</span>{' '}
                  {submission.description}
                </p>
                <p>
                  <span className="font-semibold">File Name:</span>{' '}
                  {submission.fileName}
                </p>
                {submission.fileUrl && (
                  <Button asChild variant="outline" size="sm">
                    <a
                      href={submission.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      View File
                    </a>
                  </Button>
                )}
                <p>
                  <span className="font-semibold">File Type:</span>{' '}
                  {submission.fileType}
                </p>
                <p className="flex items-center gap-2">
                  <span className="font-semibold">Review Status:</span>
                  <Badge variant={reviewBadgeVariant(submission.reviewStatus)}>
                    {submission.reviewStatus || 'PENDING'}
                  </Badge>
                </p>
                <p>
                  <span className="font-semibold">Review Comments:</span>{' '}
                  {submission.reviewComments}
                </p>
                <p>
                  <span className="font-semibold">Reviewed By:</span>{' '}
                  {submission.reviewedBy}
                </p>
                <p>
                  <span className="font-semibold">Reviewed At:</span>{' '}
                  {submission.reviewedAt
                    ? new Date(submission.reviewedAt).toLocaleString()
                    : 'N/A'}
                </p>
                <p>
                  <span className="font-semibold">Total Score:</span>{' '}
                  {submission.totalScore}
                </p>
                <p>
                  <span className="font-semibold">Submitted At:</span>{' '}
                  {submission.createdAt
                    ? new Date(submission.createdAt).toLocaleString()
                    : 'Unknown'}
                </p>

                {isCreator && (
                  <div className="flex gap-2 pt-3">
                    <Button onClick={() => setEditMode(true)}>
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => setConfirmDelete(true)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete submission?</DialogTitle>
            <DialogDescription>
              This will permanently remove the submission. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TeamProjectDetail;
