/**
 * @file AdminCompetitionsManage.jsx
 * @description
 * Admin interface for managing competitions. Migrated from MUI to shadcn/ui +
 * Tailwind. Supports search, status/category filtering, viewing details in a
 * shadcn Dialog, and confirming deletions via Dialog (no native confirm()).
 *
 * Role: Admin
 * Developer: Zhaoyi Yang
 */

import React, { useEffect, useState } from 'react';
import {
  Search,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../api/apiClient';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Separator } from '../components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { cn } from '../lib/utils';

const STATUS_FILTERS = [
  { value: '', label: 'All statuses' },
  { value: 'UPCOMING', label: 'Upcoming' },
  { value: 'ONGOING', label: 'Ongoing' },
  { value: 'COMPLETED', label: 'Completed' },
];

const CATEGORY_FILTERS = [
  { value: '', label: 'All categories' },
  { value: 'Design & Creativity', label: 'Design & Creativity' },
  { value: 'Programming & Technology', label: 'Programming & Technology' },
  { value: 'Business & Entrepreneurship', label: 'Business & Entrepreneurship' },
  { value: 'Mathematics & Science', label: 'Mathematics & Science' },
  { value: 'Humanities & Social Sciences', label: 'Humanities & Social Sciences' },
  { value: 'Music & Performing Arts', label: 'Music & Performing Arts' },
  { value: 'Others', label: 'Others' },
];

function statusBadgeVariant(status) {
  const s = (status || '').toUpperCase();
  if (s === 'ONGOING') return 'success';
  if (s === 'UPCOMING') return 'default';
  if (s === 'COMPLETED') return 'secondary';
  return 'outline';
}

function AdminCompetitionsManage() {
  const [competitions, setCompetitions] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const [selectedComp, setSelectedComp] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCompetitions = async (currentPage, kw, status, category) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage,
        size: 10,
        ...(kw && { keyword: kw }),
        ...(status && { status }),
        ...(category && { category }),
      });
      const response = await apiClient.get(
        `/competitions/list?${params.toString()}`
      );
      setCompetitions(response.data?.data || []);
      setTotalPages(response.data?.pages || 1);
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Failed to fetch competitions'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompetitions(page, keyword, statusFilter, categoryFilter);
  }, [page, keyword, statusFilter, categoryFilter]);

  const fetchCompetitionDetail = async (id) => {
    try {
      const response = await apiClient.get(`/competitions/${id}`);
      setSelectedComp(response.data);
      setDetailOpen(true);
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Failed to fetch competition detail'
      );
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/competitions/delete/${pendingDelete.id}`);
      toast.success('Competition deleted successfully');
      setCompetitions((prev) => prev.filter((c) => c.id !== pendingDelete.id));
      setPendingDelete(null);
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Failed to delete competition'
      );
    } finally {
      setDeleting(false);
    }
  };

  const activeStatusLabel =
    STATUS_FILTERS.find((s) => s.value === statusFilter)?.label || 'All statuses';
  const activeCategoryLabel =
    CATEGORY_FILTERS.find((c) => c.value === categoryFilter)?.label ||
    'All categories';

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight">All Competitions</h2>
        <p className="text-sm text-muted-foreground">
          View and manage every competition on the platform.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[240px] space-y-1.5">
          <Label htmlFor="comp-search" className="text-xs text-muted-foreground">
            Search
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="comp-search"
              type="search"
              placeholder="Search competitions…"
              value={keyword}
              onChange={(e) => {
                setPage(1);
                setKeyword(e.target.value);
              }}
              className="pl-9"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="min-w-[160px] justify-between">
                {activeStatusLabel}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[160px]">
              {STATUS_FILTERS.map((opt) => (
                <DropdownMenuItem
                  key={opt.value || 'all'}
                  onSelect={() => {
                    setPage(1);
                    setStatusFilter(opt.value);
                  }}
                  className={cn(
                    statusFilter === opt.value &&
                      'bg-accent text-accent-foreground'
                  )}
                >
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Category</Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="min-w-[200px] justify-between">
                <span className="truncate">{activeCategoryLabel}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[240px]">
              {CATEGORY_FILTERS.map((opt) => (
                <DropdownMenuItem
                  key={opt.value || 'all'}
                  onSelect={() => {
                    setPage(1);
                    setCategoryFilter(opt.value);
                  }}
                  className={cn(
                    categoryFilter === opt.value &&
                      'bg-accent text-accent-foreground'
                  )}
                >
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium w-10">#</th>
                <th className="px-3 py-2 text-left font-medium">Name</th>
                <th className="px-3 py-2 text-left font-medium">Category</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-left font-medium">Start</th>
                <th className="px-3 py-2 text-left font-medium">End</th>
                <th className="px-3 py-2 text-right font-medium w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={`s-${idx}`}>
                    <td className="px-3 py-1.5"><Skeleton className="h-4 w-6" /></td>
                    <td className="px-3 py-1.5"><Skeleton className="h-4 w-40" /></td>
                    <td className="px-3 py-1.5"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-3 py-1.5"><Skeleton className="h-5 w-20 rounded-full" /></td>
                    <td className="px-3 py-1.5"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-3 py-1.5"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-3 py-1.5"><Skeleton className="h-7 w-12 ml-auto" /></td>
                  </tr>
                ))
              ) : competitions.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-12 text-center text-sm text-muted-foreground"
                  >
                    No competitions found.
                  </td>
                </tr>
              ) : (
                competitions.map((comp, index) => (
                  <tr
                    key={comp.id}
                    className="hover:bg-muted/40 transition-colors"
                  >
                    <td className="px-3 py-1.5 text-muted-foreground tabular-nums">
                      {index + 1 + (page - 1) * 10}
                    </td>
                    <td className="px-3 py-1.5">
                      <button
                        type="button"
                        onClick={() => fetchCompetitionDetail(comp.id)}
                        className="font-medium text-primary hover:underline text-left"
                      >
                        {comp.name}
                      </button>
                    </td>
                    <td className="px-3 py-1.5 text-muted-foreground">
                      {comp.category}
                    </td>
                    <td className="px-3 py-1.5">
                      <Badge
                        variant={statusBadgeVariant(comp.status)}
                        className="text-[10px]"
                      >
                        {comp.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-1.5 text-muted-foreground tabular-nums">
                      {new Date(comp.startDate).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-1.5 text-muted-foreground tabular-nums">
                      {new Date(comp.endDate).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setPendingDelete(comp)}
                        aria-label={`Delete ${comp.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Page <span className="font-medium text-foreground">{page}</span> of{' '}
          <span className="font-medium text-foreground">{totalPages}</span>
        </span>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Prev
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 pr-6">
              <span className="truncate">{selectedComp?.name}</span>
              {selectedComp?.status && (
                <Badge variant={statusBadgeVariant(selectedComp.status)}>
                  {selectedComp.status}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedComp && (
            <div className="space-y-4 text-sm">
              <p className="text-muted-foreground leading-relaxed">
                {selectedComp.description}
              </p>

              <Separator />

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Category</p>
                  <p className="font-medium">{selectedComp.category}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Participation</p>
                  <p className="font-medium">{selectedComp.participationType}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Start</p>
                  <p className="font-medium">
                    {new Date(selectedComp.startDate).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">End</p>
                  <p className="font-medium">
                    {new Date(selectedComp.endDate).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Public</p>
                  <p className="font-medium">
                    {selectedComp.isPublic ? 'Yes' : 'No'}
                  </p>
                </div>
              </div>

              {selectedComp.scoringCriteria?.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">
                      Scoring Criteria
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedComp.scoringCriteria.map((item, idx) => (
                        <Badge key={idx} variant="outline">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {selectedComp.allowedSubmissionTypes?.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Allowed Submission Types
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedComp.allowedSubmissionTypes.map((item, idx) => (
                      <Badge key={idx} variant="secondary">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedComp.introVideoUrl && (
                <Button asChild variant="outline" size="sm">
                  <a
                    href={selectedComp.introVideoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Watch Intro Video
                  </a>
                </Button>
              )}

              {selectedComp.imageUrls?.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">
                      Display Images
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedComp.imageUrls.map((url, idx) => (
                        <img
                          key={idx}
                          src={url}
                          alt={`Display ${idx + 1}`}
                          className="h-24 w-32 rounded-md border border-border object-cover"
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete competition?</DialogTitle>
            <DialogDescription>
              This will permanently remove{' '}
              <span className="font-medium text-foreground">
                {pendingDelete?.name}
              </span>
              . This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingDelete(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : 'Delete competition'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AdminCompetitionsManage;
