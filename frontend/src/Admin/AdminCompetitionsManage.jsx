/**
 * @file AdminCompetitionsManage.js
 * @description 
 * This component provides an administrative interface for managing competitions.
 * It allows admin users to:
 *  - View a paginated list of all competitions.
 *  - Search competitions by keyword.
 *  - Filter competitions by status (UPCOMING, ONGOING, COMPLETED) and category.
 *  - View detailed information about a specific competition in a popup dialog.
 *  - Delete competitions with confirmation.
 * 
 * The component interacts with backend APIs, handles authentication using tokens and user metadata,
 * dynamically updates the list based on user interactions, and displays data using Material-UI components.
 * It also supports viewing competition details including description, category, participation type,
 * scoring criteria, submission types, intro video link, and display images.
 * 
 * Role: Admin
 * Developer: Zhaoyi Yang
 */

import React, { useEffect, useState } from "react";
import {
  Pagination,
  Table,
  TableHead,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Paper,
  TextField,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Divider,
  Chip,
} from "@mui/material";
import "./AdminAccountManage.css";
import apiClient from '../api/apiClient';

function AdminCompetitionsManage() {
  const [competitions, setCompetitions] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const [selectedComp, setSelectedComp] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchCompetitions = async (
    currentPage = 1,
    keyword = "",
    status = "",
    category = ""
  ) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage,
        size: 10,
        ...(keyword && { keyword }),
        ...(status && { status }),
        ...(category && { category }),
      });

      const response = await apiClient.get(`/competitions/list?${params.toString()}`);
      const data = response.data;
      setCompetitions(data.data || []);
      setTotalPages(data.pages || 1);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to fetch competitions");
    } finally {
      setLoading(false);
    }
  };

  const deleteCompetition = async (compId) => {
    if (!window.confirm("Are you sure you want to delete this competition?")) return;

    try {
      await apiClient.delete(`/competitions/delete/${compId}`);
      alert("Competition deleted successfully.");
      setCompetitions((prev) => prev.filter((c) => c.id !== compId));
    } catch (error) {
      alert(error.response?.data?.message || "Failed to delete competition");
    }
  };

  const fetchCompetitionDetail = async (id) => {
    try {
      const response = await apiClient.get(`/competitions/${id}`);
      setSelectedComp(response.data);
      setDialogOpen(true);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to fetch competition detail");
    }
  };

  useEffect(() => {
    fetchCompetitions(page, keyword, statusFilter, categoryFilter);
  }, [page, keyword, statusFilter, categoryFilter]);

  const handlePageChange = (_, value) => {
    setPage(value);
  };

  return (
    <>
      
      <div className="dashboard-container">
        
        <div className="dashboard-content">
          <h2 className="admin-label">All Competitions</h2>

          <div className="admin-header">
            <TextField
              className="search-bar"
              label="Search"
              variant="outlined"
              size="small"
              value={keyword}
              onChange={(e) => {
                setPage(1);
                setKeyword(e.target.value);
              }}
            />

            <FormControl size="small" style={{ minWidth: 150, marginLeft: "10px" }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => {
                  setPage(1);
                  setStatusFilter(e.target.value);
                }}
                label="Status"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="UPCOMING">UPCOMING</MenuItem>
                <MenuItem value="ONGOING">ONGOING</MenuItem>
                <MenuItem value="COMPLETED">COMPLETED</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" style={{ minWidth: 150, marginLeft: "10px" }}>
              <InputLabel>Category</InputLabel>
              <Select
                value={categoryFilter}
                onChange={(e) => {
                  setPage(1);
                  setCategoryFilter(e.target.value);
                }}
                label="Category"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="Design & Creativity">Design & Creativity</MenuItem>
                <MenuItem value="Programming & Technology">Programming & Technology</MenuItem>
                <MenuItem value="Business & Entrepreneurship">Business & Entrepreneurship</MenuItem>
                <MenuItem value="Mathematics & Science">Mathematics & Science</MenuItem>
                <MenuItem value="Humanities & Social Sciences">Humanities & Social Sciences</MenuItem>
                <MenuItem value="Music & Performing Arts">Music & Performing Arts</MenuItem>
                <MenuItem value="Others">Others</MenuItem>
              </Select>
            </FormControl>
          </div>

          {loading ? (
            <p>Loading competitions...</p>
          ) : competitions.length === 0 ? (
            <p>No competitions found.</p>
          ) : (
            <div className="admin-table">
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>#</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Start Date</TableCell>
                      <TableCell>End Date</TableCell>
                      <TableCell>Delete</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {competitions.map((comp, index) => (
                      <TableRow key={comp.id}>
                        <TableCell>{index + 1 + (page - 1) * 10}</TableCell>
                        <TableCell>
                          <Button
                            variant="text"
                            onClick={() => fetchCompetitionDetail(comp.id)}
                          >
                            {comp.name}
                          </Button>
                        </TableCell>
                        <TableCell>{comp.category}</TableCell>
                        <TableCell>{comp.status}</TableCell>
                        <TableCell>{new Date(comp.startDate).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(comp.endDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button
                            color="error"
                            size="small"
                            variant="outlined"
                            onClick={() => deleteCompetition(comp.id)}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </div>
          )}

          <div style={{ marginTop: "20px", display: "flex", justifyContent: "center" }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={handlePageChange}
              color="primary"
            />
          </div>
        </div>
      </div>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedComp?.name}
          <Chip label={selectedComp?.status} sx={{ ml: 2 }} color="primary" size="small" />
        </DialogTitle>
        <DialogContent dividers sx={{ padding: 3 }}>
          {selectedComp && (
            <>
              <Typography variant="body1" sx={{ mb: 2 }}>{selectedComp.description}</Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography><strong>Category:</strong> {selectedComp.category}</Typography>
              <Typography><strong>Participation:</strong> {selectedComp.participationType}</Typography>
              <Typography><strong>Start:</strong> {new Date(selectedComp.startDate).toLocaleString()}</Typography>
              <Typography><strong>End:</strong> {new Date(selectedComp.endDate).toLocaleString()}</Typography>
              <Typography><strong>Public:</strong> {selectedComp.isPublic ? "Yes" : "No"}</Typography>
              <Divider sx={{ my: 2 }} />
              <Typography><strong>Scoring Criteria:</strong></Typography>
              {selectedComp.scoringCriteria?.map((item, idx) => (
                <Chip key={idx} label={item} size="small" sx={{ m: 0.5 }} />
              ))}
              <Typography sx={{ mt: 2 }}><strong>Allowed Submission Types:</strong></Typography>
              {selectedComp.allowedSubmissionTypes?.map((item, idx) => (
                <Chip key={idx} label={item} size="small" color="secondary" sx={{ m: 0.5 }} />
              ))}
              {selectedComp.introVideoUrl && (
                <Button
                  variant="outlined"
                  href={selectedComp.introVideoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ mt: 3 }}
                >
                  Watch Intro Video
                </Button>
              )}
              {selectedComp.imageUrls?.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Display Images:
                  </Typography>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {selectedComp.imageUrls.map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt={`img-${idx}`}
                        style={{
                          width: 120,
                          height: 100,
                          objectFit: "cover",
                          borderRadius: 6,
                          border: "1px solid #ddd",
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default AdminCompetitionsManage;
