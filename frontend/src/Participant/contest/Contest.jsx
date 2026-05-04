/**
 * Contest.jsx
 *
 * Participant contest browse page. Migrated from MUI to shadcn/ui.
 *
 * Role: Participant
 * Developer: Beiqi Dai
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, List, X, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import apiClient from '../../api/apiClient';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import ContestCard from './ContestCard';
import ChangeContestTable from './ChangeContestTable';
import defaultImage from './1.jpg';

function Contest() {
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedParticipationType, setSelectedParticipationType] = useState('');
  const [contests, setContests] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isListView, setIsListView] = useState(false);
  const [page, setPage] = useState(1);
  const [size] = useState(6);
  const navigate = useNavigate();

  const toggleFilter = () => setIsFilterVisible(!isFilterVisible);

  const handleCategoryChange = (category) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  useEffect(() => {
    const fetchContests = async () => {
      try {
        const params = new URLSearchParams();
        if (searchTerm) params.append('keyword', searchTerm);
        if (selectedCategories.length > 0) params.append('category', selectedCategories.join(','));
        if (selectedStatus) params.append('status', selectedStatus);

        const res = await apiClient.get(`/competitions/list?${params.toString()}`);
        setContests(res.data.data || []);
      } catch (error) {
        // Failed to fetch contests
      }
    };

    fetchContests();
  }, [searchTerm, selectedCategories, selectedStatus]);

  const formatDateRange = (start, end) => {
    if (!start || !end) return 'N/A';
    return `${new Date(start).toLocaleDateString()} ~ ${new Date(end).toLocaleDateString()}`;
  };

  const handleCardClick = (contest) => {
    navigate(`/contest-detail/${contest.id}`);
  };

  const handleSearchClick = () => {
    setSearchTerm(searchInput);
    setPage(1);
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'UPCOMING':
        return 'Not started';
      case 'ONGOING':
        return 'Ongoing';
      case 'COMPLETED':
        return 'Completed';
      default:
        return 'Unknown status';
    }
  };

  const pages = Math.ceil(contests.length / size);
  const paginatedContests = contests.slice((page - 1) * size, page * size);

  const filteredContests = paginatedContests.filter((item) => {
    if (selectedParticipationType && item.participationType !== selectedParticipationType)
      return false;
    return true;
  });

  return (
    <div className="p-6">
      {/* Top toolbar */}
      <div className="mb-4 flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          aria-label="Reset"
          onClick={() => {
            setSearchInput('');
            setSearchTerm('');
            setPage(1);
          }}
          className="border-warning text-warning hover:bg-warning/10"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>

        <Input
          type="text"
          placeholder="Search..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearchClick()}
          className="max-w-md"
        />

        <Button
          variant="outline"
          size="icon"
          aria-label="Search"
          onClick={handleSearchClick}
          className="border-warning text-warning hover:bg-warning/10"
        >
          <Search className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          aria-label="Toggle filter"
          onClick={toggleFilter}
          className="border-warning text-warning hover:bg-warning/10"
        >
          <Filter className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          aria-label="Toggle list view"
          onClick={() => setIsListView((prev) => !prev)}
          className="border-warning text-warning hover:bg-warning/10"
        >
          <List className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex gap-4">
        {/* Filter panel */}
        {isFilterVisible && (
          <aside className="w-60 flex-shrink-0 rounded-lg border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Filters</h3>
              <Button variant="ghost" size="icon" onClick={toggleFilter} aria-label="Close filter">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-medium uppercase text-muted-foreground">
                  Status
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">All</option>
                  <option value="UPCOMING">UPCOMING</option>
                  <option value="ONGOING">ONGOING</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="AWARDED">AWARDED</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium uppercase text-muted-foreground">
                  Participation Type
                </label>
                <select
                  value={selectedParticipationType}
                  onChange={(e) => setSelectedParticipationType(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">All</option>
                  <option value="INDIVIDUAL">Individual</option>
                  <option value="TEAM">Team</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium uppercase text-muted-foreground">
                  Category
                </label>
                <div className="space-y-1.5">
                  {contests.length > 0 &&
                    Array.from(new Set(contests.map((item) => item.category)))
                      .sort()
                      .map((category) => (
                        <label
                          key={category}
                          className="flex items-center gap-2 text-sm text-foreground"
                        >
                          <input
                            type="checkbox"
                            checked={selectedCategories.includes(category)}
                            onChange={() => handleCategoryChange(category)}
                            className="h-4 w-4 accent-warning"
                          />
                          {category}
                        </label>
                      ))}
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* Display area */}
        <div className="flex-1">
          {isListView ? (
            <ChangeContestTable
              contests={filteredContests.map((item) => ({
                id: item.id,
                title: item.name,
                description: item.description,
                category: item.category,
                date: formatDateRange(item.startDate, item.endDate),
                isPublic: item.isPublic,
                status: item.status,
                statusText: getStatusText(item.status),
                allowedSubmissionTypes: item.allowedSubmissionTypes,
                scoringCriteria: item.scoringCriteria,
                introVideoUrl: item.introVideoUrl,
                image: item.imageUrls?.[0] || defaultImage,
                createdAt: item.createdAt,
              }))}
              onRowClick={handleCardClick}
            />
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredContests.map((item) => (
                <ContestCard
                  key={item.id}
                  contest={{
                    id: item.id,
                    title: item.name,
                    description: item.description,
                    category: item.category,
                    date: formatDateRange(item.startDate, item.endDate),
                    isPublic: item.isPublic,
                    status: item.status,
                    allowedSubmissionTypes: item.allowedSubmissionTypes,
                    scoringCriteria: item.scoringCriteria,
                    introVideoUrl: item.introVideoUrl,
                    image: item.imageUrls?.[0] || defaultImage,
                    createdAt: item.createdAt,
                    participationType: item.participationType || 'INDIVIDUAL',
                  }}
                  onCardClick={handleCardClick}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          <div className="mt-6 flex items-center justify-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {pages || 1}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= pages}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Contest;
