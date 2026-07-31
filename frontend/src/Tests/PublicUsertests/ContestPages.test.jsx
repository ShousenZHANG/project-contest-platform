import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import UserContestList from '../../PublicUser/UserContestList';
import PublicContestDetail from '../../PublicUser/PublicContestDetail';
import ContestDetail from '../../Participant/contest/ContestDetail';
import { renderWithProviders, createTestQueryClient } from '../testUtils';
import apiClient from '../../api/apiClient';

jest.mock('../../api/apiClient');
jest.mock('../../Homepages/Navbar', () => () => <nav data-testid="navbar" />);
jest.mock('../../Homepages/Footer', () => () => <footer data-testid="footer" />);

const CONTEST = {
  id: 'comp-1',
  name: 'AI Innovation Challenge',
  description: 'build something',
  category: 'Programming & Technology',
  status: 'ONGOING',
  startDate: '2026-01-01T00:00:00Z',
  endDate: '2026-02-01T00:00:00Z',
  imageUrls: [],
};

afterEach(() => {
  jest.clearAllMocks();
});

describe('UserContestList', () => {
  it('reads the catalogue with the active filters as params', async () => {
    apiClient.get.mockResolvedValue({ data: { data: [CONTEST] } });

    renderWithProviders(<UserContestList />);

    expect(await screen.findByText('AI Innovation Challenge')).toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalledWith(
      '/competitions/list',
      expect.objectContaining({ params: {} })
    );
  });
});

describe('contest detail', () => {
  it('shows the fallback message when the request fails', async () => {
    apiClient.get.mockRejectedValue(new Error('nope'));

    renderWithProviders(<PublicContestDetail />, {
      route: '/publiccontest-detail/comp-1',
      routePath: '/publiccontest-detail/:id',
    });

    await waitFor(() =>
      expect(screen.getByText(/Failed to load contest details/i)).toBeInTheDocument()
    );
  });

  it('serves the public and participant views from one cache entry', async () => {
    apiClient.get.mockResolvedValue({ data: CONTEST });
    const queryClient = createTestQueryClient();

    const publicView = renderWithProviders(<PublicContestDetail />, {
      route: '/publiccontest-detail/comp-1',
      routePath: '/publiccontest-detail/:id',
      queryClient,
    });
    await screen.findAllByText(/AI Innovation Challenge/i);
    publicView.unmount();

    // Same competition, participant route — the detail key is shared, so the
    // second view must not issue another request.
    apiClient.get.mockClear();
    renderWithProviders(<ContestDetail />, {
      route: '/contest-detail/comp-1',
      routePath: '/contest-detail/:id',
      queryClient,
    });

    await screen.findAllByText(/AI Innovation Challenge/i);
    expect(apiClient.get).not.toHaveBeenCalled();
  });
});
