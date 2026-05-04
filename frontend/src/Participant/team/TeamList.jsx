/**
 * @file TeamList.jsx
 * @description
 * Browse, sort, and join/leave public teams. Migrated from MUI to shadcn/ui
 * + Tailwind. Native select + Input replace MUI Select/TextField.
 *
 * Role: Participant
 * Developer: Beiqi Dai
 */

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

function PageNumbers({ page, pages, onChange }) {
  const numbers = [];
  const maxButtons = 5;
  const start = Math.max(1, page - Math.floor(maxButtons / 2));
  const end = Math.min(pages, start + maxButtons - 1);
  for (let i = start; i <= end; i += 1) numbers.push(i);

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      {numbers.map((n) => (
        <Button
          key={n}
          variant={n === page ? 'default' : 'ghost'}
          size="sm"
          className="h-8 min-w-8 px-2"
          onClick={() => onChange(n)}
        >
          {n}
        </Button>
      ))}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

const SELECT_CLASS = cn(
  'flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  'disabled:cursor-not-allowed disabled:opacity-50'
);

function TeamList({
  teams,
  joinedTeams,
  page,
  pages,
  keyword,
  sortBy,
  order,
  setPage,
  setKeyword,
  setSortBy,
  setOrder,
  onJoin,
  onLeave,
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="team-search">Search Teams</Label>
        <Input
          id="team-search"
          value={keyword}
          onChange={(e) => {
            setKeyword(e.target.value);
            setPage(1);
          }}
          placeholder="Search by name..."
        />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="team-sort-by" className="text-xs">
            Sort By
          </Label>
          <select
            id="team-sort-by"
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setPage(1);
            }}
            className={SELECT_CLASS}
          >
            <option value="name">Name</option>
            <option value="createdAt">Created At</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="team-order" className="text-xs">
            Order
          </Label>
          <select
            id="team-order"
            value={order}
            onChange={(e) => {
              setOrder(e.target.value);
              setPage(1);
            }}
            className={SELECT_CLASS}
          >
            <option value="asc">Asc</option>
            <option value="desc">Desc</option>
          </select>
        </div>
      </div>

      {teams.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No teams found.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {teams.map((t) => {
            const isMember = joinedTeams.has(t.id);
            return (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {t.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {t.description || 'No description'}
                  </p>
                </div>
                {isMember ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onLeave(t.id)}
                  >
                    Leave
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => onJoin(t)}>
                    Join
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {pages > 1 && (
        <div className="flex justify-center pt-2">
          <PageNumbers page={page} pages={pages} onChange={setPage} />
        </div>
      )}
    </div>
  );
}

export default TeamList;
