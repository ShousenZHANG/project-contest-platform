/**
 * @file ChangeContestList.js
 * @description 
 * This component renders a table row for a contest and provides functionality for users to register or cancel registration.
 * Core functionalities include:
 *  - Displaying contest details such as title, category, date, and status.
 *  - Allowing participants to join a competition by sending a registration request.
 *  - Handling cases where the user has already registered, with the option to cancel registration.
 *  - Providing feedback through confirmation dialogs and success/error snackbars.
 *  - Managing API interactions with appropriate authentication headers.
 * 
 * Role: Participant
 * Developer: Beiqi Dai
 */


import React, { useState } from "react";
import {
  TableRow,
  TableCell,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
  Alert,
} from "@mui/material";
import "./ChangeContestList.css";
import apiClient from '../../api/apiClient';

function ChangeContestList({ contest, onClick }) {
  const [openDialog, setOpenDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const handleRowClick = (e) => {
    if (onClick) onClick(e);
  };

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSnackbarClose = (event, reason) => {
    if (event) {
      event.stopPropagation();
    }
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const handleJoinClick = async (e) => {
    e.stopPropagation();

    const token = localStorage.getItem("token");
    if (!token) {
      showSnackbar("Please log in first!", "warning");
      return;
    }

    try {
      await apiClient.post(`/registrations/${contest.id}`);
      showSnackbar("Registration successful!", "success");
    } catch (error) {
      const errData = error.response?.data;
      if (errData?.error === "You have already registered for this competition") {
        setOpenDialog(true);
      } else {
        showSnackbar("Registration failed due to network or server error.", "error");
      }
    }
  };

  const handleCancelRegistration = async (e) => {
    if (e) e.stopPropagation();

    try {
      await apiClient.delete(`/registrations/${contest.id}`);
      showSnackbar("Registration cancelled successfully!", "success");
      setOpenDialog(false);
    } catch (error) {
      showSnackbar("Cancellation failed due to network or server error.", "error");
    }
  };

  if (!contest) return null;

  return (
    <>
      <TableRow hover className="contest-table-row" onClick={handleRowClick}>
        <TableCell className="table-cell">{contest.title}</TableCell>
        <TableCell className="table-cell">{contest.category}</TableCell>
        <TableCell className="table-cell">{contest.date}</TableCell>
        <TableCell className="table-cell">
          <span className={`status-dot ${contest.status}`}></span>
          {contest.status}
        </TableCell>
        <TableCell className="table-cell">
          <div className="button-group">
            <Button
              className="join-button"
              size="small"
              onClick={handleJoinClick}
            >
              Join
            </Button>
          </div>
        </TableCell>
      </TableRow>

      {/* Dialog for confirming cancellation */}
      <Dialog open={openDialog} onClose={(e) => { if (e) e.stopPropagation(); setOpenDialog(false); }}>
        <DialogTitle>Already Registered</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You have already registered for this competition. Do you want to cancel your registration?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={(e) => { if (e) e.stopPropagation(); setOpenDialog(false); }} color="primary">
            No
          </Button>
          <Button onClick={handleCancelRegistration} color="error" autoFocus>
            Yes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}

export default ChangeContestList;
