import React, { useState } from 'react';
import { IconButton, Typography, Pagination } from '@mui/material';
import { Close, FilterAlt, ViewList } from '@mui/icons-material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';

/**
 * Shared presentational component for contest list pages.
 *
 * Receives all state + handlers from useContestFiltering and role-specific
 * props for navigation and custom card rendering.
 *
 * @param {object} props
 * @param {Array}    props.contests
 * @param {boolean}  props.loading
 * @param {string|null} props.error
 * @param {number}   props.page
 * @param {number}   props.totalPages
 * @param {string}   props.searchQuery
 * @param {string[]} props.selectedCategories
 * @param {string}   props.selectedStatus
 * @param {string}   props.selectedParticipationType
 * @param {boolean}  props.isFilterVisible
 * @param {function} props.handleSearch
 * @param {function} props.handleCategoryChange
 * @param {function} props.handleStatusChange
 * @param {function} props.handleParticipationTypeChange
 * @param {function} props.handlePageChange
 * @param {function} props.toggleFilter
 * @param {function} props.resetFilters
 * @param {function} props.onContestClick          - called with the raw contest object when a card is clicked
 * @param {function} props.renderContest           - (contest, onContestClick) => ReactNode; renders one contest entry
 * @param {string}   [props.title]                 - optional heading rendered above the list
 * @param {React.ReactNode} [props.headerExtra]    - optional extra content in the header row (e.g. Create button)
 * @param {string}   [props.accentColor]           - MUI color for pagination/icons (default '#FF9800')
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

  const iconBtnSx = {
    color: accentColor,
    border: `1px solid ${accentColor}`,
    borderRadius: '8px',
    marginLeft: '8px',
    ':hover': { backgroundColor: '#FFE0B2' },
  };

  const paginationSx = {
    '& .MuiPaginationItem-root': { color: accentColor, borderColor: accentColor },
    '& .MuiPaginationItem-root.Mui-selected': {
      backgroundColor: accentColor,
      color: '#fff',
      borderColor: accentColor,
      '&:hover': { backgroundColor: '#FB8C00' },
    },
  };

  const allCategories = Array.from(new Set(contests.map((c) => c.category))).sort();

  return (
    <div className="contest-list-view">
      {title && (
        <Typography variant="h4" align="center" fontWeight="bold" sx={{ mb: 3 }}>
          {title}
        </Typography>
      )}

      {/* Search + action bar */}
      <div className="contest-list-view__header" style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
        <IconButton onClick={resetFilters} sx={{ ...iconBtnSx, marginLeft: 0, marginRight: '8px' }}>
          <RefreshIcon />
        </IconButton>

        <input
          style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '14px' }}
          type="text"
          placeholder="Search..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSearch(searchInput);
          }}
        />

        <IconButton onClick={() => handleSearch(searchInput)} sx={iconBtnSx}>
          <SearchIcon />
        </IconButton>

        <IconButton onClick={toggleFilter} sx={iconBtnSx}>
          <FilterAlt />
        </IconButton>

        <IconButton onClick={() => setIsListView((v) => !v)} sx={iconBtnSx}>
          <ViewList />
        </IconButton>

        {headerExtra && <div style={{ marginLeft: '8px' }}>{headerExtra}</div>}
      </div>

      {/* Filter sidebar */}
      {isFilterVisible && (
        <div
          className="contest-list-view__filter-sidebar"
          style={{
            border: '1px solid #eee',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '12px',
            backgroundColor: '#fafafa',
            position: 'relative',
          }}
        >
          <IconButton
            onClick={toggleFilter}
            size="small"
            style={{ position: 'absolute', top: 8, right: 8 }}
          >
            <Close fontSize="small" />
          </IconButton>

          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
            Filter by Status
          </Typography>
          <select
            value={selectedStatus}
            onChange={(e) => handleStatusChange(e.target.value)}
            style={{ width: '100%', padding: '6px', marginBottom: '12px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="">All</option>
            <option value="UPCOMING">UPCOMING</option>
            <option value="ONGOING">ONGOING</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="AWARDED">AWARDED</option>
          </select>

          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
            Filter by Participation Type
          </Typography>
          <select
            value={selectedParticipationType}
            onChange={(e) => handleParticipationTypeChange(e.target.value)}
            style={{ width: '100%', padding: '6px', marginBottom: '12px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="">All</option>
            <option value="INDIVIDUAL">INDIVIDUAL</option>
            <option value="TEAM">TEAM</option>
          </select>

          {allCategories.length > 0 && (
            <>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                Filter by Category
              </Typography>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {allCategories.map((cat) => (
                  <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
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
      {loading && (
        <Typography sx={{ mt: 2 }}>Loading competitions...</Typography>
      )}

      {error && !loading && (
        <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>
      )}

      {!loading && !error && (
        <div
          className="contest-list-view__cards"
          style={
            isListView
              ? {}
              : { display: 'flex', flexWrap: 'wrap', gap: '16px' }
          }
        >
          {contests.length === 0 ? (
            <Typography sx={{ mt: 2 }}>No competitions found.</Typography>
          ) : (
            contests.map((contest) => renderContest(contest, onContestClick, isListView))
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={handlePageChange}
            sx={paginationSx}
          />
        </div>
      )}
    </div>
  );
}

export default ContestListView;
