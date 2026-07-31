import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import ComentsPage from '../../PublicUser/ComentsPage';
import ProjectComment from '../../Participant/contest/ProjectComment';
import { renderWithProviders } from '../testUtils';
import apiClient from '../../api/apiClient';

jest.mock('../../api/apiClient');
jest.mock('../../Homepages/Navbar', () => () => <nav data-testid="navbar" />);
jest.mock('../../Homepages/Footer', () => () => <footer data-testid="footer" />);

const commentPage = (n, totalPages) => ({
  data: {
    data: [{ id: `c-${n}`, content: `comment page ${n}`, createdAt: '2026-01-01T00:00:00Z' }],
    pages: totalPages,
  },
});

beforeEach(() => {
  Storage.prototype.getItem = jest.fn((key) => {
    if (key === 'token') return 'fake-token';
    if (key === 'userId') return 'user-1';
    return null;
  });
  apiClient.post.mockResolvedValue({ data: 'ok' });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('ComentsPage', () => {
  it('keeps earlier pages when loading more', async () => {
    apiClient.get
      .mockResolvedValueOnce(commentPage(1, 2))
      .mockResolvedValueOnce(commentPage(2, 2));

    renderWithProviders(<ComentsPage />, {
      route: '/publicusercoments/sub-1',
      routePath: '/publicusercoments/:submissionId',
    });

    expect(await screen.findByText('comment page 1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /load more/i }));

    // Both pages on screen — the first must not be replaced by the second.
    expect(await screen.findByText('comment page 2')).toBeInTheDocument();
    expect(screen.getByText('comment page 1')).toBeInTheDocument();
  });

  it('stops asking for more once the last page is in', async () => {
    apiClient.get.mockResolvedValue(commentPage(1, 1));

    renderWithProviders(<ComentsPage />, {
      route: '/publicusercoments/sub-1',
      routePath: '/publicusercoments/:submissionId',
    });

    await screen.findByText('comment page 1');
    expect(apiClient.get).toHaveBeenCalledTimes(1);
  });
});

describe('ProjectComment', () => {
  it('refreshes the thread after posting', async () => {
    apiClient.get.mockResolvedValue(commentPage(1, 1));

    renderWithProviders(<ProjectComment submissionId="sub-1" />);
    await waitFor(() => expect(apiClient.get).toHaveBeenCalled());

    fireEvent.change(screen.getByPlaceholderText('Add a Comment'), {
      target: { value: 'nice work' },
    });
    fireEvent.click(screen.getByRole('button', { name: /post comment/i }));

    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith(
        '/interactions/comments',
        expect.objectContaining({ submissionId: 'sub-1', content: 'nice work' })
      )
    );

    // The old implementation never refetched, so a posted comment stayed
    // invisible until the component remounted.
    await waitFor(() => expect(apiClient.get.mock.calls.length).toBeGreaterThan(1));
  });
});
