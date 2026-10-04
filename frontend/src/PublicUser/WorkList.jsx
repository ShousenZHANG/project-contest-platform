import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, FileText } from 'lucide-react';
import Navbar from '../Homepages/Navbar';
import Footer from '../Homepages/Footer';
import { submissionService } from '../services/registrationService';
import { voteService } from '../services/interactionService';
import AuthTokenManager from '../auth/authTokenManager';
import { queryKeys, staleTime } from '../api/queryKeys';
import { unwrap, toMessage } from '../api/queryFn';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import PageError from '../shared/components/PageError';
import PageSkeleton from '../shared/components/PageSkeleton';
import EmptyState from '../shared/components/EmptyState';
import Pagination from '../shared/components/Pagination';
import SubmissionFile from '../shared/components/SubmissionFile';
import usePagedSearchParams from '../shared/hooks/usePagedSearchParams';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

function WorkCard({ work }) {
  const queryClient = useQueryClient();
  const signedIn = Boolean(AuthTokenManager.getToken());
  const canVote = signedIn && AuthTokenManager.getRole()?.toUpperCase() === 'PARTICIPANT';
  const count = useQuery({
    queryKey: queryKeys.votes.count(work.id),
    queryFn: () => unwrap(voteService.getCount(work.id)),
    staleTime: staleTime.live,
  });
  const status = useQuery({
    queryKey: queryKeys.votes.hasVoted(work.id),
    queryFn: () => unwrap(voteService.hasVoted(work.id)),
    enabled: canVote,
    staleTime: staleTime.live,
  });
  const vote = useMutation({
    mutationFn: () => unwrap(voteService.vote(work.id)),
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.votes.hasVoted(work.id), true);
      queryClient.invalidateQueries({ queryKey: queryKeys.votes.count(work.id) });
    },
    onError: (error) => {
      if (error.response?.status === 409) {
        queryClient.setQueryData(queryKeys.votes.hasVoted(work.id), true);
        queryClient.invalidateQueries({ queryKey: queryKeys.votes.count(work.id) });
      }
    },
  });
  return (
    <Card className="min-w-0">
      <CardContent className="flex h-full flex-col gap-4 p-5">
        <h2 className="break-words text-lg font-semibold">{work.title}</h2>
        <p className="flex-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
          {work.description}
        </p>
        <SubmissionFile fileUrl={work.fileUrl} fileName={work.fileName} />
        <p className="text-sm text-muted-foreground">
          Votes: {count.error ? 'Unavailable' : count.isPending ? 'Loading…' : count.data}
        </p>
        <div className="flex flex-wrap gap-2">
          {canVote ? (
            <Button
              variant="outline"
              disabled={
                vote.isPending || status.isPending || Boolean(status.error) || status.data === true
              }
              onClick={() => vote.mutate()}
              aria-busy={vote.isPending}
            >
              <Heart aria-hidden="true" />
              {status.data ? 'Voted' : vote.isPending ? 'Voting…' : 'Vote'}
            </Button>
          ) : !signedIn ? (
            <Button asChild variant="outline">
              <Link
                to="/login"
                state={{ from: { pathname: `/work-list?competitionId=${work.competitionId}` } }}
              >
                Sign in to vote
              </Link>
            </Button>
          ) : null}
          <Button asChild variant="outline">
            <Link to={`/publicusercoments/${work.id}`}>
              <MessageCircle aria-hidden="true" />
              Comments
            </Link>
          </Button>
        </div>
        {vote.error && vote.error.response?.status !== 409 && (
          <p role="alert" className="text-sm text-destructive">
            {toMessage(vote.error)}
          </p>
        )}
        {status.error && (
          <p role="alert" className="text-sm text-destructive">
            Unable to check your vote. Refresh and try again.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function WorkList() {
  useDocumentTitle('Approved submissions');
  const state = usePagedSearchParams();
  const competitionId = state.searchParams.get('competitionId');
  const params = {
    competitionId,
    page: state.page,
    size: 12,
    ...(state.keyword && { keyword: state.keyword }),
  };
  const query = useQuery({
    queryKey: [...queryKeys.submissions.all, 'approved', params],
    queryFn: () => unwrap(submissionService.getApproved(params)),
    enabled: Boolean(competitionId),
    staleTime: staleTime.short,
  });
  const items = query.data?.data || [];
  return (
    <>
      <Navbar />
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Approved Submissions</h1>
          <p className="mt-2 text-muted-foreground">
            Explore work reviewed by the competition organizer.
          </p>
        </header>
        {!competitionId ? (
          <EmptyState
            icon={FileText}
            title="Choose a competition first"
            description="Open a competition to view its approved submissions."
            actionLabel="Browse contests"
            onAction={() => window.location.assign('/contest-list')}
          />
        ) : (
          <>
            <Button asChild variant="outline">
              <Link to={`/publiccontest-detail/${competitionId}`}>Back to contest</Link>
            </Button>
            <form onSubmit={state.submitSearch} className="flex flex-wrap items-end gap-3">
              <div className="min-w-0 flex-1 space-y-2">
                <Label htmlFor="work-search">Search submissions</Label>
                <Input
                  id="work-search"
                  type="search"
                  placeholder="Search by title or description..."
                  className="h-11 text-base"
                  value={state.searchInput}
                  onChange={(event) => state.setSearchInput(event.target.value)}
                />
              </div>
              <Button type="submit" className="h-11">
                Search
              </Button>
            </form>
            {query.isPending ? (
              <PageSkeleton rows={3} />
            ) : query.error ? (
              <PageError
                error={query.error}
                onRetry={() => query.refetch()}
                retrying={query.isFetching}
              />
            ) : items.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No approved submissions found"
                description="Try a different search or check back after submissions are reviewed."
              />
            ) : (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {items.map((work) => (
                  <WorkCard key={work.id} work={{ ...work, competitionId }} />
                ))}
              </div>
            )}
            {!query.error && !query.isPending && (
              <Pagination
                page={state.page}
                pages={query.data?.pages}
                total={query.data?.total ?? items.length}
                onPageChange={state.setPage}
                busy={query.isFetching}
              />
            )}
          </>
        )}
      </div>
      <Footer />
    </>
  );
}
