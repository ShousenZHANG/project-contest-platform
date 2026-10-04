import { parseApiDateTime } from '@/lib/dateTime';
import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, Trophy } from 'lucide-react';
import ContestCard from './ContestCard';
import { competitionService } from '../services/competitionService';
import { queryKeys, staleTime } from '../api/queryKeys';
import { unwrap } from '../api/queryFn';
import { Button } from '../components/ui/button';
import PageError from '../shared/components/PageError';
import PageSkeleton from '../shared/components/PageSkeleton';
import EmptyState from '../shared/components/EmptyState';

export default function TopValues() {
  const params = { page: 1, size: 4 };
  const query = useQuery({
    queryKey: queryKeys.competitions.publicList(params),
    queryFn: () => unwrap(competitionService.list(params)),
    staleTime: staleTime.short,
  });
  const items = query.data?.data || [];
  return (
    <section className="bg-background px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-3 flex items-center gap-2 text-sm font-medium text-primary">
              <Sparkles aria-hidden="true" className="h-4 w-4" />
              Explore competitions
            </p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Find your next challenge
            </h2>
            <p className="mt-3 text-muted-foreground">
              Real competitions, clear requirements, and one place to get started.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/contest-list">Browse all contests</Link>
          </Button>
        </div>
        {query.isPending ? (
          <PageSkeleton rows={2} />
        ) : query.error ? (
          <PageError
            error={query.error}
            onRetry={() => query.refetch()}
            retrying={query.isFetching}
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title="New competitions are on their way"
            description="Browse the catalogue to check for updates."
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((item) => (
              <ContestCard
                key={item.id}
                contest={{
                  ...item,
                  title: item.name,
                  image: item.imageUrls?.[0],
                  date: `${parseApiDateTime(item.startDate).toLocaleDateString()} – ${parseApiDateTime(item.endDate).toLocaleDateString()}`,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
