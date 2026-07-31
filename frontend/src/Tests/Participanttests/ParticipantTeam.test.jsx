import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import ParticipantTeam from '../../Participant/team/ParticipantTeam';
import { renderWithProviders } from '../testUtils';
import apiClient from '../../api/apiClient';

jest.mock('../../api/apiClient');

const PUBLIC_TEAM = {
  id: 'team-2',
  name: 'Public Team',
  description: 'open to all',
  createdBy: 'someone-else',
};

const JOINED_TEAM = {
  id: 'team-1',
  name: 'Joined Team',
  description: 'already in',
  createdBy: 'user-1',
};

beforeEach(() => {
  Storage.prototype.getItem = jest.fn((key) => {
    if (key === 'token') return 'fake-token';
    if (key === 'userId') return 'user-1';
    if (key === 'role') return 'Participant';
    return null;
  });

  apiClient.get.mockImplementation((url) => {
    if (url === '/users/profile') {
      return Promise.resolve({ data: { name: 'Pat', email: 'p@example.com' } });
    }
    if (url === '/teams/my-joined') {
      return Promise.resolve({ data: { data: [JOINED_TEAM], pages: 1 } });
    }
    if (url === '/teams/public/all') {
      return Promise.resolve({ data: { data: [PUBLIC_TEAM, JOINED_TEAM], pages: 1 } });
    }
    return Promise.resolve({ data: {} });
  });

  apiClient.post.mockResolvedValue({ data: 'ok' });
  apiClient.delete.mockResolvedValue({ data: 'ok' });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('ParticipantTeam', () => {
  it('lists public teams once the profile resolves', async () => {
    renderWithProviders(<ParticipantTeam />);
    expect(await screen.findByText('Public Team')).toBeInTheDocument();
  });

  it('fetches the profile once, not once per consumer', async () => {
    renderWithProviders(<ParticipantTeam />);
    await screen.findByText('Public Team');

    const profileCalls = apiClient.get.mock.calls.filter(
      ([url]) => url === '/users/profile'
    );
    expect(profileCalls).toHaveLength(1);
  });

  it('derives membership from the my-joined response instead of a second request', async () => {
    renderWithProviders(<ParticipantTeam />);
    await screen.findByText('Public Team');

    // The old implementation hit /teams/my-joined twice: once for the list and
    // once again to build the joined-id set.
    const joinedCalls = apiClient.get.mock.calls.filter(
      ([url]) => url === '/teams/my-joined'
    );
    expect(joinedCalls).toHaveLength(1);
  });

  it('posts a join for a team the user is not in', async () => {
    renderWithProviders(<ParticipantTeam />);
    await screen.findByText('Public Team');

    const joinButton = await screen.findByRole('button', { name: /^join$/i });
    fireEvent.click(joinButton);

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/teams/team-2/join'));
  });

  it('rolls membership back when the join fails', async () => {
    apiClient.post.mockRejectedValue({ response: { status: 500 }, message: 'boom' });

    const { queryClient } = renderWithProviders(<ParticipantTeam />);
    await screen.findByText('Public Team');

    fireEvent.click(await screen.findByRole('button', { name: /^join$/i }));

    await waitFor(() => {
      const cached = queryClient.getQueryData(['teams', 'myJoined', { page: 1, size: 1000 }]);
      expect((cached?.data ?? []).map((t) => t.id)).toEqual(['team-1']);
    });
  });
});
