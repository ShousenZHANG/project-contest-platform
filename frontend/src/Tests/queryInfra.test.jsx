/**
 * Guards the React Query infrastructure: cache key shape, envelope unwrapping,
 * and test-render isolation.
 *
 * Keys matter more than they look. Two spellings of the same key are two cache
 * entries that drift apart in ways no component test would notice, so the
 * prefix relationships are asserted directly.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';

import { queryKeys, staleTime } from '../api/queryKeys';
import { unwrap, toMessage } from '../api/queryFn';
import { renderWithProviders } from './testUtils';

describe('queryKeys', () => {
  it('nests specific keys under their general prefix so partial invalidation works', () => {
    const { competitions } = queryKeys;

    expect(competitions.lists().slice(0, 1)).toEqual(competitions.all);
    expect(competitions.list({ page: 1 }).slice(0, 2)).toEqual(competitions.lists());
    expect(competitions.detail('abc').slice(0, 2)).toEqual(competitions.details());
    expect(competitions.judges('abc').slice(0, 3)).toEqual(competitions.detail('abc'));
  });

  it('treats missing params and an empty object as the same cache entry', () => {
    expect(queryKeys.competitions.list()).toEqual(queryKeys.competitions.list({}));
    expect(queryKeys.registrations.mine()).toEqual(queryKeys.registrations.mine({}));
  });

  it('does not let param order change the key', () => {
    expect(queryKeys.competitions.list({ page: 1, size: 10 })).toEqual(
      queryKeys.competitions.list({ page: 1, size: 10 })
    );
  });

  it('sorts id collections so the same set produces one cache entry', () => {
    expect(queryKeys.users.byIds(['b', 'a'])).toEqual(queryKeys.users.byIds(['a', 'b']));
    expect(queryKeys.users.byEmails(['z@x.com', 'a@x.com'])).toEqual(
      queryKeys.users.byEmails(['a@x.com', 'z@x.com'])
    );
  });

  it('does not mutate the array it is handed', () => {
    const ids = ['b', 'a'];
    queryKeys.users.byIds(ids);
    expect(ids).toEqual(['b', 'a']);
  });

  it('keeps separate domains from colliding', () => {
    expect(queryKeys.teams.detail('1')).not.toEqual(queryKeys.users.detail('1'));
    expect(queryKeys.submissions.detail('1')).not.toEqual(queryKeys.comments.all);
  });

  it('orders the staleTime tiers', () => {
    expect(staleTime.live).toBe(0);
    expect(staleTime.live).toBeLessThan(staleTime.short);
    expect(staleTime.short).toBeLessThan(staleTime.medium);
    expect(staleTime.medium).toBeLessThan(staleTime.long);
  });
});

describe('unwrap', () => {
  it('returns the payload out of an Axios + ApiResponse envelope', async () => {
    const response = { data: { success: true, data: { id: '1' } } };
    await expect(unwrap(Promise.resolve(response))).resolves.toEqual({ id: '1' });
  });

  it('throws when the envelope reports failure, so React Query sees an error', async () => {
    const response = { data: { success: false, data: null, error: 'Nope' } };
    await expect(unwrap(Promise.resolve(response))).rejects.toThrow('Nope');
  });

  it('passes through responses that are not wrapped in an envelope', async () => {
    await expect(unwrap(Promise.resolve({ data: ['a'] }))).resolves.toEqual(['a']);
  });

  it('propagates a rejected request', async () => {
    await expect(unwrap(Promise.reject(new Error('offline')))).rejects.toThrow('offline');
  });
});

describe('toMessage', () => {
  it('prefers the backend message', () => {
    expect(toMessage({ response: { data: { message: 'Already registered' } } })).toBe(
      'Already registered'
    );
  });

  it('falls back to the error message', () => {
    expect(toMessage(new Error('Network Error'))).toBe('Network Error');
  });

  it('always returns something printable', () => {
    expect(toMessage(undefined)).toBe('An unexpected error occurred');
  });
});

describe('renderWithProviders', () => {
  function Probe() {
    const { data } = useQuery({
      queryKey: queryKeys.competitions.detail('x'),
      queryFn: () => Promise.resolve('loaded'),
    });
    return <span>{data ?? 'pending'}</span>;
  }

  it('supplies a QueryClient so components using useQuery can render', async () => {
    renderWithProviders(<Probe />);
    await waitFor(() => expect(screen.getByText('loaded')).toBeInTheDocument());
  });

  it('gives each render its own cache', async () => {
    const first = renderWithProviders(<Probe />);
    await waitFor(() => expect(screen.getByText('loaded')).toBeInTheDocument());
    first.unmount();

    const second = renderWithProviders(<Probe />);
    expect(second.queryClient).not.toBe(first.queryClient);
    expect(
      second.queryClient.getQueryData(queryKeys.competitions.detail('x'))
    ).toBeUndefined();
  });

  it('exposes route params when given a route pattern', () => {
    function ShowId() {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const { id } = require('react-router-dom').useParams();
      return <span>id:{id}</span>;
    }

    renderWithProviders(<ShowId />, {
      route: '/contest-detail/42',
      routePath: '/contest-detail/:id',
    });

    expect(screen.getByText('id:42')).toBeInTheDocument();
  });
});
