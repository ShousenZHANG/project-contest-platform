import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import Navbar from '../Homepages/Navbar';
import Footer from '../Homepages/Footer';
import { registrationService } from '../services/registrationService';
import { queryKeys, staleTime } from '../api/queryKeys';
import { unwrap } from '../api/queryFn';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import PageError from '../shared/components/PageError';
import PageSkeleton from '../shared/components/PageSkeleton';
import EmptyState from '../shared/components/EmptyState';
import Pagination from '../shared/components/Pagination';
import usePagedSearchParams from '../shared/hooks/usePagedSearchParams';

export default function TeamListPage() {
  const { contestId } = useParams();
  const state = usePagedSearchParams();
  const params = { page: state.page, size: 12, ...(state.keyword && { keyword: state.keyword }) };
  const query = useQuery({
    queryKey: [...queryKeys.registrations.all, 'teams', contestId, params],
    queryFn: () => unwrap(registrationService.getRegisteredTeams(contestId, params)),
    staleTime: staleTime.short,
  });
  const items = query.data?.data || [];
  return (
    <>
      <Navbar />
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <Button asChild variant="outline">
          <Link to={`/publiccontest-detail/${contestId}`}>Back to Contest</Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Registered Teams</h1>
        <form onSubmit={state.submitSearch} className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <Label htmlFor="team-search">Search teams</Label>
            <Input
              id="team-search"
              type="search"
              value={state.searchInput}
              onChange={(event) => state.setSearchInput(event.target.value)}
              className="h-11 text-base"
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
            icon={Users}
            title="No teams registered yet."
            description="Teams will appear here once they sign up for the contest."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((team) => (
              <Card key={team.id}>
                <CardContent className="space-y-3 p-5">
                  <Users aria-hidden="true" className="h-6 w-6 text-primary" />
                  <h2 className="break-words text-lg font-semibold">
                    <Link
                      to={`/public-team-detail/${contestId}/${team.id}`}
                      state={{ teamName: team.name, teamDescription: team.description }}
                      className="hover:text-primary"
                    >
                      {team.name}
                    </Link>
                  </h2>
                  <p className="break-words text-sm text-muted-foreground">{team.description}</p>
                </CardContent>
              </Card>
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
      </div>
      <Footer />
    </>
  );
}
