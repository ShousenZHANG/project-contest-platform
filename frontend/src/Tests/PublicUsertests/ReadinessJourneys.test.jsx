import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../testUtils';
import UserContestList from '../../PublicUser/UserContestList';
import TopValues from '../../Homepages/TopValues';
import Results from '../../PublicUser/Results';
import apiClient from '../../api/apiClient';

jest.mock('../../api/apiClient');
jest.mock('../../Homepages/Navbar', () => () => <nav />);
jest.mock('../../Homepages/Footer', () => () => <footer />);
const contest = {
  id: 'comp-13',
  name: 'Real Contest 13',
  status: 'ONGOING',
  participationType: 'TEAM',
  startDate: '2026-10-01T00:00:00Z',
  endDate: '2026-10-10T00:00:00Z',
  imageUrls: [],
};
beforeEach(() => jest.clearAllMocks());

it('keeps server pagination, total and filter state in the public catalogue URL', async () => {
  apiClient.get.mockImplementation((_url, config) =>
    Promise.resolve({
      data: {
        data: [
          { ...contest, name: config.params.page === 2 ? 'Real Contest 13' : 'Real Contest 1' },
        ],
        page: config.params.page,
        total: 25,
        pages: 3,
      },
    }),
  );
  renderWithProviders(<UserContestList />, {
    route: '/contest-list?status=ONGOING&participationType=TEAM',
  });
  await screen.findByText('Real Contest 1');
  expect(screen.getByRole('status')).toHaveTextContent('25 results');
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
  await screen.findByText('Real Contest 13');
  expect(apiClient.get).toHaveBeenLastCalledWith('/competitions/list', {
    params: { page: 2, size: 12, status: 'ONGOING', participationType: 'TEAM' },
  });
  fireEvent.change(screen.getByLabelText('Participation type'), {
    target: { value: 'INDIVIDUAL' },
  });
  await waitFor(() =>
    expect(apiClient.get).toHaveBeenLastCalledWith('/competitions/list', {
      params: { page: 1, size: 12, status: 'ONGOING', participationType: 'INDIVIDUAL' },
    }),
  );
});

it('uses real homepage competition IDs and never votes on a competition', async () => {
  apiClient.get.mockImplementation((url) => Promise.resolve({ data: url === '/competitions/list'
    ? { data: [contest], total: 1, page: 1, size: 4, pages: 1 }
    : [contest] }));
  renderWithProviders(<TopValues />);
  expect(
    await screen.findByRole('link', { name: 'View details for Real Contest 13' }),
  ).toHaveAttribute('href', '/publiccontest-detail/comp-13');
  expect(screen.queryByRole('button', { name: /vote|join/i })).not.toBeInTheDocument();
  expect(apiClient.post).not.toHaveBeenCalled();
  expect(apiClient.get).toHaveBeenCalledWith('/competitions/list', { params: { page: 1, size: 4 } });
});

it('renders persisted published scores with a 10 point scale', async () => {
  apiClient.get.mockImplementation((url) =>
    Promise.resolve({
      data: url.startsWith('/competitions/')
        ? { ...contest, status: 'AWARDED' }
        : {
            data: [
              {
                submissionId: 'sub-1',
                title: 'Nebula',
                awards: ['Champion'],
                submitterName: 'Team Orbit',
                totalScore: 8.25,
              },
            ],
            total: 1,
            pages: 1,
          },
    }),
  );
  renderWithProviders(<Results />, {
    route: '/results/comp-13',
    routePath: '/results/:competitionId',
  });
  expect(await screen.findByText('Champion')).toBeInTheDocument();
  expect(screen.getByText('Team Orbit')).toBeInTheDocument();
  expect(screen.getByText('8.25')).toBeInTheDocument();
});

it('shows unpublished state without querying public winners', async () => {
  apiClient.get.mockResolvedValue({ data: contest });
  renderWithProviders(<Results />, {
    route: '/results/comp-13',
    routePath: '/results/:competitionId',
  });
  expect(await screen.findByText('Results have not been published')).toBeInTheDocument();
  expect(apiClient.get).not.toHaveBeenCalledWith('/winners/public-list', expect.anything());
});

it('does not label historical missing score snapshots as zero out of ten', async () => {
  apiClient.get.mockImplementation((url) =>
    Promise.resolve({
      data: url.startsWith('/competitions/')
        ? { ...contest, status: 'AWARDED' }
        : {
            data: [
              {
                submissionId: 'old-1',
                title: 'Historical winner',
                awards: ['Champion'],
                submitterName: 'Team Archive',
                totalScore: null,
              },
            ],
            total: 1,
            pages: 1,
          },
    }),
  );
  renderWithProviders(<Results />, {
    route: '/results/comp-13',
    routePath: '/results/:competitionId',
  });
  expect(await screen.findByText('Score unavailable')).toBeInTheDocument();
  expect(screen.queryByText('0.00')).not.toBeInTheDocument();
});
