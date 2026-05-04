/**
 * Projectdetail.jsx
 *
 * Participant submission detail view, edit, and delete. Migrated from MUI to shadcn/ui.
 *
 * Role: Participant
 * Developer: Beiqi Dai
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../../api/apiClient';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';

function ProjectDetail() {
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userData, setUserData] = useState(null);

  const [editMode, setEditMode] = useState(false);
  const [updatedTitle, setUpdatedTitle] = useState('');
  const [updatedDescription, setUpdatedDescription] = useState('');
  const [updatedFile, setUpdatedFile] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { competitionId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await apiClient.get('/users/profile');
        setUserData(res.data);
      } catch (err) {
        // Failed to fetch user data
      }
    };
    fetchUserData();
  }, []);

  useEffect(() => {
    if (!userData || !competitionId) return;

    const fetchSubmissionDetail = async () => {
      try {
        const res = await apiClient.get(`/submissions/${competitionId}`);
        setSubmission(res.data);
        setLoading(false);
      } catch (err) {
        setError(err.response?.data || err.message || 'Error fetching submission details');
        setLoading(false);
      }
    };
    fetchSubmissionDetail();
  }, [userData, competitionId]);

  const handleDeleteSubmission = async () => {
    if (!submission || !submission.id) {
      toast.error('No submission to delete.');
      return;
    }
    try {
      await apiClient.delete(`/submissions/${submission.id}`);
      toast.success('Submission deleted successfully!');
      setConfirmDelete(false);
      setTimeout(() => navigate(-1), 1200);
    } catch (err) {
      toast.error('Failed to delete submission');
      setConfirmDelete(false);
    }
  };

  const handleEditSubmission = () => {
    setEditMode(true);
    setUpdatedTitle(submission.title || '');
    setUpdatedDescription(submission.description || '');
  };

  const handleFileChange = (e) => {
    setUpdatedFile(e.target.files[0]);
  };

  const handleCancelEdit = () => {
    setEditMode(false);
  };

  const handleSaveEdit = async () => {
    if (!updatedFile) {
      toast.warning('Please select a file to upload!');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('competitionId', competitionId);
      formData.append('title', updatedTitle);
      formData.append('description', updatedDescription);
      formData.append('file', updatedFile);

      const res = await apiClient.post('/submissions/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSubmission(res.data);
      toast.success('Submission updated successfully!');
      setEditMode(false);
    } catch (err) {
      toast.error('Update failed: ' + (err.response?.data || err.message));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-warning" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Button
        variant="ghost"
        onClick={() => navigate(-1)}
        className="mb-4 text-warning hover:bg-warning/10 hover:text-warning"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Go Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-warning">Submission Details</CardTitle>
        </CardHeader>
        <CardContent>
          {editMode ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={updatedTitle}
                  onChange={(e) => setUpdatedTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-desc">Description</Label>
                <textarea
                  id="edit-desc"
                  rows={4}
                  value={updatedDescription}
                  onChange={(e) => setUpdatedDescription(e.target.value)}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-file">File</Label>
                <input id="edit-file" type="file" onChange={handleFileChange} className="text-sm" />
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleSaveEdit}
                  className="bg-warning text-warning-foreground hover:bg-warning/90"
                >
                  Save
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancelEdit}
                  className="border-warning text-warning hover:bg-warning/10"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <p>
                <strong>Title:</strong> {submission.title || 'No Title'}
              </p>
              <p>
                <strong>Description:</strong>{' '}
                {submission.description || 'No description available'}
              </p>
              <p>
                <strong>File Name:</strong> {submission.fileName || 'No file'}
              </p>
              {submission.fileUrl && (
                <Button
                  asChild
                  variant="outline"
                  className="border-warning text-warning hover:bg-warning/10"
                >
                  <a href={submission.fileUrl} target="_blank" rel="noopener noreferrer">
                    View File
                  </a>
                </Button>
              )}
              <p>
                <strong>Review Status:</strong>{' '}
                <Badge variant="outline">{submission.reviewStatus || 'Pending'}</Badge>
              </p>
              <p>
                <strong>Score:</strong> {submission.totalScore ?? 'Not scored yet'}
              </p>
              <p>
                <strong>Submission Time:</strong>{' '}
                {submission.createdAt
                  ? new Date(submission.createdAt).toLocaleString()
                  : 'Unknown'}
              </p>
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleEditSubmission}
                  className="bg-warning text-warning-foreground hover:bg-warning/90"
                >
                  Edit Submission
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setConfirmDelete(true)}
                  className="border-warning text-warning hover:bg-warning/10"
                >
                  Delete Submission
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Submission</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this submission? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteSubmission}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ProjectDetail;
