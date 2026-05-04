import React, { useState } from 'react';
import { X, Filter, List as ListIcon, Search, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/**
 * Shared presentational component for contest list pages.
 *
 * Receives all state + handlers from useContestFiltering and role-specific
 * props for navigation and custom card rendering. shadcn rewrite of the
 * previous MUI version; semantics and prop shape are unchanged.
 */
function ContestListView({
  contests,
  loading,
  error,
  page,
  totalPages,
  searchQuery,
  selectedCategories,
  selectedStatus,
  selectedParticipationType,
  isFilterVisible,
  handleSearch,
  handleCategoryChange,
  handleStatusChange,
  handleParticipationTypeChange,
  handlePageChange,
  toggleFilter,
  resetFilters,
  onContestClick,
  renderContest,
  title,
  headerExtra,
  accentColor = '#FF9800',
}) {
  const [searchInput, setSearchInput] = useState(searchQuery || '');
  const [isListView, setIsListView] = useState(false);

  const accentStyle = {
    color: accentColor,
    borderColor: accentColor,
  };

  const allCategories = Array.from(new Set(contests.map((c) => c.category))).sort();

  const handlePage = (next) => {
    if (!handlePageChange) return;
    if (next < 1 || next > totalPages) return;
    // emulate the MUI Pagination signature (event, value)
    handlePageChange(null, next);
  };

  return (
    <div className="contest-list-view">
      {title && (
        <h2 className="mb-4 text-center text-3xl font-bold tracking-tight">{title}</h2>
      )}

      {/* Search + action bar */}
      <div className="contest-list-view__header mb-3 flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={resetFilters}
          style={accentStyle}
          aria-label="Reset filters"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>

        <Input
          className="flex-1"
          type="text"
          placeholder="Search..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSearch(searchInput);
          }}
        />

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => handleSearch(searchInput)}
          style={accentStyle}
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={toggleFilter}
          style={accentStyle}
          aria-label="Toggle filters"
        >
          <Filter className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setIsListView((v) => !v)}
          style={accentStyle}
          aria-label="Toggle list view"
        >
          <ListIcon className="h-4 w-4" />
        </Button>

        {headerExtra && <div className="ml-2">{headerExtra}</div>}
      </div>

      {/* Filter sidebar */}
      {isFilterVisible && (
        <div className="contest-list-view__filter-sidebar relative mb-3 rounded-lg border border-border bg-muted/30 p-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggleFilter}
            className="absolute right-2 top-2 h-7 w-7"
            aria-label="Close filters"
          >
            <X className="h-4 w-4" />
          </Button>

          <Label className="mb-1 block font-bold">Filter by Status</Label>
          <select
            value={selectedStatus}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="mb-3 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            <option value="UPCOMING">UPCOMING</option>
            <option value="ONGOING">ONGOING</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="AWARDED">AWARDED</option>
          </select>

          <Label className="mb-1 block font-bold">Filter by Participation Type</Label>
          <select
            value={selectedParticipationType}
            onChange={(e) => handleParticipationTypeChange(e.target.value)}
            className="mb-3 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            <option value="INDIVIDUAL">INDIVIDUAL</option>
            <option value="TEAM">TEAM</option>
          </select>

          {allCategories.length > 0 && (
            <>
              <Label className="mb-1 block font-bold">Filter by Category</Label>
              <div className="flex flex-col gap-1">
                {allCategories.map((cat) => (
                  <label
                    key={cat}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(cat)}
                      onChange={() => handleCategoryChange(cat)}
                    />
                    {cat}
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Content area */}
      {loading && <p className="mt-2 text-sm text-muted-foreground">Loading competitions...</p>}

      {error && !loading && <p className="mt-2 text-sm text-destructive">{error}</p>}

      {!loading && !error && (
        <div
          className={cn(
            'contest-list-view__cards',
            !isListView && 'flex flex-wrap gap-4'
          )}
        >
          {contests.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No competitions found.</p>
          ) : (
            contests.map((contest) => renderContest(contest, onContestClick, isListView))
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="mt-5 flex items-center justify-center gap-1" aria-label="Contest pagination">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handlePage(page - 1)}
            disabled={page <= 1}
          >
            Previous
          </Button>
          {Array.from({ length: totalPages }).map((_, i) => {
            const n = i + 1;
            const isActive = n === page;
            return (
              <Button
                key={n}
                type="button"
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePage(n)}
                aria-current={isActive ? 'page' : undefined}
                className="min-w-9"
                style={isActive ? { backgroundColor: accentColor, color: '#fff' } : accentStyle}
              >
                {n}
              </Button>
            );
          })}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handlePage(page + 1)}
            disabled={page >= totalPages}
          >
            Next
          </Button>
        </nav>
      )}
    </div>
  );
}

export default ContestListView;
