import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import ViewVote from '../../Participant/ViewVote';
import { renderWithProviders } from '../testUtils';
import apiClient from '../../api/apiClient';

jest.mock('../../api/apiClient');

beforeEach(() => {
  Storage.prototype.getItem = jest.fn((key) => {
    if (key === 'token') return 'fake-token';
    if (key === 'userId') return 'user-1';
    return null;
  });

  apiClient.get.mockImplementation((url) => {
    if (url.includes('/votes/count')) return Promise.resolve({ data: 7 });
    if (url.includes('/votes/status')) return Promise.resolve({ data: false });
    return Promise.resolve({ data: null });
  });

  apiClient.post.mockResolvedValue({ data: 'ok' });
  apiClient.delete.mockResolvedValue({ data: 'ok' });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('ViewVote', () => {
  it('shows the current count and vote state', async () => {
    renderWithProviders(<ViewVote submissionId="sub-1" />);

    expect(await screen.findByText('7')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Vote for this submission/i })).toBeInTheDocument();
  });

  it('posts the vote with submissionId as a query param', async () => {
    renderWithProviders(<ViewVote submissionId="sub-1" />);
    fireEvent.click(await screen.findByRole('button', { name: /Vote for this submission/i }));

    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith(
        '/interactions/votes',
        null,
        expect.objectContaining({ params: { submissionId: 'sub-1' } })
      )
    );
  });

  it('bumps the count before the request resolves', async () => {
    let release;
    apiClient.post.mockReturnValue(new Promise((resolve) => { release = resolve; }));

    renderWithProviders(<ViewVote submissionId="sub-1" />);
    fireEvent.click(await screen.findByRole('button', { name: /Vote for this submission/i }));

    // Optimistic: 7 -> 8 with the request still in flight.
    expect(await screen.findByText('8')).toBeInTheDocument();
    release({ data: 'ok' });
  });

  it('rolls the count back when the vote fails', async () => {
    apiClient.post.mockRejectedValue(new Error('nope'));

    renderWithProviders(<ViewVote submissionId="sub-1" />);
    fireEvent.click(await screen.findByRole('button', { name: /Vote for this submission/i }));

    await waitFor(() => expect(screen.getByText('7')).toBeInTheDocument());
  });

  it('does not query when there is no signed-in user', async () => {
    Storage.prototype.getItem = jest.fn(() => null);

    renderWithProviders(<ViewVote submissionId="sub-1" />);

    await waitFor(() => expect(apiClient.get).not.toHaveBeenCalled());
  });
});
