import React, { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, ArrowLeft } from 'lucide-react';
import { judgeService } from '../services/judgeService';
import { queryKeys, staleTime } from '../api/queryKeys';
import { unwrap } from '../api/queryFn';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import PageError from '../shared/components/PageError';
import PageSkeleton from '../shared/components/PageSkeleton';
import SubmissionFile from '../shared/components/SubmissionFile';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

/** First scores and revisions use the same form and authoritative criteria. */
export default function ScoreSubmission({ revision = false }) {
  const { competitionId, submissionId } = useParams();
  return (
    <ScoreForm
      key={`${competitionId}:${submissionId}:${revision}`}
      competitionId={competitionId}
      submissionId={submissionId}
      revision={revision}
    />
  );
}

function ScoreForm({ competitionId, submissionId, revision }) {
  useDocumentTitle(revision ? 'Update rating' : 'Rate submission');
  const queryClient = useQueryClient();
  const [scores, setScores] = useState({});
  const [feedback, setFeedback] = useState('');
  const [saved, setSaved] = useState(null);
  const [written, setWritten] = useState(false);
  const [readbackFailed, setReadbackFailed] = useState(false);
  const seeded = useRef(false);
  const submitting = useRef(false);
  const contextQuery = useQuery({
    queryKey: queryKeys.judges.context(competitionId, submissionId),
    queryFn: () => unwrap(judgeService.getSubmissionContext(submissionId, competitionId)),
    staleTime: staleTime.live,
  });
  const context = contextQuery.data;
  const detailQuery = useQuery({
    queryKey: queryKeys.judges.detail(submissionId),
    queryFn: () => unwrap(judgeService.getSubmissionDetail(submissionId)),
    enabled: Boolean(context?.hasScored),
    staleTime: staleTime.live,
  });
  const requiresRescore = Boolean(context?.requiresRescore || detailQuery.data?.requiresRescore);
  const hasCurrentScore = Boolean(context?.hasScored && !requiresRescore);
  const currentDetail = requiresRescore ? null : detailQuery.data;
  const criteria = context?.scoringCriteria || [];
  useEffect(() => {
    if (seeded.current || !context || (context.hasScored && !detailQuery.data)) return;
    seeded.current = true;
    setScores(
      Object.fromEntries(
        criteria.map((criterion) => [
          criterion,
          currentDetail?.scores?.find((score) => score.criterion === criterion)?.score ?? 5,
        ]),
      ),
    );
    setFeedback(currentDetail?.judgeComments || '');
  }, [context, detailQuery.data, currentDetail, criteria]);
  const mutation = useMutation({
    mutationFn: async (body) => {
      if (body) {
        setReadbackFailed(false);
        await unwrap(
          hasCurrentScore || written
            ? judgeService.updateScore(submissionId, body)
            : judgeService.score(body),
        );
        setWritten(true);
        queryClient.invalidateQueries({ queryKey: queryKeys.judges.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.winners.all });
      }
      // Display persisted values, rather than assuming the edited fields were saved.
      try {
        return await unwrap(judgeService.getSubmissionDetail(submissionId));
      } catch (error) {
        setReadbackFailed(true);
        throw error;
      }
    },
    onSuccess: (result) => {
      setReadbackFailed(false);
      setSaved(result);
      setScores(Object.fromEntries(result.scores.map((score) => [score.criterion, score.score])));
      setFeedback(result.judgeComments || '');
      queryClient.invalidateQueries({ queryKey: queryKeys.judges.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.winners.all });
    },
    onSettled: () => {
      submitting.current = false;
    },
  });
  const error = contextQuery.error || detailQuery.error;
  const valid =
    criteria.length > 0 &&
    criteria.every(
      (criterion) =>
        scores[criterion] !== '' &&
        Number.isFinite(Number(scores[criterion])) &&
        Number(scores[criterion]) >= 0 &&
        Number(scores[criterion]) <= 10,
    );
  const submit = (event) => {
    event.preventDefault();
    if (submitting.current || !valid || !context.canScore) return;
    submitting.current = true;
    mutation.mutate({
      competitionId,
      submissionId,
      judgeComments: feedback,
      scores: criteria.map((criterion) => ({ criterion, score: Number(scores[criterion]) })),
    });
  };
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Button asChild variant="ghost">
        <Link to={`/JudgeSubmissions/${competitionId}`}>
          <ArrowLeft aria-hidden="true" />
          Back to scoring queue
        </Link>
      </Button>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          {hasCurrentScore || written ? 'Update Your Rating' : 'Rate This Submission'}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Score every criterion from 0 to 10. Criteria have equal weight.
        </p>
      </header>
      {contextQuery.isPending || (detailQuery.isPending && detailQuery.fetchStatus !== 'idle') ? (
        <PageSkeleton rows={4} />
      ) : error ? (
        <PageError
          error={error}
          onRetry={() => {
            contextQuery.refetch();
            if (context?.hasScored) detailQuery.refetch();
          }}
          retrying={contextQuery.isFetching || detailQuery.isFetching}
        />
      ) : (
        context && (
          <div className="grid items-start gap-6 lg:grid-cols-2">
            <Card>
              <CardContent className="space-y-5 p-5 sm:p-6">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{context.reviewStatus}</Badge>
                  <Badge variant="secondary">{context.competitionStatus}</Badge>
                </div>
                <h2 className="break-words text-xl font-semibold">{context.title}</h2>
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
                  {context.description}
                </p>
                <SubmissionFile fileUrl={context.fileUrl} fileName={context.fileName} />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 sm:p-6">
                <form onSubmit={submit} className="space-y-6">
                  {requiresRescore && (
                    <p role="status" className="rounded-md border bg-muted p-3 text-sm">
                      This submission needs a new score after a file or scoring-rule update.
                    </p>
                  )}
                  {!context.canScore && (
                    <p role="status" className="rounded-md border bg-muted p-3 text-sm">
                      Scoring is closed. Published awards and scores cannot be changed.
                    </p>
                  )}
                  <fieldset
                    disabled={mutation.isPending || !context.canScore}
                    className="space-y-6"
                  >
                    <legend className="mb-4 text-base font-semibold">Scoring criteria</legend>
                    {criteria.map((criterion, index) => (
                      <div key={criterion} className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <Label htmlFor={`score-${index}`} className="break-words">
                            {criterion}
                          </Label>
                          <span className="shrink-0 text-xs text-muted-foreground">0–10</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <input
                            type="range"
                            aria-label={`${criterion} slider`}
                            min="0"
                            max="10"
                            step="0.1"
                            value={scores[criterion] ?? 5}
                            onChange={(event) => {
                              setSaved(null);
                              setScores((current) => ({
                                ...current,
                                [criterion]: Number(event.target.value),
                              }));
                            }}
                            className="min-h-11 min-w-0 flex-1 accent-primary"
                          />
                          <Input
                            id={`score-${index}`}
                            type="number"
                            min="0"
                            max="10"
                            step="0.1"
                            required
                            value={scores[criterion] ?? ''}
                            onChange={(event) => {
                              setSaved(null);
                              setScores((current) => ({
                                ...current,
                                [criterion]: event.target.value,
                              }));
                            }}
                            className="h-11 w-24 shrink-0 text-base tabular-nums"
                          />
                        </div>
                      </div>
                    ))}
                    <div className="space-y-2">
                      <Label htmlFor="judge-feedback">Feedback</Label>
                      <textarea
                        id="judge-feedback"
                        rows={5}
                        maxLength={2000}
                        value={feedback}
                        onChange={(event) => {
                          setSaved(null);
                          setFeedback(event.target.value);
                        }}
                        className="w-full rounded-md border border-input bg-background p-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </div>
                  </fieldset>
                  {readbackFailed && (
                    <p role="status" className="text-sm text-muted-foreground">
                      Your rating was stored. Retry loading to verify the saved score.
                    </p>
                  )}
                  {mutation.error && (
                    <PageError
                      error={mutation.error}
                      onRetry={
                        readbackFailed
                          ? () => {
                              if (submitting.current) return;
                              submitting.current = true;
                              mutation.mutate(null);
                            }
                          : undefined
                      }
                      retrying={mutation.isPending}
                    />
                  )}
                  {saved && (
                    <p
                      role="status"
                      className="flex items-start gap-2 rounded-md border border-success/30 bg-success/5 p-3 text-sm text-success"
                    >
                      <CheckCircle2 aria-hidden="true" className="h-5 w-5 shrink-0" />
                      Rating saved · {Number(saved.totalScore).toFixed(2)} / 10
                    </p>
                  )}
                  <Button
                    type="submit"
                    className="min-h-11 w-full"
                    disabled={mutation.isPending || !valid || !context.canScore}
                    aria-busy={mutation.isPending}
                  >
                    {mutation.isPending
                      ? 'Saving rating…'
                      : hasCurrentScore || written
                        ? 'Update rating'
                        : 'Submit rating'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )
      )}
    </div>
  );
}
