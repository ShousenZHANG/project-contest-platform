import React from 'react';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../testUtils';
import SubmissionRatings from '../../Organizer/SubmissionRatings';
import apiClient from '../../api/apiClient';

jest.mock('../../api/apiClient');
const eligibility = {
  competitionId: 'comp-1',
  isPublic: true,
  status: 'COMPLETED',
  canAward: true,
  minimumJudgeCount: 3,
  approvedCount: 1,
  eligibleCount: 1,
  blockers: [],
  submissions: [
    {
      submissionId: 'sub-1',
      title: 'Nebula Entry',
      judgeCount: 3,
      totalScore: 8.2,
      eligible: true,
      blockers: [],
      criterionScores: { Innovation: 8.2 },
    },
  ],
};
const renderPage = () =>
  renderWithProviders(<SubmissionRatings />, {
    route: '/submissions/comp-1/ratings',
    routePath: '/submissions/:competitionId/ratings',
  });
beforeEach(() => {
  jest.clearAllMocks();
  apiClient.get.mockResolvedValue({ data: eligibility });
  apiClient.post.mockResolvedValue({ data: {} });
});

it('renders server readiness including all approved submissions', async () => {
  renderPage();
  const card = await screen.findByRole('article', { name: 'Award eligibility for Nebula Entry' });
  expect(within(card).getByText('3 / 3')).toBeInTheDocument();
  expect(apiClient.get).toHaveBeenCalledWith('/winners/eligibility', {
    params: { competitionId: 'comp-1' },
  });
});

it('requires confirmation before publishing and disables a pending award', async () => {
  apiClient.post.mockImplementation(() => new Promise(() => {}));
  renderPage();
  fireEvent.click(await screen.findByRole('button', { name: 'Auto Award Winners' }));
  expect(apiClient.post).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Publish awards' }));
  await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(1));
  expect(screen.getByRole('button', { name: 'Processing…' })).toBeDisabled();
  expect(apiClient.post).toHaveBeenCalledWith('/winners/auto-award', null, {
    params: { competitionId: 'comp-1' },
  });
});

it('shows under-scored works and keeps awarding disabled', async () => {
  apiClient.get.mockResolvedValue({
    data: {
      ...eligibility,
      canAward: false,
      eligibleCount: 0,
      blockers: ['One approved work needs 3 valid judges.'],
      submissions: [
        {
          ...eligibility.submissions[0],
          judgeCount: 2,
          eligible: false,
          blockers: ['One more judge is needed.'],
        },
      ],
    },
  });
  renderPage();
  const card = await screen.findByRole('article', { name: 'Award eligibility for Nebula Entry' });
  expect(within(card).getByText('One more judge is needed.')).toBeInTheDocument();
  expect(within(card).getByText('2 / 3')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Auto Award Winners' })).toBeDisabled();
});

it('surfaces the actual conflict and refreshes readiness after failed awarding', async () => {
  apiClient.post.mockRejectedValue(new Error('A judge assignment changed.'));
  renderPage();
  fireEvent.click(await screen.findByRole('button', { name: 'Auto Award Winners' }));
  fireEvent.click(screen.getByRole('button', { name: 'Publish awards' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('A judge assignment changed.');
  await waitFor(() => expect(apiClient.get.mock.calls.length).toBeGreaterThan(1));
});

it('links to published results without allowing awards again', async () => {
  apiClient.get.mockResolvedValue({ data: { ...eligibility, status: 'AWARDED', canAward: false } });
  renderPage();
  expect(await screen.findByRole('link', { name: 'View published results' })).toHaveAttribute(
    'href',
    '/results/comp-1',
  );
  expect(screen.getByRole('button', { name: 'Auto Award Winners' })).toBeDisabled();
  expect(screen.getByRole('link', { name: 'Back to Submissions List' })).toHaveAttribute(
    'href',
    '/OrganizerSubmissions/comp-1',
  );
});

it('reads private finalized awards through the managed endpoint and hides public sharing', async () => {
  apiClient.get.mockImplementation((url) => Promise.resolve({ data: url === '/winners/eligibility'
    ? { ...eligibility, isPublic: false, status: 'AWARDED', canAward: false }
    : { data: [{ submissionId: 'sub-1', title: 'Private award', submitterName: 'Private author', awards: ['Champion'], totalScore: 8.2 }], total: 1, page: 1, pages: 1 } }));
  renderPage();
  expect(await screen.findByText('Private award')).toBeInTheDocument();
  expect(screen.getByText('Private author')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'View published results' })).not.toBeInTheDocument();
  expect(apiClient.get).toHaveBeenCalledWith('/winners/list', { params: { competitionId: 'comp-1', page: 1, size: 12 } });
  expect(apiClient.get.mock.calls.some(([url]) => url === '/winners/public-list')).toBe(false);
});
