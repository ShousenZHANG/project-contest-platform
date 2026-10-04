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
      ([url]) => url === '/interactions/votes/count',
    );
    expect(voteCalls).toHaveLength(2);
  });

  it('searches all approved works on the server and resets pagination', async () => {
    apiClient.get.mockImplementation((url, config) => {
      if (url === '/interactions/votes/count') return Promise.resolve({ data: 4 });
      if (url === '/submissions/public/approved')
        return Promise.resolve(
          config.params.keyword
            ? { data: { data: [APPROVED.data.data[1]], total: 1, pages: 1 } }
            : APPROVED,
        );
      return Promise.resolve({ data: {} });
    });
    renderWithProviders(<WorkList />, { route: '/work-list?competitionId=comp-1' });
    await screen.findByText('Rocket Report');

    fireEvent.change(screen.getByPlaceholderText(/search/i), {
      target: { value: 'cake' },
    });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    expect(await screen.findByText('Cake Design')).toBeInTheDocument();
    expect(screen.queryByText('Rocket Report')).not.toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalledWith('/submissions/public/approved', {
      params: { competitionId: 'comp-1', page: 1, size: 12, keyword: 'cake' },
    });
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
      expect.objectContaining({ params: { competitionId: 'comp-1' } }),
    );
  });
});
