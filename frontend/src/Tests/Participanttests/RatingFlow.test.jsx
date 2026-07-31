import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import JudgeSubmissions from '../../Participant/JudgeSubmissions';
import RatingDetail from '../../Participant/RatingDetail';
import ReRating from '../../Participant/ReRating';
import { renderWithProviders } from '../testUtils';
import apiClient from '../../api/apiClient';

jest.mock('../../api/apiClient');

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

afterEach(() => {
  jest.clearAllMocks();
});

describe('JudgeSubmissions', () => {
  beforeEach(() => {
    apiClient.get.mockResolvedValue({
      data: { data: [{ id: 'sub-1', title: 'Nebula Entry' }], pages: 1 },
    });
  });

  it('reads pending submissions with the competition as a param', async () => {
    renderWithProviders(<JudgeSubmissions />, {
      route: '/JudgeSubmissions/comp-1',
      routePath: '/JudgeSubmissions/:competitionId',
    });

    expect(await screen.findByText('Nebula Entry')).toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalledWith(
      '/judges/pending-submissions',
      expect.objectContaining({
        params: expect.objectContaining({ competitionId: 'comp-1', page: 1, size: 10 }),
      })
    );
  });
});

describe('RatingDetail', () => {
  beforeEach(() => {
    apiClient.get.mockResolvedValue({
      data: { scoringCriteria: ['Originality', 'Execution'] },
    });
    apiClient.post.mockResolvedValue({ data: 'ok' });
  });

  it('posts the score to /judges/score with the id in the body', async () => {
    renderWithProviders(<RatingDetail />, {
      route: '/RatingDetail/comp-1/sub-1',
      routePath: '/RatingDetail/:competitionId/:submissionId',
    });

    await screen.findByText(/Originality/i);
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith(
        '/judges/score',
        expect.objectContaining({
          competitionId: 'comp-1',
          submissionId: 'sub-1',
          scores: [
            { criterion: 'Originality', score: 5, weight: 0.5 },
            { criterion: 'Execution', score: 5, weight: 0.5 },
          ],
        })
      )
    );
  });
});

describe('ReRating', () => {
  beforeEach(() => {
    apiClient.get.mockResolvedValue({
      data: {
        judgeComments: 'solid work',
        scores: [{ criterion: 'Originality', score: 8, weight: 1 }],
      },
    });
    apiClient.put.mockResolvedValue({ data: 'ok' });
  });

  it('seeds from the existing review and PUTs the revision', async () => {
    renderWithProviders(<ReRating />, {
      route: '/ReRating/comp-1/sub-1',
      routePath: '/ReRating/:competitionId/:submissionId',
    });

    expect(await screen.findByDisplayValue('solid work')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /submit|update/i }));

    await waitFor(() =>
      expect(apiClient.put).toHaveBeenCalledWith(
        '/judges/sub-1',
        expect.objectContaining({
          submissionId: 'sub-1',
          judgeComments: 'solid work',
          scores: [{ criterion: 'Originality', score: 8, weight: 1 }],
        })
      )
    );
  });
});
