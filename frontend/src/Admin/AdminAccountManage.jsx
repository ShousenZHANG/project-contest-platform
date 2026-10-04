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

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { userService } from '../services/userService';
import { queryKeys, staleTime } from '../api/queryKeys';
import { unwrap, toMessage } from '../api/queryFn';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
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
import PageError from '../shared/components/PageError';

const ROLE_FILTERS = [
  { value: '', label: 'All roles' },
  { value: 'ORGANIZER', label: 'Organizer' },
  { value: 'PARTICIPANT', label: 'Participant' },
  { value: 'JUDGE', label: 'Judge' },
];

function roleBadgeVariant(role) {
  const r = (role || '').toUpperCase();
  if (r === 'ADMIN') return 'destructive';
  if (r === 'ORGANIZER') return 'default';
  if (r === 'PARTICIPANT') return 'secondary';
  return 'outline';
}

function AdminAccountManage() {
  useDocumentTitle('Manage Accounts');
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState('');
  const [keyword, setKeyword] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newJudge, setNewJudge] = useState({ name: '', email: '', password: '' });
  const [createValidation, setCreateValidation] = useState('');

  const queryClient = useQueryClient();

  const listParams = {
    page,
    size: 10,
    ...(roleFilter && { role: roleFilter }),
    ...(keyword && { keyword }),
    sortBy: 'createdAt',
    order: 'desc',
  };
  const listKey = queryKeys.users.adminList(listParams);

  const {
    data,
    isPending: loading,
    error: listError,
    refetch,
  } = useQuery({
    queryKey: listKey,
    queryFn: () => unwrap(userService.listUsersAdmin(listParams)),
    staleTime: staleTime.short,
  });

  const users = data?.data ?? [];
  const totalPages = data?.pages ?? 1;

  const deleteUser = useMutation({
    mutationFn: (userId) => unwrap(userService.deleteUser(userId)),

    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData(listKey);

      queryClient.setQueryData(listKey, (current) =>
        current
          ? { ...current, data: (current.data ?? []).filter((u) => u.id !== userId) }
          : current,
      );

      return { previous };
    },

    onError: (error, _userId, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(listKey, context.previous);
      }
      toast.error(toMessage(error));
    },

    onSuccess: () => toast.success('User deleted successfully'),

    // Removing a row shifts every later page, so resync the whole admin list.
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.users.all }),
  });

  const confirmDelete = () => {
    if (!pendingDelete || deleteUser.isPending) return;
    const userId = pendingDelete.id;
    setPendingDelete(null);
    deleteUser.mutate(userId);
  };

  const createJudge = useMutation({
    mutationFn: (data) => unwrap(userService.provisionJudge(data)),
    onSuccess: () => {
      setCreateOpen(false);
      setNewJudge({ name: '', email: '', password: '' });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      toast.success('Judge account created');
    },
  });
  const submitJudge = (event) => {
    event.preventDefault();
    if (createJudge.isPending) return;
    if (
      !newJudge.name.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newJudge.email) ||
      newJudge.password.length < 8 ||
      !/[A-Z]/.test(newJudge.password) ||
      !/[0-9]/.test(newJudge.password)
    ) {
      setCreateValidation(
        'Enter a name, a valid email, and a password of at least 8 characters with an uppercase letter and a number.',
      );
      return;
    }
    setCreateValidation('');
    createJudge.mutate({ ...newJudge, name: newJudge.name.trim(), email: newJudge.email.trim() });
  };

  const deleting = deleteUser.isPending;

  const visibleUsers = users.filter((u) => u.role !== 'ADMIN' && u.role !== 'Admin');
  const activeRoleLabel = ROLE_FILTERS.find((r) => r.value === roleFilter)?.label || 'All roles';

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">All Users</h1>
        <p className="text-sm text-muted-foreground">
          Manage participant, organizer and judge accounts.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-end gap-3">
        <Button
          onClick={() => {
            createJudge.reset();
            setCreateValidation('');
            setCreateOpen(true);
          }}
          className="min-h-11"
        >
          Create judge
        </Button>
        <div className="flex-1 min-w-[220px] space-y-1.5">
          <Label htmlFor="user-search" className="text-xs text-muted-foreground">
            Search
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="user-search"
              type="search"
              placeholder="Search by name or email..."
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
                  className={cn(roleFilter === opt.value && 'bg-accent text-accent-foreground')}
                >
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      {listError && <PageError error={listError} onRetry={() => refetch()} />}
      {deleteUser.error && <PageError error={deleteUser.error} />}
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
                <>
                  <tr>
                    <td colSpan={6} className="sr-only">
                      Loading users...
                    </td>
                  </tr>
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <tr key={`s-${idx}`}>
                      <td className="px-3 py-1.5">
                        <Skeleton className="h-4 w-6" />
                      </td>
                      <td className="px-3 py-1.5">
                        <Skeleton className="h-4 w-24" />
                      </td>
                      <td className="px-3 py-1.5">
                        <Skeleton className="h-4 w-40" />
                      </td>
                      <td className="px-3 py-1.5">
                        <Skeleton className="h-4 w-32" />
                      </td>
                      <td className="px-3 py-1.5">
                        <Skeleton className="h-5 w-20 rounded-full" />
                      </td>
                      <td className="px-3 py-1.5">
                        <Skeleton className="h-7 w-12 ml-auto" />
                      </td>
                    </tr>
                  ))}
                </>
              ) : visibleUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-12 text-center text-sm text-muted-foreground">
                    No users found.
                  </td>
                </tr>
              ) : (
                visibleUsers.map((user, index) => (
                  <tr key={user.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-3 py-1.5 text-muted-foreground tabular-nums">
                      {index + 1 + (page - 1) * 10}
                    </td>
                    <td className="px-3 py-1.5 font-medium">{user.name}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">{user.email}</td>
                    <td className="px-3 py-1.5 text-muted-foreground max-w-xs truncate">
                      {user.description || '-'}
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
        open={createOpen}
        onOpenChange={(open) => {
          if (!createJudge.isPending) {
            setCreateOpen(open);
            if (!open) setNewJudge({ name: '', email: '', password: '' });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create judge account</DialogTitle>
            <DialogDescription>
              Provide a dedicated judge account. Assign competitions separately from the organizer
              workspace.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitJudge} className="space-y-4">
            {[
              ['name', 'Name', 'text'],
              ['email', 'Email', 'email'],
              ['password', 'Temporary password', 'password'],
            ].map(([key, label, type]) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={`judge-${key}`}>{label}</Label>
                <Input
                  id={`judge-${key}`}
                  type={type}
                  required
                  autoComplete={key === 'password' ? 'new-password' : 'off'}
                  minLength={key === 'password' ? 8 : undefined}
                  value={newJudge[key]}
                  disabled={createJudge.isPending}
                  onChange={(event) =>
                    setNewJudge((current) => ({ ...current, [key]: event.target.value }))
                  }
                  className="h-11 text-base"
                />
              </div>
            ))}
            <p className="text-sm text-muted-foreground">
              Password: at least 8 characters, one uppercase letter and a number. Share it with the judge
              through your established private channel.
            </p>
            {createValidation && (
              <p role="alert" className="text-sm text-destructive">
                {createValidation}
              </p>
            )}
            {createJudge.error && <PageError error={createJudge.error} />}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                disabled={createJudge.isPending}
                onClick={() => {
                  setCreateOpen(false);
                  setNewJudge({ name: '', email: '', password: '' });
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="min-h-11"
                disabled={createJudge.isPending}
                aria-busy={createJudge.isPending}
              >
                {createJudge.isPending ? 'Creating…' : 'Create account'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete user?</DialogTitle>
            <DialogDescription>
              This will permanently remove{' '}
              <span className="font-medium text-foreground">{pendingDelete?.name}</span> (
              {pendingDelete?.email}). This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete user'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AdminAccountManage;
