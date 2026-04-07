/**
 * @file SubmissionRatings.js
 * @description
 * Display submission scores in a sortable table for a specific competition.
 * Allows Organizer to:
 *  - View and compare total and individual criterion scores
 *  - Sort submissions by total or specific criterion
 *  - Trigger automatic winner award based on scores
 * 
 * Features:
 *  - Dynamic sortable table
 *  - Auto Award function
 *  - Loading state management
 *  - Full use of MUI (Material-UI) components
 * 
 * Role: Organizer
 * Developer: Zhaoyi Yang
 */


import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
  CircularProgress,
  Box,
  Button,
  TableSortLabel,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import apiClient from '../api/apiClient';

function SubmissionRatings() {
  const { competitionId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: "totalScore", direction: "desc" });

  const fetchRatings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(
        `/winners/scored-list?competitionId=${competitionId}`
      );
      const data = res.data;
      if (Array.isArray(data.data)) {
        setSubmissions(data.data);
      }
    } catch {
      // fetch error handled silently
    } finally {
      setLoading(false);
    }
  }, [competitionId]);

  useEffect(() => {
    fetchRatings();
  }, [fetchRatings]);

  const allCriteria = useMemo(() => {
    return Array.from(
      new Set(
        submissions.flatMap((sub) =>
          sub.criterionScores ? Object.keys(sub.criterionScores) : []
        )
      )
    );
  }, [submissions]);

  const sortedSubmissions = useMemo(() => {
    const sorted = [...submissions];
    const { key, direction } = sortConfig;

    sorted.sort((a, b) => {
      let aValue, bValue;

      if (key === "totalScore") {
        aValue = a.totalScore ?? 0;
        bValue = b.totalScore ?? 0;
      } else {
        aValue = a.criterionScores?.[key] ?? 0;
        bValue = b.criterionScores?.[key] ?? 0;
      }

      if (aValue < bValue) return direction === "asc" ? -1 : 1;
      if (aValue > bValue) return direction === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [submissions, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleAutoAward = async () => {
    try {
      await apiClient.post(`/winners/auto-award?competitionId=${competitionId}`);
      alert("🎉 Auto-award completed successfully!");
      fetchRatings();
    } catch (error) {
      const status = error.response?.status;
      if (status === 400) {
        alert("⚠️ No scored submissions found.");
      } else if (status === 403) {
        alert("❌ You are not authorized to award.");
      } else {
        alert("❌ Failed to connect to server.");
      }
    }
  };

  return (
    <>
      
      <div className="dashboard-container">
        
        <div className="dashboard-content">
          <Typography variant="h5" gutterBottom>
            Rated Submissions Comparison
          </Typography>

          {loading ? (
            <Box sx={{ textAlign: "center", mt: 5 }}>
              <CircularProgress />
            </Box>
          ) : sortedSubmissions.length > 0 ? (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Title</strong></TableCell>
                    <TableCell sortDirection={sortConfig.key === "totalScore" ? sortConfig.direction : false}>
                      <TableSortLabel
                        active={sortConfig.key === "totalScore"}
                        direction={sortConfig.key === "totalScore" ? sortConfig.direction : "asc"}
                        onClick={() => handleSort("totalScore")}
                      >
                        <strong>Total Score</strong>
                      </TableSortLabel>
                    </TableCell>
                    {allCriteria.map((criterion) => (
                      <TableCell
                        key={criterion}
                        sortDirection={sortConfig.key === criterion ? sortConfig.direction : false}
                      >
                        <TableSortLabel
                          active={sortConfig.key === criterion}
                          direction={sortConfig.key === criterion ? sortConfig.direction : "asc"}
                          onClick={() => handleSort(criterion)}
                        >
                          <strong>{criterion}</strong>
                        </TableSortLabel>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedSubmissions.map((sub) => (
                    <TableRow key={sub.submissionId}>
                      <TableCell>{sub.title}</TableCell>
                      <TableCell>{sub.totalScore}</TableCell>
                      {allCriteria.map((criterion) => (
                        <TableCell key={criterion}>
                          {sub.criterionScores?.[criterion] ?? "-"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography variant="body1" sx={{ mt: 4 }}>
              No scored submissions found for this competition.
            </Typography>
          )}

          <Button
            variant="contained"
            color="success"
            onClick={handleAutoAward}
          >
            🏆 Auto Award Winners
          </Button>

          <Button
            variant="outlined"
            onClick={() => navigate(`/OrganizerSubmissions/${competitionId}`)}
          >
            🔙 Back to Submissions List
          </Button>

        </div>
      </div>
    </>
  );
}

export default SubmissionRatings;
