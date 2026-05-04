/**
 * @file AdminAccountManage.jsx
 * @description
 * Administrative interface for managing user accounts. Migrated from MUI to
 * shadcn/ui + Tailwind. Admins can list participants/organizers, search by
 * keyword, filter by role, and delete users via a shadcn confirmation Dialog.
 *
 * Role: Admin
 * Developer: Zhaoyi Yang
 */

import React, { useEffect, useState } from 'react';
import { Search, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../api/apiClient';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
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

const ROLE_FILTERS = [
  { value: '', label: 'All roles' },
  { value: 'ORGANIZER', label: 'Organizer' },
  { value: 'PARTICIPANT', label: 'Participant' },
];

function roleBadgeVariant(role) {
  const r = (role || '').toUpperCase();
  if (r === 'ADMIN') return 'destructive';
  if (r === 'ORGANIZER') return 'default';
  if (r === 'PARTICIPANT') return 'secondary';
  return 'outline';
}

function AdminAccountManage() {
  const [users, setUsers] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState('');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = async (currentPage, role, kw) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage,
        size: 10,
        ...(role && { role }),
        ...(kw && { keyword: kw }),
        sortBy: 'createdAt',
        order: 'desc',
      });
      const response = await apiClient.get(
        `/users/admin/list?${params.toString()}`
      );
      setUsers(response.data?.data || []);
      setTotalPages(response.data?.pages || 1);
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Failed to fetch users'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(page, roleFilter, keyword);
  }, [page, roleFilter, keyword]);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/users/${pendingDelete.id}`);
      toast.success('User deleted successfully');
      setPendingDelete(null);
      fetchUsers(page, roleFilter, keyword);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  const visibleUsers = users.filter((u) => u.role !== 'ADMIN' && u.role !== 'Admin');
  const activeRoleLabel =
    ROLE_FILTERS.find((r) => r.value === roleFilter)?.label || 'All roles';

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight">All Users</h2>
        <p className="text-sm text-muted-foreground">
          Manage participant and organizer accounts.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[220px] space-y-1.5">
          <Label htmlFor="user-search" className="text-xs text-muted-foreground">
            Search
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="user-search"
              type="search"
              placeholder="Search by name or email…"
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
          <Label className="text-xs text-muted-foreground">Role</Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="min-w-[160px] justify-between">
                {activeRoleLabel}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[160px]">
              {ROLE_FILTERS.map((opt) => (
                <DropdownMenuItem
                  key={opt.value || 'all'}
                  onSelect={() => {
                    setPage(1);
                    setRoleFilter(opt.value);
                  }}
                  className={cn(
                    roleFilter === opt.value && 'bg-accent text-accent-foreground'
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
                <th className="px-3 py-2 text-left font-medium">Email</th>
                <th className="px-3 py-2 text-left font-medium">Description</th>
                <th className="px-3 py-2 text-left font-medium">Role</th>
                <th className="px-3 py-2 text-right font-medium w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={`s-${idx}`}>
                    <td className="px-3 py-1.5"><Skeleton className="h-4 w-6" /></td>
                    <td className="px-3 py-1.5"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-3 py-1.5"><Skeleton className="h-4 w-40" /></td>
                    <td className="px-3 py-1.5"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-3 py-1.5"><Skeleton className="h-5 w-20 rounded-full" /></td>
                    <td className="px-3 py-1.5"><Skeleton className="h-7 w-12 ml-auto" /></td>
                  </tr>
                ))
              ) : visibleUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-12 text-center text-sm text-muted-foreground"
                  >
                    No users found.
                  </td>
                </tr>
              ) : (
                visibleUsers.map((user, index) => (
                  <tr
                    key={user.id}
                    className="hover:bg-muted/40 transition-colors"
                  >
                    <td className="px-3 py-1.5 text-muted-foreground tabular-nums">
                      {index + 1 + (page - 1) * 10}
                    </td>
                    <td className="px-3 py-1.5 font-medium">{user.name}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">{user.email}</td>
                    <td className="px-3 py-1.5 text-muted-foreground max-w-xs truncate">
                      {user.description || '—'}
                    </td>
                    <td className="px-3 py-1.5">
                      <Badge variant={roleBadgeVariant(user.role)} className="text-[10px]">
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setPendingDelete(user)}
                        aria-label={`Delete ${user.name}`}
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

      {/* Delete confirmation */}
      <Dialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete user?</DialogTitle>
            <DialogDescription>
              This will permanently remove{' '}
              <span className="font-medium text-foreground">
                {pendingDelete?.name}
              </span>{' '}
              ({pendingDelete?.email}). This action cannot be undone.
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
              {deleting ? 'Deleting…' : 'Delete user'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AdminAccountManage;
