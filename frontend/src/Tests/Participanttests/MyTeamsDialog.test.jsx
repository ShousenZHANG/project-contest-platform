import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import MyTeamsDialog from '../../Participant/team/MyTeamsDialog';
import { renderWithProviders } from '../testUtils';
import apiClient from '../../api/apiClient';

jest.mock('../../api/apiClient');

const MY_TEAMS = [
  { id: 'team-1', name: 'Alpha', description: 'first' },
  { id: 'team-2', name: 'Beta', description: 'second' },
  { id: 'team-3', name: 'Gamma', description: 'third' },
];

const noop = () => {};

function renderDialog(props = {}) {
  return renderWithProviders(
    <MyTeamsDialog
      open
      myTeams={MY_TEAMS}
      userData={{ userId: 'user-1' }}
      onClose={noop}
      onDelete={noop}
      onUpdate={noop}
      {...props}
    />
  );
}

beforeEach(() => {
  apiClient.get.mockImplementation((url) => {
    if (url.endsWith('/creator')) {
      return Promise.resolve({ data: { id: 'user-1', name: 'Pat' } });
    }
    return Promise.resolve({ data: { id: 'team-1', name: 'Alpha', members: [] } });
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('MyTeamsDialog', () => {
  it('lists the teams once the creator lookups resolve', async () => {
    renderDialog();
    expect(await screen.findByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Gamma')).toBeInTheDocument();
  });

  it('fetches every creator in parallel rather than one after another', async () => {
    renderDialog();
    await screen.findByText('Alpha');

    const creatorCalls = apiClient.get.mock.calls
      .map(([url]) => url)
      .filter((url) => url.endsWith('/creator'));

    // One per team, and issued together — the old loop awaited each in turn.
    expect(creatorCalls).toEqual([
      '/teams/team-1/creator',
      '/teams/team-2/creator',
      '/teams/team-3/creator',
    ]);
  });

  it('issues no requests while the dialog is closed', async () => {
    renderDialog({ open: false });
    await waitFor(() => expect(apiClient.get).not.toHaveBeenCalled());
  });
});
