import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import WorkList from '../../PublicUser/WorkList';
import ContestViewSubmission from '../../Participant/contest/ViewSubmission';
import { renderWithProviders } from '../testUtils';
import apiClient from '../../api/apiClient';

jest.mock('../../api/apiClient');
jest.mock('../../Homepages/Navbar', () => () => <nav data-testid="navbar" />);
jest.mock('../../Homepages/Footer', () => () => <footer data-testid="footer" />);

const APPROVED = {
  data: {
    data: [
      { id: 'sub-1', title: 'Rocket Report', description: 'about rockets', fileType: 'PDF' },
      { id: 'sub-2', title: 'Cake Design', description: 'about cake', fileType: 'PDF' },
    ],
  },
};

beforeEach(() => {
  apiClient.get.mockImplementation((url) => {
    if (url === '/interactions/votes/count') return Promise.resolve({ data: 4 });
    if (url === '/submissions/public/approved') return Promise.resolve(APPROVED);
    return Promise.resolve({ data: {} });
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('WorkList', () => {
  it('renders approved works with their vote tallies', async () => {
    renderWithProviders(<WorkList />, { route: '/work-list?competitionId=comp-1' });

    expect(await screen.findByText('Rocket Report')).toBeInTheDocument();
    expect(screen.getByText('Cake Design')).toBeInTheDocument();
  });

  it('reads one vote count per work, keyed for reuse by ViewVote', async () => {
    renderWithProviders(<WorkList />, { route: '/work-list?competitionId=comp-1' });
    await screen.findByText('Rocket Report');

    const voteCalls = apiClient.get.mock.calls.filter(
      ([url]) => url === '/interactions/votes/count'
    );
    expect(voteCalls).toHaveLength(2);
  });

  it('filters on the applied search term without refetching', async () => {
    renderWithProviders(<WorkList />, { route: '/work-list?competitionId=comp-1' });
    await screen.findByText('Rocket Report');

    const callsBefore = apiClient.get.mock.calls.length;

    fireEvent.change(screen.getByPlaceholderText(/search/i), {
      target: { value: 'cake' },
    });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() => expect(screen.queryByText('Rocket Report')).not.toBeInTheDocument());
    expect(screen.getByText('Cake Design')).toBeInTheDocument();
    expect(apiClient.get.mock.calls.length).toBe(callsBefore);
  });
});

describe('contest ViewSubmission', () => {
  it('lists approved submissions for the competition', async () => {
    renderWithProviders(<ContestViewSubmission />, {
      route: '/view-submission/comp-1',
      routePath: '/view-submission/:competitionId',
    });

    expect(await screen.findByText('Rocket Report')).toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalledWith(
      '/submissions/public/approved',
      expect.objectContaining({ params: { competitionId: 'comp-1' } })
    );
  });
});
