/**
 * @file ParticipantList.js
 * @description
 * This component allows organizers to manage and view participants or teams in a competition.
 * Organizers can:
 *  - Search participants or teams by name.
 *  - Sort participants or teams by registration/creation time.
 *  - Delete participants or teams from the competition.
 *  - Export participant or team information into an Excel file.
 * 
 * It fetches both competition information and participant/team lists, supporting pagination and keyword filtering.
 * 
 * Role: Organizer
 * Developer: Zhaoyi Yang
 */


import React, { useEffect, useState, useCallback } from "react";
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
  Typography,
  Avatar,
  Pagination,
  TextField,
  CircularProgress,
  Box,
  Button,
  IconButton,
} from "@mui/material";
import { Delete } from "@mui/icons-material";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import "./ContestList.css";
import apiClient from '../api/apiClient';

function ParticipantList() {
  const { competitionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const email = localStorage.getItem("email");


  const initialType = location.state?.participationType || "";
  const [participationType, setParticipationType] = useState(initialType);
  const [participants, setParticipants] = useState([]);
  const [teams, setTeams] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [loading, setLoading] = useState(false);

  const [competitionInfo, setCompetitionInfo] = useState({
    name: "",
    category: "",
    startDate: "",
    endDate: "",
    status: "",
  });

  const fetchCompetitionInfo = useCallback(async () => {
    try {
      const res = await apiClient.get(`/competitions/${competitionId}`);
      const data = res.data;
      setCompetitionInfo({
        name: data.name || "Unnamed Competition",
        category: data.category || "Unknown",
        startDate: data.startDate ? new Date(data.startDate).toLocaleDateString() : "",
        endDate: data.endDate ? new Date(data.endDate).toLocaleDateString() : "",
        status: data.status || "",
      });
      setParticipationType((prev) => prev || data.selectedParticipationType || "INDIVIDUAL");
    } catch {
      // fetch error handled silently
    }
  }, [competitionId]);

  const fetchParticipants = useCallback(async (pageNum = 1, kw = "", order = "asc") => {
    setLoading(true);
    try {
      const res = await apiClient.get(
        `/registrations/${competitionId}/participants?page=${pageNum}&size=10&keyword=${kw}&sortBy=registeredAt&order=${order}`
      );
      const data = res.data;
      setParticipants(data.data || []);
      setTotalPages(data.pages || 1);
      setTotalCount(data.total || 0);
    } catch {
      // fetch error handled silently
    } finally {
      setLoading(false);
    }
  }, [competitionId]);

  const fetchTeams = useCallback(async (pageNum = 1, kw = "", order = "asc") => {
    setLoading(true);
    try {
      const res = await apiClient.get(
        `/registrations/public/${competitionId}/teams?page=${pageNum}&size=10&keyword=${kw}&sortBy=createdAt&order=${order}`
      );
      const data = res.data;
      setTeams(data.data || []);
      setTotalPages(data.pages || 1);
      setTotalCount(data.total || 0);
    } catch {
      // fetch error handled silently
    } finally {
      setLoading(false);
    }
  }, [competitionId]);

  const handleDeleteTeam = async (teamId) => {
    if (!window.confirm("Are you sure you want to remove this team?")) return;
    try {
      await apiClient.delete(
        `/registrations/teams/${competitionId}/team/${teamId}/by-organizer`
      );
      alert("✅ Team removed successfully");
      fetchTeams(page, keyword, sortOrder);
    } catch {
      alert("❌ Error occurred during team deletion");
    }
  };

  useEffect(() => {
    fetchCompetitionInfo();
  }, [fetchCompetitionInfo]);

  useEffect(() => {
    if (participationType === "TEAM") {
      fetchTeams(page, keyword, sortOrder);
    } else if (participationType === "INDIVIDUAL") {
      fetchParticipants(page, keyword, sortOrder);
    }
  }, [fetchTeams, fetchParticipants, page, keyword, sortOrder, participationType]);

  const handleSearch = (e) => {
    setKeyword(e.target.value);
    setPage(1);
    if (participationType === "TEAM") {
      fetchTeams(1, e.target.value, sortOrder);
    } else {
      fetchParticipants(1, e.target.value, sortOrder);
    }
  };

  const handleSortToggle = () => {
    const newOrder = sortOrder === "asc" ? "desc" : "asc";
    setSortOrder(newOrder);
    setPage(1);
  };

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Participants");

    if (participationType === "TEAM") {
      worksheet.columns = [
        { header: "Team Name", key: "name" },
        { header: "Description", key: "description" },
        { header: "Created At", key: "createdAt" },
      ];
      teams.forEach((team) => {
        worksheet.addRow({
          name: team.name,
          description: team.description || "",
          createdAt: new Date(team.createdAt).toLocaleString(),
        });
      });
    } else {
      worksheet.columns = [
        { header: "Name", key: "name" },
        { header: "Email", key: "email" },
        { header: "Description", key: "description" },
        { header: "Registered At", key: "registeredAt" },
      ];
      participants.forEach((p) => {
        worksheet.addRow({
          name: p.name,
          email: p.email,
          description: p.description,
          registeredAt: new Date(p.registeredAt).toLocaleString(),
        });
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `${competitionInfo.name}_${participationType}_List.xlsx`);
  };

  const handleDeleteParticipant = async (participantUserId) => {
    if (!window.confirm("Are you sure you want to remove this participant?")) return;
    try {
      await apiClient.delete(
        `/registrations/${competitionId}/participants/${participantUserId}`
      );
      alert("✅ Participant removed successfully");
      fetchParticipants(page, keyword, sortOrder);
    } catch {
      alert("❌ Error occurred during deletion");
    }
  };

  return (
    <>
      
      <div className="dashboard-container">
        
        <div className="dashboard-content">
          <Typography variant="h5" gutterBottom>
            {participationType === "TEAM" ? "Teams" : "Participants"} for: {competitionInfo.name}
          </Typography>

          <Box sx={{ mb: 2, color: "gray" }}>
            <div>🗂 <strong>Category:</strong> {competitionInfo.category}</div>
            <div>⏳ <strong>Time:</strong> {competitionInfo.startDate} ~ {competitionInfo.endDate}</div>
            <div>📣 <strong>Status:</strong> {competitionInfo.status}</div>
            <div>👥 <strong>Total:</strong> {totalCount}</div>
          </Box>

          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <TextField
              label="Search by name"
              value={keyword}
              onChange={handleSearch}
              variant="outlined"
              fullWidth
            />
            <Button variant="outlined" onClick={handleSortToggle}>
              Sort by Time: {sortOrder.toUpperCase()}
            </Button>
            <Button variant="contained" color="success" onClick={exportToExcel}>
              Export to Excel
            </Button>
          </Box>

          {loading ? (
            <div style={{ textAlign: "center", marginTop: 50 }}>
              <CircularProgress />
            </div>
          ) : (participationType === "TEAM" ? teams.length === 0 : participants.length === 0) ? (
            <Typography>No data found.</Typography>
          ) : (
            <>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Avatar</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>{participationType === "TEAM" ? "Description" : "Email"}</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>{participationType === "TEAM" ? "Created At" : "Registered At"}</TableCell>
                      <TableCell>Delete</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(participationType === "TEAM" ? teams : participants).map((item) => (
                      <TableRow key={item.id || item.userId}>
                        <TableCell>
                          <Avatar src={item.avatarUrl || ""} alt={item.name} />
                        </TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{participationType === "TEAM" ? item.description : item.email}</TableCell>
                        <TableCell>{participationType === "TEAM" ? "-" : item.description}</TableCell>
                        <TableCell>
                          {new Date(
                            participationType === "TEAM" ? item.createdAt : item.registeredAt
                          ).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <IconButton
                            color="error"
                            onClick={() =>
                              participationType === "TEAM"
                                ? handleDeleteTeam(item.id)
                                : handleDeleteParticipant(item.userId)
                            }
                          >
                            <Delete />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Pagination
                count={totalPages}
                page={page}
                onChange={(e, val) => setPage(val)}
                color="primary"
                style={{ marginTop: "1rem" }}
              />
            </>
          )}
          <Button variant="outlined" sx={{ mt: 2 }} onClick={() => navigate(`/OrganizerContestList/${email}`)}>
            🔙 Back to Contest List
          </Button>
        </div>
      </div>
    </>
  );
}

export default ParticipantList;