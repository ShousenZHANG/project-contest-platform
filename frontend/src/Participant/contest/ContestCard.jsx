/**
 * @file ContestCard.js
 * @description
 * This component displays a single contest in a card format for participants.
 * Participants can:
 *  - View basic contest information (title, date, category, description, status).
 *  - Join contests as an individual or as a team depending on the participation type.
 *  - Cancel their registration if already registered.
 *  - View approved submissions for a contest.
 * The component manages registration, cancellation, and team selection with backend API integration,
 * handles authentication, and provides user feedback via dialogs and snackbars.
 * It uses Material-UI components for styling and layout.
 *
 * Role: Participant
 * Developer: Zhaoyi Yang, Beiqi Dai
 */

import React, { useState } from "react";
import "./ContestCard.css";
import {
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Button,
  Typography,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
  Alert,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Box,
} from "@mui/material";
import { Flag, Category, Visibility, AccessTime, PlayArrow, Lock } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import apiClient from '../../api/apiClient';

function ContestCard({ contest, onLoginRequest }) {
  const navigate = useNavigate();
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [openRegDialog, setOpenRegDialog] = useState(false);
  const [openTeamDialog, setOpenTeamDialog] = useState(false);
  const [createdTeams, setCreatedTeams] = useState([]);
  const [teamsLoading, setTeamsLoading] = useState(false);

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSnackbarClose = (event, reason) => {
    if (event) event.stopPropagation();
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const checkTeamStatus = async (teamId) => {
    try {
      const res = await apiClient.get(
        `/registrations/teams/${contest.id}/${teamId}/status`
      );
      return res.data === true || res.data === 'true';
    } catch (err) {
      return false;
    }
  };

  const fetchCreatedTeams = async () => {
    const userId = localStorage.getItem("userId");
    setTeamsLoading(true);
    try {
      const res = await apiClient.get(
        `/teams/public/created?userId=${userId}&page=1&size=100`
      );
      const teams = res.data.data || [];
      setCreatedTeams(teams);
      return teams;
    } catch (err) {
      showSnackbar("Failed to load your teams.", "error");
    } finally {
      setTeamsLoading(false);
    }
    return [];
  };

  const registerTeam = async (teamId) => {
    try {
      await apiClient.post(`/registrations/teams/${contest.id}/${teamId}`);
      showSnackbar("Team registered successfully!", "success");
    } catch (err) {
      showSnackbar("Team registration failed.", "error");
    }
  };

  const cancelTeamRegistration = async (teamId) => {
    try {
      await apiClient.delete(`/registrations/teams/${contest.id}/${teamId}`);
      showSnackbar("Team registration cancelled!", "success");
    } catch (err) {
      showSnackbar("Team cancellation failed.", "error");
    } finally {
      setOpenTeamDialog(false);
    }
  };

  const handleJoinClick = async (e) => {
    e.stopPropagation();

    if (contest.status !== "ONGOING") {
      showSnackbar("You can only join ongoing competitions.", "warning");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      if (onLoginRequest) onLoginRequest();
      else showSnackbar("Please log in first!", "warning");
      return;
    }

    if (contest.participationType === "TEAM") {
      await fetchCreatedTeams();
      setOpenTeamDialog(true);
      return;
    }

    try {
      await apiClient.post(`/registrations/${contest.id}`);
      showSnackbar("Registration successful!", "success");
    } catch (err) {
      const text = typeof err.response?.data === 'string' ? err.response.data : JSON.stringify(err.response?.data || '');
      if (text.includes("already registered")) setOpenRegDialog(true);
      else showSnackbar("Registration failed.", "error");
    }
  };

  const handleCancelRegistration = async () => {
    try {
      await apiClient.delete(`/registrations/${contest.id}`);
      showSnackbar("Cancelled successfully!", "success");
      setOpenRegDialog(false);
    } catch (err) {
      showSnackbar("Cancellation failed.", "error");
    }
  };

  const handleViewSubmission = async (e) => {
    e.stopPropagation();

    if (!contest?.id) {
      showSnackbar("Invalid contest ID.", "error");
      return;
    }

    try {
      const res = await apiClient.get(
        `/submissions/public/approved?competitionId=${contest.id}`
      );
      const submissions = res.data.data || [];
      if (submissions.length === 0) {
        showSnackbar("No approved submissions yet.", "info");
        return;
      }
      navigate(`/view-submission/${contest.id}`);
    } catch (err) {
      showSnackbar("Network error fetching submissions.", "error");
    }
  };


  return (
    <>
      <Card
        className="contest-card"
        onClick={() => navigate(`/contest-detail/${contest.id}`)}
        sx={{ maxWidth: 345, boxShadow: 3, cursor: "pointer" }}
      >
        <CardMedia component="img" height="200" image={contest.image} alt={contest.title} />
        <CardContent>
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              backgroundColor:
                contest.status === "ONGOING"
                  ? "#FF9800"
                  : contest.status === "UPCOMING"
                    ? "#BDBDBD"
                    : "#9E9E9E",
              color: "white",
              padding: "4px 10px",
              borderRadius: "20px",
              fontSize: "0.8rem",
              fontWeight: "bold",
              mb: 1,
            }}
          >
            {contest.status === "ONGOING" && <PlayArrow sx={{ fontSize: 16, mr: 1 }} />}
            {contest.status === "UPCOMING" && <AccessTime sx={{ fontSize: 16, mr: 1 }} />}
            {contest.status === "COMPLETED" && <Lock sx={{ fontSize: 16, mr: 1 }} />}
            {contest.status}
          </Box>

          <Typography
            variant="h6"
            sx={{ mt: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "87%" }}
          >
            {contest.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>Date:</strong> {contest.date}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            <Category sx={{ fontSize: 18, marginRight: 1, color: "gray" }} /> {contest.category}
          </Typography>
          <Typography
            variant="body2"
            sx={{ mt: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%" }}
          >
            <span style={{ fontWeight: "bold", color: "#888" }}>Description:</span> {contest.description}
          </Typography>
        </CardContent>
        <CardActions>
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              startIcon={<Flag />}
              onClick={handleJoinClick}
              sx={{ bgcolor: "orange", "&:hover": { bgcolor: "darkorange" } }}
            >
              Join
            </Button>
            <Button
              variant="outlined"
              startIcon={<Visibility />}
              onClick={handleViewSubmission}
              sx={{
                color: "orange",
                borderColor: "orange",
                "&:hover": { bgcolor: "orange", color: "white" },
              }}
            >
              View Submission
            </Button>
          </Stack>
        </CardActions>
      </Card>

      <Dialog open={openRegDialog} onClose={() => setOpenRegDialog(false)} onClick={(e) => e.stopPropagation()}>
        <DialogTitle>Already Registered</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You have already registered for this competition. Cancel?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRegDialog(false)} sx={{ color: "orange" }}>
            No
          </Button>
          <Button
            onClick={handleCancelRegistration}
            sx={{ bgcolor: "orange", "&:hover": { bgcolor: "darkorange" } }}
            autoFocus
          >
            Yes
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openTeamDialog} onClose={() => setOpenTeamDialog(false)} onClick={(e) => e.stopPropagation()}>
        <DialogTitle>Select Your Team</DialogTitle>
        <DialogContent>
          {teamsLoading ? (
            <CircularProgress />
          ) : createdTeams.length === 0 ? (
            <DialogContentText>You have no teams. Please create one first.</DialogContentText>
          ) : (
            <List>
              {createdTeams.map((team) => (
                <ListItem key={team.id} sx={{ flexDirection: "column", alignItems: "flex-start" }}>
                  <ListItemText primary={team.name} />
                  <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      sx={{
                        color: "orange",
                        borderColor: "orange",
                        "&:hover": { bgcolor: "orange", color: "white" },
                      }}
                      onClick={async () => {
                        const registered = await checkTeamStatus(team.id);
                        if (registered) {
                          showSnackbar("Team already registered.", "info");
                        } else {
                          registerTeam(team.id);
                        }
                      }}
                    >
                      Register
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      sx={{
                        color: "orange",
                        borderColor: "orange",
                        "&:hover": { bgcolor: "orange", color: "white" },
                      }}
                      onClick={async () => {
                        const registered = await checkTeamStatus(team.id);
                        if (!registered) {
                          showSnackbar("Team not registered yet.", "warning");
                        } else {
                          cancelTeamRegistration(team.id);
                        }
                      }}
                    >
                      Cancel Reg
                    </Button>
                  </Box>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenTeamDialog(false)} sx={{ color: "orange" }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}

export default ContestCard;
