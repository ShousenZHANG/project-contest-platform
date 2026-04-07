/**
 * TeamRegistrations.js
 *
 * Lists all competitions registered by the user's teams.
 * Allows the team creator to submit or update team submissions.
 * Supports viewing submission details and paginated team competition records.
 *
 * Role: Participant (Team Leader)
 * Developer: Beiqi Dai
 */


import React, { useState, useEffect, useCallback } from 'react';
import {
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Pagination,
  CircularProgress,
  Alert,
  Box
} from '@mui/material';
import { SubmitDialog } from '../project/Submitbottom';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/apiClient';

/**
 * TeamRegistrations:
 * - Lists competitions registered by the teams the user has joined
 * - Displays submission status
 * - Supports team submission uploads via /submissions/teams/upload
 */
function TeamRegistrations({ userData }) {
  const [registrations, setRegistrations] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, size: 10, pages: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openTeamDialog, setOpenTeamDialog] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState({ competitionId: null, teamId: null });
  const [allowedTypes] = useState([]);

  const navigate = useNavigate();

  // Fetch all competitions registered by teams the user has joined
  const fetchAllTeamRegistrations = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const teamsRes = await apiClient.get('/teams/my-joined', {
        params: { page, size: pagination.size }
      });
      const teamsData = teamsRes.data;
      const teamsList = Array.isArray(teamsData.data) ? teamsData.data : [];

      const regs = [];
      for (const team of teamsList) {
        try {
          const compRes = await apiClient.get(`/registrations/teams/${team.id}/competitions`, {
            params: { page: 1, size: 100 }
          });
          const compData = compRes.data;
          const compList = Array.isArray(compData.data) ? compData.data : [];
          compList.forEach(c => {
            regs.push({
              competitionId: c.competitionId || c.id,
              competitionName: c.competitionName || c.name || '',
              teamId: team.id,
              teamName: team.name,
              hasSubmitted: c.hasSubmitted,
              fileName: c.fileName || '',
              reviewStatus: c.reviewStatus || ''
            });
          });
        } catch (compErr) {
          // Skip teams where competition fetch fails
        }
      }

      setRegistrations(regs);
      setPagination({
        total: teamsData.total || regs.length,
        page: teamsData.page || page,
        size: teamsData.size || pagination.size,
        pages: teamsData.pages || 1
      });
    } catch (err) {
      console.error('[TeamRegistrations] fetchAllTeamRegistrations error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load team registrations.');
      setRegistrations([]);
    } finally {
      setLoading(false);
    }
  }, [pagination.size, userData?.userId]);

  useEffect(() => {
    if (!userData) return;
    fetchAllTeamRegistrations(pagination.page);
  }, [userData, pagination.page, fetchAllTeamRegistrations]);

  // Fetch submission detail info (for fileName / reviewStatus enrichment)
  useEffect(() => {
    if (loading || error) return;
    registrations.forEach(async reg => {
      if (reg.hasSubmitted && !reg.fileName) {
        try {
          const res = await apiClient.get(
            `/submissions/public/teams/${reg.competitionId}/${reg.teamId}`
          );
          const sub = res.data;
          setRegistrations(prev =>
            prev.map(r =>
              r.teamId === reg.teamId && r.competitionId === reg.competitionId
                ? { ...r, fileName: sub.fileName, reviewStatus: sub.reviewStatus }
                : r
            )
          );
        } catch (err) {
          // 404 or other errors are silently ignored for enrichment
        }
      }
    });
  }, [registrations, loading, error]);


  // Submission dialog control
  const openSubmissionDialog = async (competitionId, teamId) => {
    // Fallback: ensure userId exists
    const userId = userData?.userId || localStorage.getItem('userId');
    if (!userId) {
      setError('You are not logged in or user ID is missing.');
      return;
    }

    try {
      const res = await apiClient.get('/teams/public/created', {
        params: { userId, page: 1, size: 100 }
      });

      const isCreator = (res.data.data || []).some(team => team.id === teamId);

      if (!isCreator) {
        setError('You are not the team leader. Please ask the leader to submit.');
        return;
      }

      setSelectedTeam({ competitionId, teamId });
      setOpenTeamDialog(true);
    } catch (err) {
      console.error('[openSubmissionDialog] Error during creator check:', err);
      setError('Unable to verify team leader status.');
    }
  };




  const handleCloseTeamDialog = () => setOpenTeamDialog(false);

  const handleTeamDialogSubmit = async ({ title, description, file }) => {
    if (!file) {
      setError('Please select a file to upload!');
      setOpenTeamDialog(false);
      return;
    }
    try {
      const { competitionId, teamId } = selectedTeam;

      const params = new URLSearchParams({ competitionId, teamId, title, description });
      const formData = new FormData();
      formData.append('file', file);

      await apiClient.post(
        `/submissions/teams/upload?${params.toString()}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      setRegistrations(prev =>
        prev.map(r =>
          r.teamId === teamId && r.competitionId === competitionId
            ? { ...r, hasSubmitted: true, fileName: file.name }
            : r
        )
      );
    } catch (err) {
      console.error('[TeamRegistrations] Team submission error:', err);
      setError('Team upload failed. Please try again.');
    } finally {
      setOpenTeamDialog(false);
    }
  };

  const handleViewDetail = (competitionId, teamId) => {
    navigate(`/team-project-detail/${competitionId}/team/${teamId}`);
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Team Submission Records</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress /></Box>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Competition Name</TableCell>
              <TableCell>Team Name</TableCell>
              <TableCell>Submitted File</TableCell>
              <TableCell>Review Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {registrations.map((item, idx) => (
              <TableRow key={`${item.teamId}-${item.competitionId}-${idx}`}>
                <TableCell>
                  {item.competitionName}
                </TableCell>
                <TableCell>{item.teamName}</TableCell>
                <TableCell>
                  {!item.hasSubmitted ? (
                    <Button
                      variant="outlined"
                      onClick={() => openSubmissionDialog(item.competitionId, item.teamId)}
                    >Submit</Button>
                  ) : item.fileName ? (
                    <Button
                      variant="text"
                      sx={{ textDecoration: 'underline' }}
                      onClick={() => handleViewDetail(item.competitionId, item.teamId)}
                    >{item.fileName}</Button>
                  ) : (
                    'Pending'
                  )}
                </TableCell>
                <TableCell>{(item.reviewStatus || 'PENDING').toUpperCase()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Pagination
        count={pagination.pages}
        page={pagination.page}
        onChange={(e, v) => setPagination(prev => ({ ...prev, page: v }))}
        sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}
      />

      <SubmitDialog
        open={openTeamDialog}
        onClose={handleCloseTeamDialog}
        onSubmit={handleTeamDialogSubmit}
        allowedTypes={allowedTypes}
      />
    </Box>
  );
}

export default TeamRegistrations;
