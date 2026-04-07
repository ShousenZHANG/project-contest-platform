/**
 * @file OrganizerAddJudge.js
 * @description
 * This component allows organizers to manage the judges of a specific competition.
 * Organizers can:
 *  - Add one or multiple judges by email (comma-separated).
 *  - Prevent participants of the competition from being assigned as judges.
 *  - View a paginated list of assigned judges.
 *  - Delete a judge assignment.
 * 
 * It fetches competition details, current judges, and participant lists to handle conflict checks.
 * Material-UI components are used for the interface and feedback (Snackbar/Alert).
 * 
 * Role: Organizer
 * Developer: Zhaoyi Yang
 */


import { useEffect, useState, useCallback } from "react";
import {
  Typography,
  TextField,
  Button,
  Paper,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Snackbar,
  Alert,
  Pagination,
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import "./ContestList.css";
import apiClient from '../api/apiClient';

function OrganizerAddJudge() {
  const { competitionId } = useParams();
  const navigate = useNavigate();
  const email = localStorage.getItem("email");

  const [judgeEmail, setJudgeEmail] = useState("");
  const [judges, setJudges] = useState([]);
  const [competitionName, setCompetitionName] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [participantsEmails, setParticipantsEmails] = useState(new Set());

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get(`/competitions/${competitionId}`);
        setCompetitionName(res.data.name || "Unnamed Competition");
      } catch {
        // fetch error handled silently
      }
    })();
  }, [competitionId]);

  const fetchJudges = useCallback(async (currentPage = 1) => {
    try {
      const res = await apiClient.get(
        `/competitions/${competitionId}/judges?page=${currentPage}&size=10`
      );
      const data = res.data;
      setJudges(data.data || []);
      setTotalPages(data.pages || 1);
    } catch {
      // fetch error handled silently
    }
  }, [competitionId]);

  useEffect(() => {
    fetchJudges(page);
  }, [competitionId, page, fetchJudges]);

  const fetchParticipants = useCallback(async () => {
    try {
      const res = await apiClient.get(
        `/registrations/${competitionId}/participants?page=1&size=10000`
      );
      const data = res.data;
      const emailsSet = new Set((data.data || []).map((p) => p.email));
      setParticipantsEmails(emailsSet);
    } catch {
      // fetch error handled silently
    }
  }, [competitionId]);

  useEffect(() => {
    fetchParticipants();
  }, [competitionId, fetchParticipants]);

  const handleAddJudge = async () => {
    const trimmedEmails = judgeEmail
      .split(",")
      .map((e) => e.trim())
      .filter((e) => e);

    if (trimmedEmails.length === 0) {
      setSnackbar({ open: true, message: "Judge email(s) cannot be empty", severity: "warning" });
      return;
    }

    const conflict = trimmedEmails.find((e) => participantsEmails.has(e));
    if (conflict) {
      setSnackbar({
        open: true,
        message: `❌ ${conflict} is already a participant in this competition and cannot be assigned as a judge.`,
        severity: "error",
      });
      return;
    }

    try {
      const res = await apiClient.post(
        `/competitions/${competitionId}/assign-judges`,
        { judgeEmails: trimmedEmails }
      );
      const text = typeof res.data === "string" ? res.data : JSON.stringify(res.data);
      setSnackbar({ open: true, message: "✅ " + text, severity: "success" });
      setJudgeEmail("");
      fetchJudges(page);
    } catch (error) {
      const errData = error.response?.data;
      const errorMessage = typeof errData === "string"
        ? errData
        : errData?.error ? "❌ " + errData.error : "❌ Error assigning judge";
      setSnackbar({ open: true, message: errorMessage, severity: "error" });
    }
  };

  const handleDeleteJudge = async (judgeId) => {
    if (!window.confirm("Are you sure you want to remove this judge?")) return;

    try {
      const res = await apiClient.delete(
        `/competitions/${competitionId}/judges/${judgeId}`
      );
      const msg = typeof res.data === "string" ? res.data : "Judge removed";
      setSnackbar({ open: true, message: "✅ " + msg, severity: "success" });
      fetchJudges(page);
    } catch {
      setSnackbar({ open: true, message: "❌ Error deleting judge", severity: "error" });
    }
  };

  return (
    <>
      
      <div className="dashboard-container">
        
        <div className="dashboard-content">
          <Typography variant="h5" gutterBottom>
            Judges for: {competitionName}
          </Typography>

          <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
            <TextField
              label="Judge Email(s)"
              variant="outlined"
              value={judgeEmail}
              onChange={(e) => setJudgeEmail(e.target.value)}
              fullWidth
              helperText="You can enter multiple emails separated by commas"
            />
            <Button variant="contained" color="primary" onClick={handleAddJudge}>
              Add Judge
            </Button>
          </div>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Delete</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {judges.map((judge, index) => (
                  <TableRow key={judge.id || index}>
                    <TableCell>{(page - 1) * 10 + index + 1}</TableCell>
                    <TableCell>{judge.email}</TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        color="error"
                        variant="outlined"
                        onClick={() => handleDeleteJudge(judge.id)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Pagination
            sx={{ mt: 2 }}
            count={totalPages}
            page={page}
            onChange={(e, val) => setPage(val)}
            color="primary"
          />

          <Button
            variant="outlined"
            sx={{ mt: 2 }}
            onClick={() => navigate(`/OrganizerContestList/${email}`)}
          >
            🔙 Back to Contest List
          </Button>

          <Snackbar
            open={snackbar.open}
            autoHideDuration={4000}
            onClose={() => setSnackbar({ ...snackbar, open: false })}
          >
            <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
              {snackbar.message}
            </Alert>
          </Snackbar>
        </div>
      </div>
    </>
  );
}

export default OrganizerAddJudge;
