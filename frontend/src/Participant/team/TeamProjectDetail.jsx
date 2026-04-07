/**
 * TeamProjectDetail.js
 *
 * View and manage team submissions.
 * Allows the team creator to edit or delete the team's submitted work.
 *
 * Role: Participant (Team Leader)
 * Developer: Beiqi Dai
 */


// Enhanced TeamProjectDetail.js with edit/delete only visible to creator
import React, { useState, useEffect } from 'react';
import {
  Typography, Button, CircularProgress, Alert, Paper, Snackbar, TextField
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import '../project/Projectdetail.css';
import apiClient from '../../api/apiClient';

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
  const [snackbarMessage, setSnackbarMessage] = useState('');

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
        else setError(err.response?.data || err.message || 'Failed to load submission.');
      } finally {
        setLoading(false);
      }
    };

    const checkIfCreator = async () => {
      try {
        const res = await apiClient.get('/teams/public/created', {
          params: { userId, page: 1, size: 100 }
        });
        const is = res.data.data?.some(team => team.id === teamId);
        setIsCreator(is);
      } catch (err) {
        console.error('Failed to verify creator:', err);
      }
    };

    fetchSubmission();
    checkIfCreator();
  }, [competitionId, teamId, userId]);

  const handleEdit = () => setEditMode(true);
  const handleCancelEdit = () => setEditMode(false);
  const handleFileChange = (e) => setUpdatedFile(e.target.files[0]);

  const handleSaveEdit = async () => {
    try {
      const formData = new FormData();
      formData.append('competitionId', competitionId);
      formData.append('teamId', teamId);
      formData.append('title', updatedTitle);
      formData.append('description', updatedDescription);
      if (updatedFile) formData.append('file', updatedFile);

      await apiClient.post('/submissions/teams/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSnackbarMessage('Submission updated successfully!');
      setEditMode(false);
    } catch (err) {
      setSnackbarMessage(err.response?.data || err.message);
    }
  };

  const handleDelete = async () => {
    if (!submission?.submissionId || !window.confirm('Confirm delete submission?')) return;
    try {
      await apiClient.delete(`/submissions/teams/${submission.submissionId}`);
      setSnackbarMessage('Submission deleted.');
      setTimeout(() => navigate(-1), 1500);
    } catch (err) {
      setSnackbarMessage(err.response?.data || err.message);
    }
  };

  if (loading) return <CircularProgress />;
  if (error) return <Typography color="error">{error}</Typography>;

  return (
    <>

      <div className="participant-project-container">

        <div className="participant-project-content">
          <div className="back-button" onClick={() => navigate(-1)}>
            <ArrowBackIcon className="back-icon" sx={{ color: '#FF9800' }} />
            <Typography variant="button" className="back-text" sx={{ color: '#FF9800' }}>
              Go Back
            </Typography>
          </div>

          <Paper className="detail-paper">
            <Typography variant="h4" gutterBottom sx={{ color: '#FF9800' }}>
              Team Submission Details
            </Typography>

            {editMode ? (
              <>
                <TextField fullWidth label="Title" margin="normal" value={updatedTitle} onChange={(e) => setUpdatedTitle(e.target.value)} />
                <TextField fullWidth label="Description" margin="normal" multiline minRows={3} value={updatedDescription} onChange={(e) => setUpdatedDescription(e.target.value)} />
                <input type="file" onChange={handleFileChange} style={{ margin: '10px 0' }} />
                <div style={{ marginTop: 20 }}>
                  <Button variant="contained" onClick={handleSaveEdit} sx={{ backgroundColor: '#FF9800', mr: 2 }}>Save</Button>
                  <Button variant="outlined" onClick={handleCancelEdit} sx={{ color: '#FF9800' }}>Cancel</Button>
                </div>
              </>
            ) : (
              <>
                <Typography variant="h6">Title: {submission.title}</Typography>
                <Typography variant="body1">Description: {submission.description}</Typography>
                <Typography variant="body2">File Name: {submission.fileName}</Typography>
                {submission.fileUrl && (
                  <Button variant="outlined" href={submission.fileUrl} target="_blank" sx={{ borderColor: '#FF9800', color: '#FF9800', mt: 2 }}>
                    View File
                  </Button>
                )}
                <Typography variant="body2">File Type: {submission.fileType}</Typography>
                <Typography variant="body2">Review Status: {submission.reviewStatus}</Typography>
                <Typography variant="body2">Review Comments: {submission.reviewComments}</Typography>
                <Typography variant="body2">Reviewed By: {submission.reviewedBy}</Typography>
                <Typography variant="body2">Reviewed At: {submission.reviewedAt ? new Date(submission.reviewedAt).toLocaleString() : 'N/A'}</Typography>
                <Typography variant="body2">Total Score: {submission.totalScore}</Typography>
                <Typography variant="body2">Submitted At: {submission.createdAt ? new Date(submission.createdAt).toLocaleString() : 'Unknown'}</Typography>
                {isCreator && (
                  <div style={{ marginTop: 20 }}>
                    <Button variant="contained" onClick={handleEdit} sx={{ backgroundColor: '#FF9800', mr: 2 }}>Edit</Button>
                    <Button variant="outlined" onClick={handleDelete} sx={{ color: '#FF9800' }}>Delete</Button>
                  </div>
                )}
              </>
            )}
          </Paper>
        </div>
      </div>

      <Snackbar
        open={!!snackbarMessage}
        autoHideDuration={3000}
        onClose={() => setSnackbarMessage('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="success" sx={{ width: '100%', backgroundColor: '#FF9800', color: '#fff' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
}

export default TeamProjectDetail;
