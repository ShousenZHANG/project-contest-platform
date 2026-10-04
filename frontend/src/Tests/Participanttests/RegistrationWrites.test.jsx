import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import ChangeContestList from '../../Participant/contest/ChangeContestList';
import { renderWithProviders } from '../testUtils';
import apiClient from '../../api/apiClient';

jest.mock('../../api/apiClient');

const CONTEST = { id: 'comp-1', name: 'AI Challenge', status: 'ONGOING' };

beforeEach(() => {
  Storage.prototype.getItem = jest.fn((key) => {
    if (key === 'token') return 'fake-token';
    if (key === 'userId') return 'user-1';
    return null;
  });
  apiClient.get.mockResolvedValue({ data: false });
  apiClient.post.mockResolvedValue({ data: 'ok' });
  apiClient.delete.mockResolvedValue({ data: 'ok' });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('ChangeContestList', () => {
  it('registers against /registrations/{id}', async () => {
    renderWithProviders(<ChangeContestList contest={CONTEST} />);

    fireEvent.click(screen.getByRole('button', { name: /join/i }));

    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith('/registrations/comp-1')
    );
  });

  it('offers to cancel when the backend says the user already registered', async () => {
    apiClient.post.mockRejectedValue({
      response: { data: { error: 'You have already registered for this competition' } },
    });

    renderWithProviders(<ChangeContestList contest={CONTEST} />);
    fireEvent.click(screen.getByRole('button', { name: /join/i }));

    // The dialog asks "Do you want to cancel your registration?" with Yes/No.
    expect(
      await screen.findByRole('heading', { name: /Already Registered/i })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^yes$/i }));
    await waitFor(() =>
      expect(apiClient.delete).toHaveBeenCalledWith('/registrations/comp-1')
    );
  });
});

describe('ChangeContestList registration status', () => {
  it('labels the button from the status endpoint', async () => {
    apiClient.get.mockResolvedValue({ data: true });

    renderWithProviders(<ChangeContestList contest={CONTEST} />);

    expect(
      await screen.findByRole('button', { name: /^registered$/i })
    ).toBeInTheDocument();
  });

  it('flips the label before the request resolves', async () => {
    let release;
    apiClient.post.mockReturnValue(new Promise((resolve) => { release = resolve; }));

    renderWithProviders(<ChangeContestList contest={CONTEST} />);
    fireEvent.click(await screen.findByRole('button', { name: /^join$/i }));

    // Optimistic: the row reads as registered with the request still in flight.
    expect(
      await screen.findByRole('button', { name: /^registered$/i })
    ).toBeInTheDocument();
    release({ data: 'ok' });
  });

  it('puts the label back when registration fails', async () => {
    apiClient.post.mockRejectedValue({ response: { status: 500, data: 'boom' } });

    renderWithProviders(<ChangeContestList contest={CONTEST} />);
    fireEvent.click(await screen.findByRole('button', { name: /^join$/i }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^join$/i })).toBeInTheDocument()
    );
  });

  it('goes straight to the cancel prompt when already registered', async () => {
    apiClient.get.mockResolvedValue({ data: true });

    renderWithProviders(<ChangeContestList contest={CONTEST} />);
    fireEvent.click(await screen.findByRole('button', { name: /^registered$/i }));

    // No failed POST needed to reach the dialog any more.
    expect(
      await screen.findByRole('heading', { name: /Already Registered/i })
    ).toBeInTheDocument();
    expect(apiClient.post).not.toHaveBeenCalled();
  });
});
