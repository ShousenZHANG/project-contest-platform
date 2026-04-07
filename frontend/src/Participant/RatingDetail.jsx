/**
 * RatingDetail.js
 *
 * Allows judges to rate submissions for a competition. The component displays scoring criteria as sliders, collects feedback from the judge, and submits the ratings and feedback to the backend.
 * It handles the retrieval of scoring criteria, submission details, and provides a confirmation of the rating submission.
 *
 * Role: Judge
 * Developer: Zhaoyi Yang
 */


import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './Rating.css';
import {
  Typography,
  Slider,
  Paper,
  Box,
  CircularProgress,
  Button,
  Snackbar,
  Alert,
  TextField,
  Grid,
} from '@mui/material';
import apiClient from '../api/apiClient';

function RatingDetail() {
  const { competitionId, submissionId } = useParams();
  const navigate = useNavigate();

  const [scoringCriteria, setScoringCriteria] = useState([]);
  const [scores, setScores] = useState({});
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    const fetchScoringCriteria = async () => {
      try {
        const res = await apiClient.get(`/competitions/${competitionId}`);
        const criteria = res.data.scoringCriteria || [];
        setScoringCriteria(criteria);
        const defaultScores = criteria.reduce((acc, criterion) => {
          acc[criterion] = 5;
          return acc;
        }, {});
        setScores(defaultScores);
      } catch (err) {
        // Failed to fetch competition details
      } finally {
        setLoading(false);
      }
    };

    fetchScoringCriteria();
  }, [competitionId]);

  const handleSliderChange = (criterion, value) => {
    setScores((prev) => ({ ...prev, [criterion]: value }));
  };

  const handleSubmitRating = async () => {
    const ratingsArray = scoringCriteria.map((criterion) => ({
      criterion,
      score: scores[criterion],
      weight: 1.0 / scoringCriteria.length,
    }));

    try {
      await apiClient.post(`/judges/score`, {
        competitionId,
        submissionId,
        judgeComments: feedback,
        scores: ratingsArray,
      });
      setSnackbar({ open: true, message: 'Rating submitted successfully', severity: 'success' });
      setTimeout(() => navigate(`/JudgeSubmissions/${competitionId}`), 1500);
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Error submitting rating';
      setSnackbar({ open: true, message: errorMsg, severity: 'error' });
    }
  };

  return (
    <>

      <div className="rating-container">

        <div className="rating-content">
          <Typography variant="h5" gutterBottom>
            Rate This Submission
          </Typography>

          {loading ? (
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <CircularProgress />
            </div>
          ) : (
            <Paper sx={{ padding: 3, borderRadius: '20px' }}>
              <Grid container spacing={4}>
                {/* Left: The rating slider */}
                <Grid item xs={12} md={7}>
                  {scoringCriteria.map((criterion, index) => (
                    <Box key={index} mb={4}>
                      <Typography gutterBottom>{criterion}</Typography>
                      <Slider
                        value={scores[criterion]}
                        min={0}
                        max={10}
                        step={0.1}
                        onChange={(e, val) => handleSliderChange(criterion, val)}
                        valueLabelDisplay="auto"
                        marks={[{ value: 0, label: '0.0' }, { value: 10, label: '10.0' }]}
                      />
                    </Box>
                  ))}
                </Grid>

                {/* Right: Feedback + Submit button */}
                <Grid item xs={12} md={5} display="flex" flexDirection="column" alignItems="center">
                  <Typography gutterBottom>Feedback</Typography>
                  <TextField
                    multiline
                    rows={8}
                    placeholder="Write your feedback here..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    fullWidth
                    sx={{
                      borderRadius: '16px',
                      backgroundColor: '#eaf4f8',
                      mb: 2,
                    }}
                  />
                  <Button
                    onClick={handleSubmitRating}
                    variant="contained"
                    sx={{
                      backgroundColor: '#83c5be',
                      color: '#fff',
                      borderRadius: '20px',
                      textTransform: 'none',
                      px: 4,
                      ':hover': {
                        backgroundColor: '#64b3aa',
                      },
                    }}
                  >
                    Submit
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          )}

          <Snackbar
            open={snackbar.open}
            autoHideDuration={4000}
            onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          >
            <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
              {snackbar.message}
            </Alert>
          </Snackbar>
        </div>
      </div>
    </>
  );
}

export default RatingDetail;
