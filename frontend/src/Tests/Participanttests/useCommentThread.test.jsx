import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { useCommentThread } from '../../shared/hooks/useCommentThread';
import { renderWithProviders } from '../testUtils';
import apiClient from '../../api/apiClient';

jest.mock('../../api/apiClient');

/** Minimal harness — the hook is the unit under test, not any particular page. */
function Harness({ submissionId = 'sub-1' }) {
  const { comments, totalPages, loading, error, postComment } =
    useCommentThread(submissionId);

  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="pages">{totalPages}</span>
      <span data-testid="error">{error || ''}</span>
      <ul>
        {comments.map((c) => (
          <li key={c.id}>{c.content}</li>
        ))}
      </ul>
      <button onClick={() => postComment('brand new').catch(() => {})}>post</button>
    </div>
  );
}

beforeEach(() => {
  apiClient.get.mockResolvedValue({
    data: {
      data: [{ id: 'c-1', content: 'existing comment', createdAt: '2026-01-01T00:00:00Z' }],
      pages: 3,
    },
  });
  apiClient.post.mockResolvedValue({ data: 'ok' });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('useCommentThread', () => {
  it('reads the thread from /interactions/comments/list', async () => {
    renderWithProviders(<Harness />);

    expect(await screen.findByText('existing comment')).toBeInTheDocument();
    expect(screen.getByTestId('pages')).toHaveTextContent('3');

    expect(apiClient.get).toHaveBeenCalledWith(
      '/interactions/comments/list',
      expect.objectContaining({
        params: expect.objectContaining({ submissionId: 'sub-1', page: 1, size: 5 }),
      })
    );
  });

  it('shows a new comment before the request resolves', async () => {
    let release;
    apiClient.post.mockReturnValue(new Promise((resolve) => { release = resolve; }));

    renderWithProviders(<Harness />);
    await screen.findByText('existing comment');

    fireEvent.click(screen.getByText('post'));

    expect(await screen.findByText('brand new')).toBeInTheDocument();
    release({ data: 'ok' });
  });

  it('removes the optimistic comment when posting fails', async () => {
    apiClient.post.mockRejectedValue(new Error('nope'));

    renderWithProviders(<Harness />);
    await screen.findByText('existing comment');

    fireEvent.click(screen.getByText('post'));

    await waitFor(() => expect(screen.queryByText('brand new')).not.toBeInTheDocument());
    expect(screen.getByText('existing comment')).toBeInTheDocument();
  });

  it('does not fetch without a submission id', async () => {
    renderWithProviders(<Harness submissionId="" />);
    await waitFor(() => expect(apiClient.get).not.toHaveBeenCalled());
  });
});
