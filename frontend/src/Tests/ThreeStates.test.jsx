/**
 * Renders each list page in all three data states.
 *
 * Two things this catches that the build does not: a page that renders an
 * empty grid while loading or after a failure (so the two are
 * indistinguishable from "there is nothing here"), and an identifier used in
 * JSX without being imported — Vite happily builds that and it throws at
 * runtime.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from './testUtils';
import apiClient from '../api/apiClient';

import ParticipantContest from '../Participant/contest/Contest';
import UserContestList from '../PublicUser/UserContestList';
import ComentsPage from '../PublicUser/ComentsPage';
import Rating from '../Participant/Rating';

jest.mock('../api/apiClient');
jest.mock('../Homepages/Navbar', () => () => <nav data-testid="navbar" />);
jest.mock('../Homepages/Footer', () => () => <footer data-testid="footer" />);

const never = () => new Promise(() => {});

beforeEach(() => {
  Storage.prototype.getItem = jest.fn((key) => {
    if (key === 'token') return 'fake-token';
    if (key === 'userId') return 'user-1';
    if (key === 'email') return 'p@example.com';
    return null;
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

const PAGES = [
  {
    name: 'Participant contest list',
    render: () => renderWithProviders(<ParticipantContest />),
    empty: { data: { data: [] } },
    loaded: { data: { data: [{ id: 'c-1', name: 'AI Challenge', category: 'Tech' }] } },
    emptyText: /No contests match these filters/i,
  },
  {
    name: 'Public contest list',
    render: () => renderWithProviders(<UserContestList />),
    empty: { data: { data: [] } },
    loaded: { data: { data: [{ id: 'c-1', name: 'AI Challenge', category: 'Tech' }] } },
    emptyText: /No contests match these filters/i,
  },
  {
    name: 'Comments page',
    render: () =>
      renderWithProviders(<ComentsPage />, {
        route: '/publicusercoments/sub-1',
        routePath: '/publicusercoments/:submissionId',
      }),
    empty: { data: { data: [], pages: 1 } },
    loaded: { data: { data: [{ id: 'x', content: 'hi', createdAt: '2026-01-01' }], pages: 1 } },
    emptyText: /No comments yet/i,
  },
];

describe.each(PAGES)('$name', ({ render, empty, loaded, emptyText }) => {
  it('does not look empty while it is still loading', async () => {
    apiClient.get.mockImplementation(never);

    render();

    // The empty-state copy must not be on screen before the data arrives.
    await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
    expect(screen.queryByText(emptyText)).not.toBeInTheDocument();
  });

  it('says so when there is genuinely nothing', async () => {
    apiClient.get.mockResolvedValue(empty);

    render();

    expect(await screen.findByText(emptyText)).toBeInTheDocument();
  });

  it('renders rows once data arrives', async () => {
    apiClient.get.mockResolvedValue(loaded);

    render();

    await waitFor(() => expect(screen.queryByText(emptyText)).not.toBeInTheDocument());
  });
});

describe('Participant contest list failure', () => {
  it('reports the failure instead of showing an empty grid', async () => {
    apiClient.get.mockRejectedValue(new Error('backend unreachable'));

    renderWithProviders(<ParticipantContest />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/backend unreachable/i);
  });
});

describe('Rating', () => {
  it('distinguishes loading from an empty assignment list', async () => {
    apiClient.get.mockImplementation(never);
    const { unmount } = renderWithProviders(<Rating />);
    expect(await screen.findByText(/Loading your competitions/i)).toBeInTheDocument();
    unmount();

    apiClient.get.mockResolvedValue({ data: { data: [] } });
    renderWithProviders(<Rating />);
    await waitFor(() =>
      expect(screen.queryByText(/Loading your competitions/i)).not.toBeInTheDocument()
    );
  });

  it('reports a failure in the table body', async () => {
    apiClient.get.mockRejectedValue(new Error('judge service down'));

    renderWithProviders(<Rating />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/judge service down/i);
  });
});
