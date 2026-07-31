import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import TeamListPage from '../../PublicUser/TeamListPage';
import TeamPublicDetail from '../../PublicUser/TeamPublicDetail';
import { renderWithProviders } from '../testUtils';
import apiClient from '../../api/apiClient';

jest.mock('../../api/apiClient');
jest.mock('../../Homepages/Navbar', () => () => <nav data-testid="navbar" />);
jest.mock('../../Homepages/Footer', () => () => <footer data-testid="footer" />);

afterEach(() => {
  jest.clearAllMocks();
});

describe('TeamListPage', () => {
  it('lists the teams registered for a contest', async () => {
    apiClient.get.mockResolvedValue({
      data: { data: [{ id: 't-1', name: 'Team Nebula', description: 'space stuff' }] },
    });

    renderWithProviders(<TeamListPage />, {
      route: '/public-teams/contest-1',
      routePath: '/public-teams/:contestId',
    });

    expect(await screen.findByText('Team Nebula')).toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalledWith(
      '/registrations/public/contest-1/teams',
      expect.objectContaining({ params: { page: 1, size: 100 } })
    );
  });

  it('surfaces a failure instead of an empty list', async () => {
    apiClient.get.mockRejectedValue(new Error('backend down'));

    renderWithProviders(<TeamListPage />, {
      route: '/public-teams/contest-1',
      routePath: '/public-teams/:contestId',
    });

    await waitFor(() => expect(screen.getByText(/backend down/i)).toBeInTheDocument());
  });
});

describe('TeamPublicDetail', () => {
  it('reads the team submission for the competition', async () => {
    apiClient.get.mockResolvedValue({
      data: { title: 'Nebula Entry', description: 'our submission' },
    });

    renderWithProviders(<TeamPublicDetail />, {
      route: '/public-team-detail/comp-1/team-1',
      routePath: '/public-team-detail/:competitionId/:teamId',
    });

    expect(await screen.findByText('Nebula Entry')).toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalledWith(
      '/submissions/public/teams/comp-1/team-1'
    );
  });

  it('falls back to the not-found copy when the endpoint errors', async () => {
    apiClient.get.mockRejectedValue({ response: { data: {} } });

    renderWithProviders(<TeamPublicDetail />, {
      route: '/public-team-detail/comp-1/team-1',
      routePath: '/public-team-detail/:competitionId/:teamId',
    });

    await waitFor(() =>
      expect(screen.getByText(/No submission found for this team/i)).toBeInTheDocument()
    );
  });
});
