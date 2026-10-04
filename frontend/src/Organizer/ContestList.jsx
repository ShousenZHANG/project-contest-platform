import { parseApiDateTime } from '@/lib/dateTime';
/**
 * @file ContestList.jsx
 * @description
 * Organizer's contest list with search, filters, and per-row actions.
 * Migrated from MUI to shadcn/ui. Compact data-dense table.
 *
 * Role: Organizer
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Filter, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { competitionService } from '../services/competitionService';
import { queryKeys, staleTime } from '../api/queryKeys';
import { unwrap, toMessage } from '../api/queryFn';
import PageSkeleton from '../shared/components/PageSkeleton';
import PageError from '../shared/components/PageError';
import ConfirmDialog from '../shared/components/ConfirmDialog';
import Pagination from '../shared/components/Pagination';
import usePagedSearchParams from '../shared/hooks/usePagedSearchParams';
import { CATEGORIES } from '../shared/competitionCategories';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Card } from '../components/ui/card';
import AuthTokenManager from '@/auth/authTokenManager';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet';

const SELECT_CLASS =
  'flex h-11 w-full rounded-md border border-input bg-background px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

function statusVariant(status) {
  if (status === 'ONGOING') return 'success';
  if (status === 'UPCOMING') return 'warning';
  if (status === 'COMPLETED') return 'secondary';
  return 'outline';
}

function OrganizerContestList() {
  const [transition, setTransition] = useState(null);
  useDocumentTitle('My Contests');
  const state = usePagedSearchParams();
  const selectedStatus = state.searchParams.get('status') || '';
  const category = state.searchParams.get('category') || '';
  const selectedParticipationType = state.searchParams.get('participationType') || '';
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const email = AuthTokenManager.getEmail();

  const params = {
    page: state.page,
    size: 10,
    ...(state.keyword && { keyword: state.keyword }),
    ...(selectedStatus && { status: selectedStatus }),
    ...(category && { category }),
    ...(selectedParticipationType && { participationType: selectedParticipationType }),
  };
  const listKey = queryKeys.competitions.mine(params);

  const {
    data: listPage,
    isPending,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: listKey,
    queryFn: () => unwrap(competitionService.getMyOrganized(params)),
    staleTime: staleTime.short,
  });

  const competitions = listPage?.data || [];

  const deleteCompetition = useMutation({
    mutationFn: (competitionId) => unwrap(competitionService.delete(competitionId)),

    // Drop the row immediately; the organizer already confirmed in the dialog.
    onMutate: async (competitionId) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData(listKey);

      queryClient.setQueryData(listKey, (page) =>
        page
          ? { ...page, data: (page.data ?? []).filter((comp) => comp.id !== competitionId) }
          : page,
      );

      return { previous };
    },

    onError: (err, _competitionId, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(listKey, context.previous);
      }
      toast.error(toMessage(err));
    },

    onSuccess: () => toast.success('Competition deleted'),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.competitions.all }),
  });

  const handleCreate = () => navigate(`/OrganizerContest/${email}`);

  const handleEdit = (competitionId) => {
    navigate(`/OrganizerEditContest/${email}?competitionId=${competitionId}`);
  };

  const handleDelete = () => {
    const competitionId = confirmDelete.id;
    setConfirmDelete({ open: false, id: null });
    if (competitionId) deleteCompetition.mutate(competitionId);
  };

  const changeStatus = useMutation({
    mutationFn: ({ id, status }) => unwrap(competitionService.update(id, { status })),
    onSuccess: () => {
      setTransition(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.competitions.all });
    },
    onError: () => setTransition(null),
  });

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Contests</h1>
          <p className="text-sm text-muted-foreground">
            Manage registration, submissions, judging and published awards.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleCreate}>
            <Plus className="mr-1 h-4 w-4" />
            New Competition
          </Button>
        </div>
      </div>

      <form className="mb-4 flex flex-wrap items-end gap-2" onSubmit={state.submitSearch}>
        <div className="min-w-0 flex-1 space-y-2">
          <Label htmlFor="organizer-contest-search">Search my contests</Label>
          <Input
            id="organizer-contest-search"
            type="search"
            placeholder="Search by name..."
            value={state.searchInput}
            onChange={(e) => state.setSearchInput(e.target.value)}
            className="h-11 text-base"
          />
        </div>
        <Button type="submit" className="min-h-11">
          Search
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          onClick={() => setIsFilterVisible(true)}
        >
          <Filter className="mr-1 h-4 w-4" />
          Filter
        </Button>
      </form>

      <Sheet open={isFilterVisible} onOpenChange={setIsFilterVisible}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-5">
            <div>
              <Label htmlFor="organizer-contest-status">Status</Label>
              <select
                id="organizer-contest-status"
                value={selectedStatus}
                onChange={(e) => state.setFilters({ status: e.target.value })}
                className={SELECT_CLASS}
              >
                <option value="">All</option>
                <option value="UPCOMING">UPCOMING</option>
                <option value="ONGOING">ONGOING</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="AWARDED">AWARDED</option>
                <option value="CANCELED">CANCELED</option>
              </select>
            </div>

            <div>
              <Label htmlFor="organizer-contest-participation">Participation Type</Label>
              <select
                id="organizer-contest-participation"
                value={selectedParticipationType}
                onChange={(e) => state.setFilters({ participationType: e.target.value })}
                className={SELECT_CLASS}
              >
                <option value="">All</option>
                <option value="INDIVIDUAL">INDIVIDUAL</option>
                <option value="TEAM">TEAM</option>
              </select>
            </div>

            <div>
              <Label htmlFor="organizer-contest-category">Category</Label>
              <select
                id="organizer-contest-category"
                value={category}
                className={SELECT_CLASS}
                onChange={(e) => state.setFilters({ category: e.target.value })}
              >
                <option value="">All</option>
                {CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  state.setFilters({ status: '', category: '', participationType: '', keyword: '' })
                }
              >
                Clear filters
              </Button>
              <Button onClick={() => setIsFilterVisible(false)}>Done</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {isPending ? (
        <PageSkeleton rows={6} />
      ) : error ? (
        <PageError error={error} onRetry={() => refetch()} retrying={isFetching} />
      ) : competitions.length === 0 ? (
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
                <th className="px-3 py-2">Lifecycle</th>
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
              {competitions.map((comp, index) => (
                <tr
                  key={comp.id}
                  className="border-b border-border last:border-0 hover:bg-muted/40"
                >
                  <td className="px-3 py-1.5 text-muted-foreground">
                    {(state.page - 1) * 10 + index + 1}
                  </td>
                  <td className="px-3 py-1.5 font-medium text-foreground">{comp.name}</td>
                  <td className="px-3 py-1.5 text-muted-foreground">{comp.category}</td>
                  <td className="px-3 py-1.5">
                    <Badge variant={statusVariant(comp.status)}>{comp.status}</Badge>
                  </td>
                  <td className="px-3 py-1.5">
                    {comp.status === 'UPCOMING' ? (
                      <Button
                        variant="outline"
                        onClick={() =>
                          setTransition({ id: comp.id, name: comp.name, status: 'ONGOING' })
                        }
                      >
                        Start competition
                      </Button>
                    ) : comp.status === 'ONGOING' ? (
                      <Button
                        variant="outline"
                        onClick={() =>
                          setTransition({ id: comp.id, name: comp.name, status: 'COMPLETED' })
                        }
                      >
                        End submissions
                      </Button>
                    ) : comp.status === 'COMPLETED' || comp.status === 'AWARDED' ? (
                      <Button
                        variant="outline"
                        onClick={() => navigate(`/submissions/${comp.id}/ratings`)}
                      >
                        Awards and readiness
                      </Button>
                    ) : (
                      <span className="text-muted-foreground">Closed</span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-muted-foreground">
                    {parseApiDateTime(comp.startDate).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-1.5 text-muted-foreground">
                    {parseApiDateTime(comp.endDate).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={['AWARDED', 'CANCELED'].includes(comp.status)}
                      onClick={() => handleEdit(comp.id)}
                    >
                      Edit
                    </Button>
                  </td>
                  <td className="px-3 py-1.5">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={!['UPCOMING', 'ONGOING'].includes(comp.status)}
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
                      disabled={comp.status === 'AWARDED'}
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
                    <Button size="sm" onClick={() => navigate(`/OrganizerAddJudge/${comp.id}`)}>
                      Add
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {!isPending && !error && (
        <Pagination
          page={state.page}
          pages={listPage?.pages}
          total={listPage?.total ?? competitions.length}
          onPageChange={state.setPage}
          busy={isFetching}
        />
      )}

      {changeStatus.error && <PageError error={changeStatus.error} />}
      <ConfirmDialog
        open={Boolean(transition)}
        title={transition?.status === 'ONGOING' ? 'Start competition?' : 'End submissions?'}
        message={
          transition?.status === 'ONGOING'
            ? `Opening ${transition?.name} locks its criteria, entry type and schedule.`
            : `Completing ${transition?.name} closes submissions and opens judging. This cannot be undone.`
        }
        confirmLabel={transition?.status === 'ONGOING' ? 'Start competition' : 'End submissions'}
        pending={changeStatus.isPending}
        onConfirm={() => changeStatus.mutate(transition)}
        onCancel={() => setTransition(null)}
      />
      <Dialog
        open={confirmDelete.open}
        onOpenChange={(open) => setConfirmDelete({ open, id: open ? confirmDelete.id : null })}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete competition?</DialogTitle>
            <DialogDescription>
              This will permanently remove the competition and its data. This action cannot be
              undone.
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
