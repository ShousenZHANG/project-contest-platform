import { CATEGORIES } from '../shared/competitionCategories';
import { parseApiDateTime } from '@/lib/dateTime';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, LayoutGrid, List, Trophy } from 'lucide-react';
import Navbar from '../Homepages/Navbar';
import Footer from '../Homepages/Footer';
import ContestCard from '../Homepages/ContestCard';
import { competitionService } from '../services/competitionService';
import { queryKeys, staleTime } from '../api/queryKeys';
import { unwrap } from '../api/queryFn';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Card } from '../components/ui/card';
import PageError from '../shared/components/PageError';
import PageSkeleton from '../shared/components/PageSkeleton';
import EmptyState from '../shared/components/EmptyState';
import Pagination from '../shared/components/Pagination';
import usePagedSearchParams from '../shared/hooks/usePagedSearchParams';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const SELECT =
  'h-11 w-full rounded-md border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export default function Contest() {
  useDocumentTitle('Contests');
  const state = usePagedSearchParams();
  const [listView, setListView] = useState(false);
  const status = state.searchParams.get('status') || '';
  const category = state.searchParams.get('category') || '';
  const participationType = state.searchParams.get('participationType') || '';
  const params = {
    page: state.page,
    size: 12,
    ...(state.keyword && { keyword: state.keyword }),
    ...(status && { status }),
    ...(category && { category }),
    ...(participationType && { participationType }),
  };
  const query = useQuery({
    queryKey: queryKeys.competitions.list(params),
    queryFn: () => unwrap(competitionService.list(params)),
    staleTime: staleTime.short,
  });
  const items = query.data?.data || [];
  return (
    <>
      <Navbar />
      <div className="px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <header className="mb-7">
            <h1 className="text-3xl font-bold tracking-tight">Contest List</h1>
            <p className="mt-2 text-muted-foreground">
              Find a challenge that fits your interests and team.
            </p>
          </header>
          <Card className="mb-6 space-y-4 p-4">
            <form onSubmit={state.submitSearch} className="flex flex-wrap items-end gap-3">
              <div className="min-w-0 flex-1 space-y-2">
                <Label htmlFor="contest-search">Search contests</Label>
                <Input
                  id="contest-search"
                  type="search"
                  placeholder="Search contests..."
                  className="h-11 text-base"
                  value={state.searchInput}
                  onChange={(event) => state.setSearchInput(event.target.value)}
                />
              </div>
              <Button type="submit" className="h-11">
                <Search aria-hidden="true" />
                Search
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-11 w-11"
                aria-label={listView ? 'Show cards' : 'Show table'}
                onClick={() => setListView((value) => !value)}
              >
                {listView ? <LayoutGrid aria-hidden="true" /> : <List aria-hidden="true" />}
              </Button>
            </form>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                [
                  'status',
                  'Status',
                  status,
                  ['UPCOMING', 'ONGOING', 'COMPLETED', 'AWARDED', 'CANCELED'],
                ],
                [
                  'participationType',
                  'Participation type',
                  participationType,
                  ['INDIVIDUAL', 'TEAM'],
                ],
                ['category', 'Category', category, CATEGORIES],
              ].map(([key, label, value, options]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={`contest-${key}`}>{label}</Label>
                  <select
                    id={`contest-${key}`}
                    className={SELECT}
                    value={value}
                    onChange={(event) => state.setFilters({ [key]: event.target.value })}
                  >
                    <option value="">All</option>
                    {options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </Card>
          {query.isPending ? (
            <PageSkeleton rows={4} />
          ) : query.error ? (
            <PageError
              error={query.error}
              onRetry={() => query.refetch()}
              retrying={query.isFetching}
            />
          ) : items.length === 0 ? (
            <EmptyState
              icon={Trophy}
              title="No contests match these filters"
              description="Try a different search or widen the filters."
            />
          ) : listView ? (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Competition search results">
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">Competition search results</caption>
                  <thead className="border-b bg-muted/40">
                    <tr>
                      {['Competition', 'Category', 'Status', 'Entry type'].map((label) => (
                        <th key={label} scope="col" className="px-4 py-3">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="px-4 py-3">
                          <Link
                            to={`/publiccontest-detail/${item.id}`}
                            className="font-medium text-primary underline-offset-4 hover:underline"
                          >
                            {item.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3">{item.category}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">{item.status}</Badge>
                        </td>
                        <td className="px-4 py-3">{item.participationType}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
      </div>
      <Footer />
    </>
  );
}
