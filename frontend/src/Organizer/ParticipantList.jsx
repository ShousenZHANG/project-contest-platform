/**
 * @file ParticipantList.jsx
 * @description
 * Manage participants/teams for a competition. Search, sort, delete, and export.
 * Migrated from MUI to shadcn/ui.
 *
 * Role: Organizer
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Trash2, Loader2, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { toast } from 'sonner';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import apiClient from '../api/apiClient';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

function ParticipantList() {
  const { competitionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const email = localStorage.getItem('email');

  const initialType = location.state?.participationType || '';
  const [participationType, setParticipationType] = useState(initialType);
  const [participants, setParticipants] = useState([]);
  const [teams, setTeams] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null, kind: null });

  const [competitionInfo, setCompetitionInfo] = useState({
    name: '',
    category: '',
    startDate: '',
    endDate: '',
    status: '',
  });

  const fetchCompetitionInfo = useCallback(async () => {
    try {
      const res = await apiClient.get(`/competitions/${competitionId}`);
      const data = res.data;
      setCompetitionInfo({
        name: data.name || 'Unnamed Competition',
        category: data.category || 'Unknown',
        startDate: data.startDate ? new Date(data.startDate).toLocaleDateString() : '',
        endDate: data.endDate ? new Date(data.endDate).toLocaleDateString() : '',
        status: data.status || '',
      });
      setParticipationType(
        (prev) => prev || data.selectedParticipationType || 'INDIVIDUAL'
      );
    } catch {
      // fetch error handled silently
    }
  }, [competitionId]);

  const fetchParticipants = useCallback(
    async (pageNum = 1, kw = '', order = 'asc') => {
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
    },
    [competitionId]
  );

  const fetchTeams = useCallback(
    async (pageNum = 1, kw = '', order = 'asc') => {
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
    },
    [competitionId]
  );

  useEffect(() => {
    fetchCompetitionInfo();
  }, [fetchCompetitionInfo]);

  useEffect(() => {
    if (participationType === 'TEAM') {
      fetchTeams(page, keyword, sortOrder);
    } else if (participationType === 'INDIVIDUAL') {
      fetchParticipants(page, keyword, sortOrder);
    }
  }, [fetchTeams, fetchParticipants, page, keyword, sortOrder, participationType]);

  const handleSearch = (e) => {
    setKeyword(e.target.value);
    setPage(1);
  };

  const handleSortToggle = () => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    setPage(1);
  };

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Participants');

    if (participationType === 'TEAM') {
      worksheet.columns = [
        { header: 'Team Name', key: 'name' },
        { header: 'Description', key: 'description' },
        { header: 'Created At', key: 'createdAt' },
      ];
      teams.forEach((team) => {
        worksheet.addRow({
          name: team.name,
          description: team.description || '',
          createdAt: new Date(team.createdAt).toLocaleString(),
        });
      });
    } else {
      worksheet.columns = [
        { header: 'Name', key: 'name' },
        { header: 'Email', key: 'email' },
        { header: 'Description', key: 'description' },
        { header: 'Registered At', key: 'registeredAt' },
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
    saveAs(
      new Blob([buffer]),
      `${competitionInfo.name}_${participationType}_List.xlsx`
    );
  };

  const handleDeleteConfirm = async () => {
    const { id, kind } = confirmDelete;
    if (!id) return;
    try {
      if (kind === 'TEAM') {
        await apiClient.delete(
          `/registrations/teams/${competitionId}/team/${id}/by-organizer`
        );
        toast.success('Team removed successfully');
        fetchTeams(page, keyword, sortOrder);
      } else {
        await apiClient.delete(
          `/registrations/${competitionId}/participants/${id}`
        );
        toast.success('Participant removed successfully');
        fetchParticipants(page, keyword, sortOrder);
      }
    } catch {
      toast.error('Error occurred during deletion');
    } finally {
      setConfirmDelete({ open: false, id: null, kind: null });
    }
  };

  const data = participationType === 'TEAM' ? teams : participants;

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          {participationType === 'TEAM' ? 'Teams' : 'Participants'} for: {competitionInfo.name}
        </h1>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
          <div>
            <span className="font-medium text-foreground">Category:</span> {competitionInfo.category}
          </div>
          <div>
            <span className="font-medium text-foreground">Period:</span>{' '}
            {competitionInfo.startDate} ~ {competitionInfo.endDate}
          </div>
          <div>
            <span className="font-medium text-foreground">Status:</span>{' '}
            <Badge variant="outline">{competitionInfo.status}</Badge>
          </div>
          <div>
            <span className="font-medium text-foreground">Total:</span> {totalCount}
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="min-w-[220px] flex-1 max-w-md space-y-1.5">
          <label htmlFor="participant-search" className="sr-only">
            Search by name
          </label>
          <Input
            id="participant-search"
            placeholder="Search by name"
            value={keyword}
            onChange={handleSearch}
          />
        </div>
        <Button variant="outline" onClick={handleSortToggle}>
          Sort: {sortOrder.toUpperCase()}
        </Button>
        <Button variant="default" onClick={exportToExcel} className="bg-success text-success-foreground hover:bg-success/90">
          <Download className="mr-1 h-4 w-4" />
          Export to Excel
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No data found.</p>
      ) : (
        <>
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2">Avatar</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">
                    {participationType === 'TEAM' ? 'Description' : 'Email'}
                  </th>
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2">
                    {participationType === 'TEAM' ? 'Created At' : 'Registered At'}
                  </th>
                  <th className="px-3 py-2">Delete</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <tr
                    key={item.id || item.userId}
                    className="border-b border-border last:border-0 hover:bg-muted/40"
                  >
                    <td className="px-3 py-1.5">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={item.avatarUrl || ''} alt={item.name} />
                        <AvatarFallback>
                          {(item.name || 'U').slice(0, 1).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </td>
                    <td className="px-3 py-1.5 font-medium text-foreground">{item.name}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">
                      {participationType === 'TEAM' ? item.description : item.email}
                    </td>
                    <td className="px-3 py-1.5 text-muted-foreground">
                      {participationType === 'TEAM' ? '-' : item.description}
                    </td>
                    <td className="px-3 py-1.5 text-muted-foreground">
                      {new Date(
                        participationType === 'TEAM' ? item.createdAt : item.registeredAt
                      ).toLocaleString()}
                    </td>
                    <td className="px-3 py-1.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() =>
                          setConfirmDelete({
                            open: true,
                            id: participationType === 'TEAM' ? item.id : item.userId,
                            kind: participationType,
                          })
                        }
                        aria-label="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      <div className="mt-4">
        <Button
          variant="outline"
          onClick={() => navigate(`/OrganizerContestList/${email}`)}
        >
          Back to Contest List
        </Button>
      </div>

      <Dialog
        open={confirmDelete.open}
        onOpenChange={(open) =>
          setConfirmDelete((prev) => ({ ...prev, open, id: open ? prev.id : null }))
        }
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Remove {confirmDelete.kind === 'TEAM' ? 'team' : 'participant'}?
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDelete({ open: false, id: null, kind: null })}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ParticipantList;
