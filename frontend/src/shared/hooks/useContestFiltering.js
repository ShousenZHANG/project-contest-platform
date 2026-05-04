import { useState, useEffect, useCallback } from 'react';

/**
 * Shared hook for contest list pages (Participant, Organizer, PublicUser).
 *
 * @param {object} options
 * @param {function} options.fetchFn - Async function called with filter params;
 *   must return an object with `data` (array) and `pages` or `totalPages` (number).
 *   The simplest form is to return the full API response payload or a shaped object.
 */
export function useContestFiltering({ fetchFn }) {
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedParticipationType, setSelectedParticipationType] = useState('');
  const [isFilterVisible, setIsFilterVisible] = useState(false);

  const fetchContests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn({
        page,
        searchQuery,
        selectedCategories,
        selectedStatus,
        selectedParticipationType,
      });
      setContests(result.data ?? result.records ?? []);
      setTotalPages(result.pages ?? result.totalPages ?? 1);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load competitions');
    } finally {
      setLoading(false);
    }
  }, [fetchFn, page, searchQuery, selectedCategories, selectedStatus, selectedParticipationType]);

  useEffect(() => {
    fetchContests();
  }, [fetchContests]);

  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
    setPage(1);
  }, []);

  const handleCategoryChange = useCallback((cat) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
    setPage(1);
  }, []);

  const handleStatusChange = useCallback((status) => {
    setSelectedStatus(status);
    setPage(1);
  }, []);

  const handleParticipationTypeChange = useCallback((type) => {
    setSelectedParticipationType(type);
    setPage(1);
  }, []);

  const handlePageChange = useCallback((_, newPage) => setPage(newPage), []);

  const toggleFilter = useCallback(() => setIsFilterVisible((v) => !v), []);

  const resetFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCategories([]);
    setSelectedStatus('');
    setSelectedParticipationType('');
    setPage(1);
  }, []);

  return {
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
    refetch: fetchContests,
  };
}
