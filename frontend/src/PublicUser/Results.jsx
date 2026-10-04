import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Trophy } from 'lucide-react';
import Navbar from '../Homepages/Navbar';
import Footer from '../Homepages/Footer';
import { competitionService } from '../services/competitionService';
import { winnerService } from '../services/judgeService';
import { queryKeys, staleTime } from '../api/queryKeys';
import { unwrap } from '../api/queryFn';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import PageError from '../shared/components/PageError';
import PageSkeleton from '../shared/components/PageSkeleton';
import EmptyState from '../shared/components/EmptyState';
import Pagination from '../shared/components/Pagination';
import usePagedSearchParams from '../shared/hooks/usePagedSearchParams';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function Results() {
  useDocumentTitle('Competition results');
  const { competitionId } = useParams();
  const state = usePagedSearchParams();
  const competition = useQuery({
    queryKey: queryKeys.competitions.detail(competitionId),
    queryFn: () => unwrap(competitionService.getById(competitionId)),
    staleTime: staleTime.short,
  });
  const params = { competitionId, page: state.page, size: 12 };
  const results = useQuery({
    queryKey: queryKeys.winners.publicList(competitionId, params),
    queryFn: () => unwrap(winnerService.getPublicList(params)),
    enabled: competition.data?.status === 'AWARDED',
    staleTime: staleTime.short,
  });
  const items = results.data?.data || [];
  return (
    <>
      <Navbar />
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <Button asChild variant="outline">
          <Link to={`/publiccontest-detail/${competitionId}`}>Back to contest</Link>
        </Button>
        <header>
          <p className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
            <Trophy aria-hidden="true" className="h-4 w-4" />
            Published results
          </p>
          <h1 className="break-words text-3xl font-bold tracking-tight">
            {competition.data?.name || 'Competition results'}
          </h1>
          <p className="mt-2 text-muted-foreground">
            Final scores are out of 10, with equal weight for each criterion.
          </p>
        </header>
        {competition.isPending || (results.isPending && results.fetchStatus !== 'idle') ? (
          <PageSkeleton rows={3} />
        ) : competition.error || results.error ? (
          <PageError
            error={competition.error || results.error}
            onRetry={() => {
              competition.refetch();
              if (competition.data?.status === 'AWARDED') results.refetch();
            }}
          />
        ) : competition.data?.status !== 'AWARDED' ? (
          <EmptyState
            icon={Trophy}
            title="Results have not been published"
            description="Results appear after the organizer completes judging and awards the competition."
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title="No results available"
            description="Refresh to check for published awards."
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <Card key={item.submissionId}>
                <CardContent className="space-y-4 p-5">
                  <div className="flex flex-wrap gap-2">
                    {item.awards.map((award) => (
                      <Badge key={award} variant="success">
                        {award}
                      </Badge>
                    ))}
                  </div>
                  <h2 className="break-words text-xl font-semibold">{item.title}</h2>
                  <p className="break-words text-sm text-muted-foreground">{item.submitterName}</p>
                  {item.totalScore == null ? (
                    <p className="text-sm text-muted-foreground">Score unavailable</p>
                  ) : (
                    <p className="font-mono text-2xl font-semibold tabular-nums">
                      {Number(item.totalScore).toFixed(2)}
                      <span className="ml-2 text-sm font-normal text-muted-foreground">/ 10</span>
                    </p>
                  )}
                  <Button asChild variant="outline">
                    <Link to={`/work-list?competitionId=${competitionId}`}>
                      Explore approved works
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        {competition.data?.status === 'AWARDED' && !results.isPending && !results.error && (
          <Pagination
            page={state.page}
            pages={results.data?.pages}
            total={results.data?.total ?? items.length}
            onPageChange={state.setPage}
            busy={results.isFetching}
          />
        )}
      </div>
      <Footer />
    </>
  );
}
