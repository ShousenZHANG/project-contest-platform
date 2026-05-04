/**
 * @file ContestList.jsx
 * @description
 * Organizer's contest list with search, filters, and per-row actions.
 * Migrated from MUI to shadcn/ui. Compact data-dense table.
 *
 * Role: Organizer
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, X, Plus } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../api/apiClient';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card } from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '../components/ui/sheet';

const SELECT_CLASS =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

function statusVariant(status) {
  if (status === 'ONGOING') return 'success';
  if (status === 'UPCOMING') return 'warning';
  if (status === 'COMPLETED') return 'secondary';
  return 'outline';
}

function OrganizerContestList() {
  const [competitions, setCompetitions] = useState([]);
  const [filteredCompetitions, setFilteredCompetitions] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [selectedParticipationType, setSelectedParticipationType] = useState('');
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });

  const navigate = useNavigate();
  const email = localStorage.getItem('email');

  useEffect(() => {
    const fetchCompetitions = async () => {
      try {
        const response = await apiClient.get('/competitions/achieve/my');
        const data = response.data;
        if (Array.isArray(data.data)) {
          setCompetitions(data.data);
          setFilteredCompetitions(data.data);
        }
      } catch {
        // fetch error handled silently
      }
    };
    fetchCompetitions();
  }, []);

  useEffect(() => {
    const filtered = competitions.filter((comp) => {
      const matchesSearch = comp.name.toLowerCase().includes(searchInput.toLowerCase());
      const matchesStatus = selectedStatus ? comp.status === selectedStatus : true;
      const matchesCategory =
        selectedCategories.length > 0 ? selectedCategories.includes(comp.category) : true;
      const matchesParticipation = selectedParticipationType
        ? comp.participationType === selectedParticipationType
        : true;
      return matchesSearch && matchesStatus && matchesCategory && matchesParticipation;
    });
    setFilteredCompetitions(filtered);
  }, [
    searchInput,
    selectedStatus,
    selectedCategories,
    selectedParticipationType,
    competitions,
  ]);

  const handleCreate = () => navigate(`/OrganizerContest/${email}`);

  const handleEdit = (competitionId) => {
    navigate(`/OrganizerEditContest/${email}?competitionId=${competitionId}`);
  };

  const handleDelete = async () => {
    const competitionId = confirmDelete.id;
    if (!competitionId) return;
    try {
      await apiClient.delete(`/competitions/delete/${competitionId}`);
      setCompetitions((prev) => prev.filter((comp) => comp.id !== competitionId));
      toast.success('Competition deleted');
    } catch {
      toast.error('An error occurred while deleting the competition.');
    } finally {
      setConfirmDelete({ open: false, id: null });
    }
  };

  const handleCategoryChange = (category) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Contests</h1>
          <p className="text-sm text-muted-foreground">
            {filteredCompetitions.length} of {competitions.length} contest(s) shown.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleCreate}>
            <Plus className="mr-1 h-4 w-4" />
            New Competition
          </Button>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        <Input
          type="text"
          placeholder="Search by name..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="max-w-md"
        />
        <Button variant="outline" onClick={() => setIsFilterVisible(true)}>
          <Filter className="mr-1 h-4 w-4" />
          Filter
        </Button>
      </div>

      <Sheet open={isFilterVisible} onOpenChange={setIsFilterVisible}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-5">
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Status
              </h4>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="">All</option>
                <option value="UPCOMING">UPCOMING</option>
                <option value="ONGOING">ONGOING</option>
                <option value="COMPLETED">COMPLETED</option>
              </select>
            </div>

            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Participation Type
              </h4>
              <select
                value={selectedParticipationType}
                onChange={(e) => setSelectedParticipationType(e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="">All</option>
                <option value="INDIVIDUAL">INDIVIDUAL</option>
                <option value="TEAM">TEAM</option>
              </select>
            </div>

            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Category
              </h4>
              <div className="flex flex-col gap-1.5">
                {competitions.length > 0 &&
                  Array.from(new Set(competitions.map((item) => item.category)))
                    .sort((a, b) => a.localeCompare(b))
                    .map((category) => (
                      <label key={category} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(category)}
                          onChange={() => handleCategoryChange(category)}
                          className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                        />
                        {category}
                      </label>
                    ))}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {filteredCompetitions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No competitions found.</p>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Start</th>
                <th className="px-3 py-2">End</th>
                <th className="px-3 py-2">Edit</th>
                <th className="px-3 py-2">Media</th>
                <th className="px-3 py-2">Delete</th>
                <th className="px-3 py-2">Participants</th>
                <th className="px-3 py-2">Submissions</th>
                <th className="px-3 py-2">Add Judge</th>
              </tr>
            </thead>
            <tbody>
              {filteredCompetitions.map((comp, index) => (
                <tr key={comp.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                  <td className="px-3 py-1.5 text-muted-foreground">{index + 1}</td>
                  <td className="px-3 py-1.5 font-medium text-foreground">{comp.name}</td>
                  <td className="px-3 py-1.5 text-muted-foreground">{comp.category}</td>
                  <td className="px-3 py-1.5">
                    <Badge variant={statusVariant(comp.status)}>{comp.status}</Badge>
                  </td>
                  <td className="px-3 py-1.5 text-muted-foreground">
                    {new Date(comp.startDate).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-1.5 text-muted-foreground">
                    {new Date(comp.endDate).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-1.5">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(comp.id)}>
                      Edit
                    </Button>
                  </td>
                  <td className="px-3 py-1.5">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => navigate(`/OrganizerUploadMedia/${comp.id}`)}
                    >
                      Upload
                    </Button>
                  </td>
                  <td className="px-3 py-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-destructive text-destructive hover:bg-destructive/10"
                      onClick={() => setConfirmDelete({ open: true, id: comp.id })}
                    >
                      Delete
                    </Button>
                  </td>
                  <td className="px-3 py-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        navigate(`/OrganizerParticipantList/${comp.id}`, {
                          state: { participationType: comp.participationType },
                        })
                      }
                    >
                      View
                    </Button>
                  </td>
                  <td className="px-3 py-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/OrganizerSubmissions/${comp.id}`)}
                    >
                      Check
                    </Button>
                  </td>
                  <td className="px-3 py-1.5">
                    <Button
                      size="sm"
                      onClick={() => navigate(`/OrganizerAddJudge/${comp.id}`)}
                    >
                      Add
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Dialog
        open={confirmDelete.open}
        onOpenChange={(open) => setConfirmDelete({ open, id: open ? confirmDelete.id : null })}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete competition?</DialogTitle>
            <DialogDescription>
              This will permanently remove the competition and its data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete({ open: false, id: null })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default OrganizerContestList;
