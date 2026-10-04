import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import ComentsPage from '../../PublicUser/ComentsPage';
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
