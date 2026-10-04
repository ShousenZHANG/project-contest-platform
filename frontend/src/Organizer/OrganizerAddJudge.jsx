import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { competitionService } from '../services/competitionService';
import { queryKeys, staleTime } from '../api/queryKeys';
import { unwrap } from '../api/queryFn';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import AuthTokenManager from '@/auth/authTokenManager';
import PageError from '../shared/components/PageError';
import PageSkeleton from '../shared/components/PageSkeleton';
import Pagination from '../shared/components/Pagination';
import ConfirmDialog from '../shared/components/ConfirmDialog';
import usePagedSearchParams from '../shared/hooks/usePagedSearchParams';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function OrganizerAddJudge() {
  useDocumentTitle('Assign competition judges');
  const { competitionId } = useParams();
  const navigate = useNavigate();
  const state = usePagedSearchParams();
  const queryClient = useQueryClient();
  const [judgeEmail, setJudgeEmail] = useState('');
  const [validationError, setValidationError] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const competitionQuery = useQuery({
    queryKey: queryKeys.competitions.managedDetail(competitionId),
    queryFn: () => unwrap(competitionService.getManagedById(competitionId)),
    enabled: Boolean(competitionId),
    staleTime: staleTime.short,
  });
  const competition = competitionQuery.data;
  const params = { page: state.page, size: 10 };
  const judgesQuery = useQuery({
    queryKey: [...queryKeys.competitions.judges(competitionId), params],
    queryFn: () => unwrap(competitionService.getJudges(competitionId, params)),
    enabled: Boolean(competition),
    staleTime: staleTime.short,
  });
  const canEdit = ['UPCOMING', 'ONGOING', 'COMPLETED'].includes(competition?.status);
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.competitions.judges(competitionId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.winners.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.judges.all });
  };
  const assign = useMutation({
    mutationFn: (judgeEmails) => unwrap(competitionService.assignJudges(competitionId, { judgeEmails })),
    onSuccess: () => { setJudgeEmail(''); refresh(); toast.success('Judges assigned'); },
  });
  const remove = useMutation({
    mutationFn: (judgeId) => unwrap(competitionService.removeJudge(competitionId, judgeId)),
    onSuccess: () => { setDeleteId(null); refresh(); toast.success('Judge removed'); },
  });
  const busy = assign.isPending || remove.isPending;
  const add = (event) => {
    event.preventDefault();
    if (!canEdit || busy) return;
    const emails = [...new Set(judgeEmail.split(',').map((email) => email.trim().toLowerCase()).filter(Boolean))];
    if (!emails.length || emails.some((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      setValidationError('Enter valid Judge email addresses separated by commas.');
      return;
    }
    setValidationError('');
    assign.mutate(emails);
  };
  const judges = judgesQuery.data?.data || [];
  return (
    <div className="mx-auto max-w-5xl space-y-5 py-6">
      <header>
        <h1 className="break-words text-2xl font-semibold tracking-tight">Judges for: {competition?.name || 'Competition'}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Only existing Judge accounts can be assigned. Every approved work needs at least 3 independent Judge scores before awarding.</p>
      </header>
      {competitionQuery.isPending ? <PageSkeleton rows={2} /> : competitionQuery.error ? (
        <PageError error={competitionQuery.error} onRetry={() => competitionQuery.refetch()} retrying={competitionQuery.isFetching} />
      ) : (
        <>
          {!canEdit && <p role="status" className="rounded-md border p-4 text-sm">Judge assignments are locked for this {competition?.status?.toLowerCase()} competition.</p>}
          <form onSubmit={add} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 space-y-2">
              <Label htmlFor="judgeEmail">Judge Email(s)</Label>
              <Input id="judgeEmail" className="h-11 text-base" value={judgeEmail} autoCapitalize="none" autoComplete="off" inputMode="email"
                disabled={!canEdit || busy} aria-invalid={Boolean(validationError)} aria-describedby="judge-email-help judge-email-error"
                onChange={(event) => { setJudgeEmail(event.target.value); setValidationError(''); assign.reset(); }} />
              <p id="judge-email-help" className="text-sm text-muted-foreground">Separate multiple email addresses with commas. Ask an Admin to create accounts for new judges.</p>
              <p id="judge-email-error" role={validationError ? 'alert' : undefined} className="text-sm text-destructive">{validationError}</p>
            </div>
            <Button type="submit" className="min-h-11" disabled={!canEdit || busy} aria-busy={assign.isPending}>{assign.isPending ? 'Assigning…' : 'Add Judge'}</Button>
          </form>
          {assign.error && <PageError error={assign.error} />}
          {remove.error && <PageError error={remove.error} />}
          {judgesQuery.isPending ? <PageSkeleton rows={3} /> : judgesQuery.error ? (
            <PageError error={judgesQuery.error} onRetry={() => judgesQuery.refetch()} retrying={judgesQuery.isFetching} />
          ) : (
            <>
              <Card className="overflow-hidden">
                <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Assigned judges">
                  <table className="w-full text-sm">
                    <caption className="sr-only">Judges assigned to this competition</caption>
                    <thead className="border-b bg-muted/40 text-left"><tr>{['#', 'Email', 'Action'].map((label) => <th key={label} scope="col" className="px-4 py-3">{label}</th>)}</tr></thead>
                    <tbody>
                      {judges.length ? judges.map((judge, index) => (
                        <tr key={judge.id} className="border-b last:border-0">
                          <td className="px-4 py-3">{(state.page - 1) * 10 + index + 1}</td>
                          <th scope="row" className="break-all px-4 py-3 text-left font-medium">{judge.email}</th>
                          <td className="px-4 py-3"><Button variant="outline" className="min-h-11 text-destructive" disabled={!canEdit || busy}
                            aria-label={`Delete ${judge.email}`} onClick={() => { remove.reset(); setDeleteId(judge.id); }}>Delete</Button></td>
                        </tr>
                      )) : <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">No judges assigned on this page.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </Card>
              <Pagination page={state.page} pages={judgesQuery.data?.pages} total={judgesQuery.data?.total ?? judges.length}
                onPageChange={state.setPage} busy={judgesQuery.isFetching || busy} />
            </>
          )}
        </>
      )}
      <Button variant="outline" className="min-h-11" onClick={() => navigate(`/OrganizerContestList/${encodeURIComponent(AuthTokenManager.getEmail() || '')}`)}>Back to Contest List</Button>
      <ConfirmDialog open={deleteId != null} title="Remove judge?" message="This revokes the assignment. Their existing scores will no longer count toward award eligibility."
        confirmLabel="Remove" confirmVariant="destructive" pending={remove.isPending} error={remove.error} onConfirm={() => { if (canEdit && !busy) remove.mutate(deleteId); }} onCancel={() => setDeleteId(null)} />
    </div>
  );
}
