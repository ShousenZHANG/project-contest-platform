/**
 * @file ProjectDetail.js
 * @description
 * This component provides participants with the ability to view, edit, and delete their competition submissions.
 * Key functionalities include:
 *  - Fetching and displaying submission details for a specific competition.
 *  - Allowing participants to update the title, description, and file associated with a submission.
 *  - Deleting an existing submission after confirmation.
 *  - Displaying operation feedback through Snackbar notifications.
 *  - Handling both loading and error states during data fetching.
 *  - Seamlessly integrating with backend APIs for submission management.
 *
 * Role: Participant
 * Developer: Beiqi Dai
 */


import React, { useState, useEffect } from 'react';
import {
  Typography,
  Button,
  CircularProgress,
  TextField,
  Snackbar,
  Alert,
  Paper
} from '@mui/material';
// Use useParams and useNavigate to get route params and navigation methods
import { useParams, useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
// Import page styles
import './Projectdetail.css';
import apiClient from '../../api/apiClient';

function ProjectDetail() {
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userData, setUserData] = useState(null);

  // States related to edit mode
  const [editMode, setEditMode] = useState(false);
  const [updatedTitle, setUpdatedTitle] = useState("");
  const [updatedDescription, setUpdatedDescription] = useState("");
  const [updatedFile, setUpdatedFile] = useState(null);

  // Snackbar state
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  // Get competitionId parameter from route using useParams
  const { competitionId } = useParams();
  const navigate = useNavigate();

  // Fetch user information
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await apiClient.get('/users/profile');
        setUserData(res.data);
      } catch (err) {
        console.error("Failed to fetch user data:", err);
      }
    };
    fetchUserData();
  }, []);

  // After userData is loaded and competitionId exists, fetch submission details by competitionId
  useEffect(() => {
    if (!userData || !competitionId) return;

    const fetchSubmissionDetail = async () => {
      try {
        const res = await apiClient.get(`/submissions/${competitionId}`);
        setSubmission(res.data);
        setLoading(false);
      } catch (err) {
        setError(err.response?.data || err.message || "Error fetching submission details");
        setLoading(false);
      }
    };
    fetchSubmissionDetail();
  }, [userData, competitionId]);

  const handleDeleteSubmission = async () => {
    if (!submission || !submission.id) {
      alert("No submission to delete.");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this submission?")) {
      return;
    }
    try {
      await apiClient.delete(`/submissions/${submission.id}`);
      setSnackbarMessage("Submission deleted successfully!");
      setSnackbarOpen(true);
      // After deletion, navigate back to the list page
      setTimeout(() => navigate(-1), 1500);
    } catch (err) {
      setSnackbarMessage("Failed to delete submission");
      setSnackbarOpen(true);
    }
  };

  const handleEditSubmission = () => {
    setEditMode(true);
    setUpdatedTitle(submission.title || "");
    setUpdatedDescription(submission.description || "");
  };

  const handleFileChange = (e) => {
    setUpdatedFile(e.target.files[0]);
  };

  const handleCancelEdit = () => {
    setEditMode(false);
  };

  // Submit edits
  const handleSaveEdit = async () => {
    if (!updatedFile) {
      alert("Please select a file to upload!");
      return;
    }
    try {
      const formData = new FormData();
      formData.append('competitionId', competitionId);
      formData.append('title', updatedTitle);
      formData.append('description', updatedDescription);
      formData.append('file', updatedFile);

      const res = await apiClient.post('/submissions/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSubmission(res.data);
      setSnackbarMessage("Submission updated successfully!");
      setSnackbarOpen(true);
      setEditMode(false);
    } catch (err) {
      alert("Update failed: " + (err.response?.data || err.message));
    }
  };

  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') return;
    setSnackbarOpen(false);
  };

  if (loading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  return (
    <>

      <div className="participant-project-container">

        <div className="participant-project-content">
          {/* Back button fixed at top-left of content area */}
          <div className="back-button" onClick={() => navigate(-1)}>
            <ArrowBackIcon className="back-icon" sx={{ color: '#FF9800' }} />
            <Typography variant="button" className="back-text" sx={{ color: '#FF9800' }}>
              Go Back
            </Typography>
          </div>
          <Paper className="detail-paper">
            <Typography variant="h4" gutterBottom sx={{ color: '#FF9800' }}>
              Submission Details
            </Typography>
            {editMode ? (
              <>
                <TextField
                  label="Title"
                  fullWidth
                  margin="normal"
                  value={updatedTitle}
                  onChange={(e) => setUpdatedTitle(e.target.value)}
                  InputLabelProps={{ style: { color: '#FF9800' } }}
                  sx={{ '& .MuiInputBase-root': { color: '#FF9800' } }}
                />
                <TextField
                  label="Description"
                  fullWidth
                  margin="normal"
                  multiline
                  minRows={3}
                  value={updatedDescription}
                  onChange={(e) => setUpdatedDescription(e.target.value)}
                  InputLabelProps={{ style: { color: '#FF9800' } }}
                  sx={{ '& .MuiInputBase-root': { color: '#FF9800' } }}
                />
                <input type="file" onChange={handleFileChange} style={{ margin: '10px 0' }} />
                <div style={{ marginTop: '20px' }}>
                  <Button
                    variant="contained"
                    onClick={handleSaveEdit}
                    sx={{
                      backgroundColor: '#FF9800',
                      ':hover': { backgroundColor: '#FB8C00' },
                      mr: 2
                    }}
                  >
                    Save
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={handleCancelEdit}
                    sx={{
                      borderColor: '#FF9800',
                      color: '#FF9800',
                      ':hover': { backgroundColor: '#FFE0B2' }
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Typography variant="h6" >
                  Title: {submission.title || "No Title"}
                </Typography>
                <Typography variant="body1" >
                  Description: {submission.description || "No description available"}
                </Typography>
                <Typography variant="body2" >
                  File Name: {submission.fileName || "No file"}
                </Typography>
                {submission.fileUrl && (
                  <Button
                    variant="outlined"
                    href={submission.fileUrl}
                    target="_blank"
                    sx={{
                      borderColor: '#FF9800',
                      color: '#FF9800',
                      ':hover': { backgroundColor: '#FFE0B2' },
                      mt: 2
                    }}
                  >
                    View File
                  </Button>
                )}
                <Typography variant="body2" >
                  Review Status: {submission.reviewStatus || "Pending"}
                </Typography>
                <Typography variant="body2" >
                  Score: {submission.totalScore ?? "Not scored yet"}
                </Typography>
                <Typography variant="body2" >
                  Submission Time:{" "}
                  {submission.createdAt
                    ? new Date(submission.createdAt).toLocaleString()
                    : "Unknown"}
                </Typography>
                <div style={{ marginTop: '20px' }}>
                  <Button
                    variant="contained"
                    onClick={handleEditSubmission}
                    sx={{
                      backgroundColor: '#FF9800',
                      ':hover': { backgroundColor: '#FB8C00' },
                      mr: 2
                    }}
                  >
                    Edit Submission
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={handleDeleteSubmission}
                    sx={{
                      borderColor: '#FF9800',
                      color: '#FF9800',
                      ':hover': { backgroundColor: '#FFE0B2' }
                    }}
                  >
                    Delete Submission
                  </Button>
                </div>
              </>
            )}
            <Snackbar
              open={snackbarOpen}
              autoHideDuration={3000}
              onClose={handleSnackbarClose}
              anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
              <Alert
                onClose={handleSnackbarClose}
                severity="success"
                sx={{ width: '100%', backgroundColor: '#FF9800', color: '#fff' }}
              >
                {snackbarMessage}
              </Alert>
            </Snackbar>
          </Paper>
        </div>
      </div>
    </>
  );
}

export default ProjectDetail;
