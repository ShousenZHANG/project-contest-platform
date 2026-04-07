/**
 * ViewVote.js
 *
 * Displays vote count for a submission and allows participants to vote or cancel their vote.
 * Fetches initial vote data and handles vote actions with backend API.
 *
 * Role: Participant
 * Developer: Beiqi Dai
 */


import React, { useState, useEffect } from "react";
import { Button, Typography, Box, Snackbar, Alert } from "@mui/material";
import apiClient from "../api/apiClient";

function ViewVote({ submissionId }) {
  const [votes, setVotes] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("info");

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    const token = localStorage.getItem("token");

    if (!submissionId || !userId || !token) return;

    apiClient
      .get("/interactions/votes/count", { params: { submissionId } })
      .then((res) => {
        setVotes(res.data || 0);
      })
      .catch(() => {});

    apiClient
      .get("/interactions/votes/status", { params: { submissionId } })
      .then((res) => {
        setHasVoted(res.data === true);
      })
      .catch(() => {});
  }, [submissionId]);

  const handleVote = () => {
    const userId = localStorage.getItem("userId");
    const token = localStorage.getItem("token");

    if (!userId || !token) {
      setSnackbarMessage("User not logged in.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    if (!hasVoted) {
      apiClient
        .post(`/interactions/votes?submissionId=${submissionId}`)
        .then(() => {
          setVotes((prev) => prev + 1);
          setHasVoted(true);
          setSnackbarMessage("Vote successful! Thank you!");
          setSnackbarSeverity("success");
          setSnackbarOpen(true);
        })
        .catch(() => {
          setSnackbarMessage("Vote failed.");
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
        });
    } else {
      apiClient
        .delete("/interactions/votes", { params: { submissionId } })
        .then(() => {
          setVotes((prev) => Math.max(prev - 1, 0));
          setHasVoted(false);
          setSnackbarMessage("Vote canceled.");
          setSnackbarSeverity("info");
          setSnackbarOpen(true);
        })
        .catch(() => {
          setSnackbarMessage("Cancel vote failed.");
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
        });
    }
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  return (
    <Box display="flex" alignItems="center">
      <Typography variant="body1" style={{ marginRight: "8px" }}>
        {votes}
      </Typography>
      <Button
        variant="contained"
        onClick={handleVote}
        sx={{
          backgroundColor: "#FF9800",
          color: "white",
          ":hover": {
            backgroundColor: "#FB8C00",
          },
        }}
      >
        {hasVoted ? "Cancel Vote" : "Vote"}
      </Button>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbarSeverity}
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default ViewVote;
