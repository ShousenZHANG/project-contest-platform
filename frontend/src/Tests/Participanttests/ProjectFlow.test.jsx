import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import Project from '../../Participant/project/Project';
import TeamRegistrations from '../../Participant/team/TeamRegistrations';
import { renderWithProviders } from '../testUtils';
import apiClient from '../../api/apiClient';

jest.mock('../../api/apiClient');

beforeEach(() => {
  Storage.prototype.getItem = jest.fn((key) => {
    if (key === 'token') return 'fake-token';
    if (key === 'userId') return 'user-1';
    if (key === 'role') return 'Participant';
    if (key === 'email') return 'p@example.com';
    return null;
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('Project', () => {
  it('fills in a missing file name without looping on its own state', async () => {
    apiClient.get.mockImplementation((url) => {
      if (url === '/users/profile') {
        return Promise.resolve({ data: { name: 'Pat', email: 'p@example.com' } });
      }
      if (url === '/registrations/my') {
        return Promise.resolve({
          data: {
            data: [
              {
                competitionId: 'comp-1',
                competitionName: 'AI Challenge',
                hasSubmitted: true,
                fileName: '',
              },
            ],
            total: 1,
            page: 1,
            pages: 1,
          },
        });
      }
      if (url === '/submissions/comp-1') {
        return Promise.resolve({
          data: { fileName: 'entry.pdf', reviewStatus: 'PENDING' },
        });
      }
      return Promise.resolve({ data: {} });
    });

    renderWithProviders(<Project />);

    expect(await screen.findByText('entry.pdf')).toBeInTheDocument();

    // The enrichment used to be an effect that wrote back into the state it
    // depended on. One read per row is the whole budget.
    await waitFor(() => {
      const detailCalls = apiClient.get.mock.calls.filter(
        ([url]) => url === '/submissions/comp-1'
      );
      expect(detailCalls).toHaveLength(1);
    });
  });
});

describe('TeamRegistrations', () => {
  it('reads each team competition list in parallel', async () => {
    apiClient.get.mockImplementation((url) => {
      if (url === '/users/profile') {
        return Promise.resolve({ data: { name: 'Pat' } });
      }
      if (url === '/teams/my-joined') {
        return Promise.resolve({
          data: {
            data: [
              { id: 'team-1', name: 'Alpha' },
              { id: 'team-2', name: 'Beta' },
            ],
          },
        });
      }
      if (url.endsWith('/competitions')) {
        return Promise.resolve({
          data: { data: [{ competitionId: 'comp-1', competitionName: 'AI Challenge' }] },
        });
      }
      return Promise.resolve({ data: {} });
    });

    renderWithProviders(<TeamRegistrations userData={{ userId: 'user-1' }} />);

    await waitFor(() => {
      const compCalls = apiClient.get.mock.calls
        .map(([url]) => url)
        .filter((url) => url.endsWith('/competitions'));

      // The old loop awaited each team in turn; both go out together now.
      expect(compCalls).toEqual([
        '/registrations/teams/team-1/competitions',
        '/registrations/teams/team-2/competitions',
      ]);
    });
  });
});
