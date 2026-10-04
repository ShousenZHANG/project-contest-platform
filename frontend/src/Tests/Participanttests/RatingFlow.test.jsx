import React from 'react';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import JudgeSubmissions from '../../Participant/JudgeSubmissions';
import RatingDetail from '../../Participant/RatingDetail';
import ReRating from '../../Participant/ReRating';
import { renderWithProviders } from '../testUtils';
import apiClient from '../../api/apiClient';

jest.mock('../../api/apiClient');
const context = {
  id: 'sub-1',
  competitionId: 'comp-1',
  title: 'Nebula Entry',
  description: 'Our project',
  reviewStatus: 'APPROVED',
  competitionStatus: 'COMPLETED',
  canScore: true,
  hasScored: false,
  scoringCriteria: ['Originality', 'Execution'],
};
const persisted = {
  submissionId: 'sub-1',
  judgeComments: 'solid work',
  totalScore: 7.5,
  scores: [
    { criterion: 'Originality', score: 8 },
    { criterion: 'Execution', score: 7 },
  ],
};
const renderScore = (revision = false) =>
  renderWithProviders(revision ? <ReRating /> : <RatingDetail />, {
    route: '/RatingDetail/comp-1/sub-1',
    routePath: '/RatingDetail/:competitionId/:submissionId',
  });
beforeEach(() => {
  jest.clearAllMocks();
  apiClient.get.mockImplementation((url) =>
    Promise.resolve({
      data:
        url === '/judges/submissions/sub-1'
          ? context
          : url === '/judges/sub-1/detail'
            ? persisted
            : { data: [{ id: 'sub-1', title: 'Nebula Entry' }], pages: 1 },
    }),
  );
  apiClient.post.mockResolvedValue({ data: 'ok' });
  apiClient.put.mockResolvedValue({ data: 'ok' });
});

it('reads the assigned queue and labels pagination', async () => {
  renderWithProviders(<JudgeSubmissions />, {
    route: '/JudgeSubmissions/comp-1',
    routePath: '/JudgeSubmissions/:competitionId',
  });
  expect(await screen.findByText('Nebula Entry')).toBeInTheDocument();
  expect(apiClient.get).toHaveBeenCalledWith(
    '/judges/pending-submissions',
    expect.objectContaining({
      params: expect.objectContaining({ competitionId: 'comp-1', page: 1, size: 10 }),
    }),
  );
  expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
});

it('sends only criterion scores and reads back persisted values', async () => {
  renderScore();
  await screen.findByLabelText('Originality');
  fireEvent.change(screen.getByLabelText('Originality'), { target: { value: '9.2' } });
  fireEvent.click(screen.getByRole('button', { name: 'Submit rating' }));
  await screen.findByText(/Rating saved/);
  expect(apiClient.post).toHaveBeenCalledWith('/judges/score', {
    competitionId: 'comp-1',
    submissionId: 'sub-1',
    judgeComments: '',
    scores: [
      { criterion: 'Originality', score: 9.2 },
      { criterion: 'Execution', score: 5 },
    ],
  });
  expect(screen.getByLabelText('Originality')).toHaveValue(8);
  expect(screen.getByText(/7.50 \/ 10/)).toBeInTheDocument();
});

