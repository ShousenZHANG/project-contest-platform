import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trophy, ArrowUpDown } from 'lucide-react';
import { winnerService } from '../services/judgeService';
import { queryKeys, staleTime } from '../api/queryKeys';
import { unwrap } from '../api/queryFn';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import PageError from '../shared/components/PageError';
import PageSkeleton from '../shared/components/PageSkeleton';
import EmptyState from '../shared/components/EmptyState';
import ConfirmDialog from '../shared/components/ConfirmDialog';
import Pagination from '../shared/components/Pagination';

export default function SubmissionRatings() {
  const { competitionId } = useParams();
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  const [descending, setDescending] = useState(true);
  const [resultPage, setResultPage] = useState(1);
  const query = useQuery({
    queryKey: queryKeys.winners.eligibility(competitionId),
    queryFn: () => unwrap(winnerService.getEligibility(competitionId)),
    staleTime: staleTime.live,
  });
  const eligibility = query.data;
  const resultParams = { competitionId, page: resultPage, size: 12 };
  const results = useQuery({
    queryKey: queryKeys.winners.managedList(competitionId, resultParams),
    queryFn: () => unwrap(winnerService.getManagedList(resultParams)),
    enabled: eligibility?.status === 'AWARDED',
    staleTime: staleTime.short,
  });
  const submissions = [...(eligibility?.submissions || [])].sort(
    (a, b) => (Number(b.totalScore ?? -1) - Number(a.totalScore ?? -1)) * (descending ? 1 : -1),
  );
  const criteria = [
    ...new Set(submissions.flatMap((submission) => Object.keys(submission.criterionScores || {}))),
  ];
  const award = useMutation({
    mutationFn: () => unwrap(winnerService.autoAward(competitionId)),
    onSuccess: () => {
      setConfirm(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.winners.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.competitions.all });
    },
    onError: () => {
      setConfirm(false);
      query.refetch();
    },
  });
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Rated Submissions Comparison</h1>
        <p className="mt-2 text-muted-foreground">
          Awards require a completed competition and at least 3 valid judges for every approved
          work.
        </p>
      </header>
      {query.isPending ? (
        <PageSkeleton rows={4} />
      ) : query.error ? (
        <PageError
          error={query.error}
          onRetry={() => query.refetch()}
          retrying={query.isFetching}
        />
      ) : (
        eligibility && (
          <>
            <Card>
              <CardContent className="space-y-4 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold">Award readiness</h2>
                  <Badge variant={eligibility.canAward ? 'success' : 'outline'}>
                    {eligibility.status}
                  </Badge>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Approved works</p>
                    <p className="text-2xl font-semibold tabular-nums">
                      {eligibility.approvedCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ready for awards</p>
                    <p className="text-2xl font-semibold tabular-nums">
                      {eligibility.eligibleCount} / {eligibility.approvedCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Minimum judges per work</p>
                    <p className="text-2xl font-semibold tabular-nums">
                      {eligibility.minimumJudgeCount}
                    </p>
                  </div>
                </div>
                {eligibility.status === 'AWARDED' ? (
                  <p className="text-sm text-success">
                    Results have been finalized. Scores and awards are locked.
                  </p>
                ) : eligibility.canAward ? (
                  <p className="text-sm text-success">
                    Every approved work meets the award requirements.
                  </p>
                ) : (
                  <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {eligibility.blockers.map((blocker, index) => (
                      <li key={index}>{blocker}</li>
                    ))}
                  </ul>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => setConfirm(true)}
                    disabled={!eligibility.canAward || award.isPending || query.isFetching}
                    className="min-h-11"
                  >
                    <Trophy aria-hidden="true" />
                    Auto Award Winners
                  </Button>
                  {eligibility.status === 'AWARDED' && eligibility.isPublic === true && (
                    <Button asChild variant="outline">
                      <Link to={`/results/${competitionId}`}>View published results</Link>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => query.refetch()}
                    disabled={query.isFetching}
                  >
                    Refresh readiness
                  </Button>
                </div>
              </CardContent>
            </Card>
            {eligibility.status === 'AWARDED' && (
              <section aria-labelledby="finalized-awards-title" className="space-y-4">
                <h2 id="finalized-awards-title" className="text-lg font-semibold">Finalized awards</h2>
                {eligibility.isPublic !== true && (
                  <p className="text-sm text-muted-foreground">This competition is private. Results are available to its organizers and admins.</p>
                )}
                {results.isPending ? (
                  <PageSkeleton rows={3} />
                ) : results.error ? (
                  <PageError error={results.error} onRetry={() => results.refetch()} retrying={results.isFetching} />
                ) : results.data?.data?.length ? (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {results.data.data.map((winner) => (
                        <Card key={winner.submissionId}>
                          <CardContent className="space-y-3 p-5">
                            <div className="flex flex-wrap gap-2">
                              {(winner.awards || []).map((label) => <Badge key={label} variant="success">{label}</Badge>)}
                            </div>
                            <h3 className="break-words font-semibold">{winner.title}</h3>
                            <p className="break-words text-sm text-muted-foreground">{winner.submitterName}</p>
                            <p className="font-mono text-xl font-semibold">
                              {winner.totalScore == null ? 'Score unavailable' : `${Number(winner.totalScore).toFixed(2)} / 10`}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    <Pagination page={resultPage} pages={results.data.pages} total={results.data.total} onPageChange={setResultPage} busy={results.isFetching} />
                  </>
                ) : (
                  <EmptyState title="No finalized awards available" description="Refresh results or reconcile historical awards before sharing them." />
                )}
              </section>
            )}
            {submissions.length === 0 ? (
              <EmptyState
                title="No approved works yet"
                description="Review submissions before preparing awards."
              />
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setDescending((value) => !value)}
                  aria-pressed={descending}
                  className="min-h-11"
                >
                  <ArrowUpDown aria-hidden="true" className="h-4 w-4" />
                  Total score / 10
                  <span className="sr-only">
                    {descending ? ', highest first' : ', lowest first'}
                  </span>
                </Button>
                <div className="space-y-4 md:hidden">
                  {submissions.map((submission) => (
                    <article
                      key={submission.submissionId}
                      aria-label={`Award eligibility for ${submission.title}`}
                      className="space-y-4 rounded-lg border bg-card p-5"
                    >
                      <h2 className="break-words text-lg font-semibold">{submission.title}</h2>
                      <ReadinessFeedback submission={submission} />
                      <dl className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <dt className="text-muted-foreground">Valid judges</dt>
                          <dd className="mt-1 text-lg font-semibold tabular-nums">
                            {submission.judgeCount} / {eligibility.minimumJudgeCount}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Score / 10</dt>
                          <dd className="mt-1 text-lg font-semibold tabular-nums">
                            {submission.totalScore == null
                              ? 'Unscored'
                              : Number(submission.totalScore).toFixed(2)}
                          </dd>
                        </div>
                      </dl>
                      {criteria.length > 0 && (
                        <details className="border-t pt-2">
                          <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">
                            Criterion averages
                          </summary>
                          <dl className="space-y-2 text-sm">
                            {criteria.map((criterion) => (
                              <div key={criterion} className="flex justify-between gap-4">
                                <dt className="break-words text-muted-foreground">{criterion}</dt>
                                <dd className="shrink-0 tabular-nums">
                                  {submission.criterionScores?.[criterion] == null
                                    ? '—'
                                    : Number(submission.criterionScores[criterion]).toFixed(2)}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        </details>
                      )}
                    </article>
                  ))}
                </div>
                <Card className="hidden overflow-hidden md:block">
                  <div
                    className="overflow-x-auto"
                    tabIndex={0}
                    role="region"
                    aria-label="Submission score comparison"
                  >
                    <table className="w-full text-left text-sm">
                      <caption className="sr-only">
                        Award eligibility for each approved submission
                      </caption>
                      <thead className="border-b bg-muted/40">
                        <tr>
                          <th scope="col" className="px-4 py-3">
                            Title
                          </th>
                          <th
                            scope="col"
                            className="px-4 py-3"
                            aria-sort={descending ? 'descending' : 'ascending'}
                          >
                            Total score / 10
                          </th>
                          <th scope="col" className="px-4 py-3">
                            Judges
                          </th>
                          <th scope="col" className="px-4 py-3">
                            Readiness
                          </th>
                          {criteria.map((criterion) => (
                            <th scope="col" key={criterion} className="px-4 py-3">
                              {criterion}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {submissions.map((submission) => (
                          <tr key={submission.submissionId} className="border-b last:border-0">
                            <th scope="row" className="max-w-xs break-words px-4 py-3 font-medium">
                              {submission.title}
                            </th>
                            <td className="px-4 py-3 font-mono">
                              {submission.totalScore == null
                                ? 'Unscored'
                                : Number(submission.totalScore).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 tabular-nums">
                              {submission.judgeCount} / {eligibility.minimumJudgeCount}
                            </td>
                            <td className="px-4 py-3">
                              <ReadinessFeedback submission={submission} />
                            </td>
                            {criteria.map((criterion) => (
                              <td key={criterion} className="px-4 py-3 font-mono">
                                {submission.criterionScores?.[criterion] == null
                                  ? '—'
                                  : Number(submission.criterionScores[criterion]).toFixed(2)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </>
            )}
          </>
        )
      )}
      {award.error && <PageError error={award.error} />}
      <Button asChild variant="outline">
        <Link to={`/OrganizerSubmissions/${competitionId}`}>Back to Submissions List</Link>
      </Button>
      <ConfirmDialog
        open={confirm}
        title="Publish competition awards?"
        message="This publishes the automatic ranking and locks scoring. The server will recheck every work before awarding."
        confirmLabel="Publish awards"
        pending={award.isPending}
        onConfirm={() => award.mutate()}
        onCancel={() => setConfirm(false)}
      />
    </div>
  );
}

function ReadinessFeedback({ submission }) {
  return (
    <div>
      <Badge variant={submission.eligible ? 'success' : 'warning'}>
        {submission.eligible ? 'Ready' : 'Needs attention'}
      </Badge>
      {submission.blockers?.length > 0 && (
        <ul className="mt-2 max-w-xs space-y-1 text-sm text-muted-foreground">
          {submission.blockers.map((blocker, index) => (
            <li key={index}>{blocker}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
