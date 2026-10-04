import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

/** Paged catalogue URL state, including browser back/forward. */
export default function usePagedSearchParams() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = Number(searchParams.get('page'));
  const page = Number.isSafeInteger(requested) && requested > 0 ? requested : 1;
  const keyword = searchParams.get('keyword') || '';
  const [searchInput, setSearchInput] = useState(keyword);
  useEffect(() => setSearchInput(keyword), [keyword]);

  const update = (values) =>
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      Object.entries(values).forEach(([key, value]) => {
        if (value === '' || value == null || (key === 'page' && value === 1)) next.delete(key);
        else next.set(key, String(value));
      });
      return next;
    });
  return {
    searchParams,
    page,
    keyword,
    searchInput,
    setSearchInput,
    setPage: (value) => update({ page: value }),
    setFilters: (values) => update({ ...values, page: 1 }),
    submitSearch: (event) => {
      event?.preventDefault();
      update({ keyword: searchInput.trim(), page: 1 });
    },
  };
}