it('seeds an existing score and PUTs a revision', async () => {
  apiClient.get.mockImplementation((url) =>
    Promise.resolve({
      data: url === '/judges/submissions/sub-1' ? { ...context, hasScored: true } : persisted,
    }),
  );
  renderScore(true);
  expect(await screen.findByDisplayValue('solid work')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Update rating' }));
  await waitFor(() =>
    expect(apiClient.put).toHaveBeenCalledWith('/judges/sub-1', {
      competitionId: 'comp-1',
      submissionId: 'sub-1',
      judgeComments: 'solid work',
      scores: [
        { criterion: 'Originality', score: 8 },
        { criterion: 'Execution', score: 7 },
      ],
    }),
  );
});

it('preserves edits on failure, disables repeated submission, and allows retry', async () => {
  let rejectWrite;
  apiClient.post.mockImplementationOnce(
    () =>
      new Promise((_resolve, reject) => {
        rejectWrite = reject;
      }),
  );
  renderScore();
  await screen.findByLabelText('Originality');
  fireEvent.change(screen.getByLabelText('Feedback'), { target: { value: 'Keep my notes' } });
  fireEvent.change(screen.getByLabelText('Originality'), { target: { value: '9' } });
  fireEvent.click(screen.getByRole('button', { name: 'Submit rating' }));
  expect(await screen.findByRole('button', { name: 'Saving rating…' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Saving rating…' }));
  expect(apiClient.post).toHaveBeenCalledTimes(1);
  await act(async () => rejectWrite(new Error('Temporary failure')));
  expect(await screen.findByRole('alert')).toHaveTextContent('Temporary failure');
  expect(screen.getByLabelText('Originality')).toHaveValue(9);
  expect(screen.getByLabelText('Feedback')).toHaveValue('Keep my notes');
  fireEvent.click(screen.getByRole('button', { name: 'Submit rating' }));
  await screen.findByText(/Rating saved/);
  expect(apiClient.post).toHaveBeenCalledTimes(2);
});

it('blocks out of range scores and closed scoring', async () => {
  renderScore();
  await screen.findByLabelText('Originality');
  fireEvent.change(screen.getByLabelText('Originality'), { target: { value: '10.1' } });
  expect(screen.getByRole('button', { name: 'Submit rating' })).toBeDisabled();
  expect(apiClient.post).not.toHaveBeenCalled();
});

it('retries failed readback without writing a second rating', async () => {
  let reads = 0;
  apiClient.get.mockImplementation((url) => {
    if (url === '/judges/submissions/sub-1') return Promise.resolve({ data: context });
    reads += 1;
    return reads === 1
      ? Promise.reject(new Error('Read temporarily unavailable'))
      : Promise.resolve({ data: persisted });
  });
  renderScore();
  await screen.findByLabelText('Originality');
  fireEvent.change(screen.getByLabelText('Feedback'), { target: { value: 'Preserved notes' } });
  fireEvent.click(screen.getByRole('button', { name: 'Submit rating' }));
  await screen.findByText(/Your rating was stored/);
  expect(screen.getByLabelText('Feedback')).toHaveValue('Preserved notes');
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await screen.findByText(/Rating saved/);
  expect(apiClient.post).toHaveBeenCalledTimes(1);
  expect(apiClient.put).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Originality')).toHaveValue(8);
});

it('shows fetch failure with a retry instead of an empty score form', async () => {
  apiClient.get.mockRejectedValueOnce(new Error('Permission revoked'));
  renderScore();
  expect(await screen.findByRole('alert')).toHaveTextContent('Permission revoked');
  expect(screen.queryByRole('button', { name: 'Submit rating' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await screen.findByLabelText('Originality');
});

it('reads awarded work without enabling score writes', async () => {
  apiClient.get.mockImplementation((url) =>
    Promise.resolve({
      data:
        url === '/judges/submissions/sub-1'
          ? { ...context, canScore: false, competitionStatus: 'AWARDED' }
          : persisted,
    }),
  );
  renderScore();
  expect(await screen.findByText(/Scoring is closed/)).toBeInTheDocument();
  expect(screen.getByLabelText('Originality')).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Submit rating' })).toBeDisabled();
});

it('starts a fresh 0–10 score for an obsolete file even through the revision link', async () => {
  apiClient.get.mockImplementation((url) =>
    Promise.resolve({
      data:
        url === '/judges/submissions/sub-1'
          ? { ...context, hasScored: false, requiresRescore: true, revision: 2 }
          : persisted,
    }),
  );
  renderScore(true);
  await screen.findByText(/new score after a file or scoring-rule update/);
  expect(screen.getByLabelText('Originality')).toHaveValue(5);
  expect(apiClient.get).not.toHaveBeenCalledWith('/judges/sub-1/detail');
  fireEvent.click(screen.getByRole('button', { name: 'Submit rating' }));
  await screen.findByText(/Rating saved/);
  expect(apiClient.post).toHaveBeenCalledTimes(1);
  expect(apiClient.put).not.toHaveBeenCalled();
});

it('never seeds legacy 0–100 scores when detail requires a rescore', async () => {
  apiClient.get.mockImplementation((url) =>
    Promise.resolve({
      data:
        url === '/judges/submissions/sub-1'
          ? { ...context, hasScored: true }
          : {
              ...persisted,
              requiresRescore: true,
              totalScore: null,
              scores: [
                { criterion: 'Originality', score: 95 },
                { criterion: 'Execution', score: 90 },
              ],
            },
    }),
  );
  renderScore(true);
  await screen.findByText(/new score after a file or scoring-rule update/);
  expect(screen.getByLabelText('Originality')).toHaveValue(5);
  expect(screen.getByLabelText('Execution')).toHaveValue(5);
});
