import React from 'react';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import OrganizerContestList from '../../Organizer/ContestList';
import { renderWithProviders } from '../testUtils';
import apiClient from '../../api/apiClient';

jest.mock('../../api/apiClient');

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

beforeEach(() => {
  apiClient.get.mockResolvedValue({
    data: {
      data: [
        {
          id: '1',
          name: 'Mock Contest',
          category: 'Art',
          status: 'UPCOMING',
          startDate: '2025-05-01T00:00:00Z',
          endDate: '2025-05-10T00:00:00Z',
          participationType: 'INDIVIDUAL',
        },
      ],
    },
  });

  mockNavigate.mockClear();
});

afterEach(() => {
  jest.clearAllMocks();
});

const renderWithRouter = () => renderWithProviders(<OrganizerContestList />);

describe('OrganizerContestList', () => {
  it('renders contest list after fetch', async () => {
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByText('Mock Contest')).toBeInTheDocument();
    });
  });

  it('filters contests based on search input', async () => {
    apiClient.get.mockImplementation((_url, config) =>
      Promise.resolve({
        data: {
          data: config.params.keyword
            ? []
            : [{ id: '1', name: 'Mock Contest', status: 'UPCOMING' }],
          total: config.params.keyword ? 0 : 1,
          pages: 1,
        },
      }),
    );
    renderWithRouter();
    await waitFor(() => screen.getByText('Mock Contest'));

    const searchInput = screen.getByPlaceholderText('Search by name...');
    fireEvent.change(searchInput, { target: { value: 'Nonexistent' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search', exact: true }));

    await waitFor(() => {
      expect(screen.queryByText('Mock Contest')).not.toBeInTheDocument();
    });
    expect(apiClient.get).toHaveBeenLastCalledWith('/competitions/achieve/my', {
      params: { page: 1, size: 10, keyword: 'Nonexistent' },
    });
  });

  it('navigates to create new contest page', async () => {
    renderWithRouter();
    const createButton = await screen.findByRole('button', { name: /New Competition/i });
    fireEvent.click(createButton);

    expect(mockNavigate).toHaveBeenCalledWith('/OrganizerContest/null');
  });
});

it('uses all 27 server results, page numbers and URL filters rather than first-page filtering', async () => {
  apiClient.get.mockImplementation((_url, config) =>
    Promise.resolve({
      data: {
        data: [
          {
            id: String(config.params.page),
            name: config.params.page === 2 ? 'My Contest 11' : 'My Contest 1',
            category: 'Programming & Technology',
            status: 'UPCOMING',
            participationType: 'TEAM',
          },
        ],
        total: 27,
        pages: 3,
        page: config.params.page,
      },
    }),
  );
  renderWithProviders(<OrganizerContestList />, {
    route: '/OrganizerContestList/org@example.com?participationType=TEAM',
  });
  await screen.findByText('My Contest 1');
  expect(screen.getByRole('status')).toHaveTextContent('27 results');
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
  await screen.findByText('My Contest 11');
  expect(apiClient.get).toHaveBeenLastCalledWith('/competitions/achieve/my', {
    params: { page: 2, size: 10, participationType: 'TEAM' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Filter', exact: true }));
  fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'COMPLETED' } });
  await waitFor(() =>
    expect(apiClient.get).toHaveBeenLastCalledWith('/competitions/achieve/my', {
      params: { page: 1, size: 10, status: 'COMPLETED', participationType: 'TEAM' },
    }),
  );
});

it('changes lifecycle only after confirmation and sends the server status', async () => {
  apiClient.put.mockResolvedValue({ data: { success: true } });
  renderWithRouter();
  await screen.findByText('Mock Contest');
  fireEvent.click(screen.getByRole('button', { name: 'Start competition' }));
  expect(apiClient.put).not.toHaveBeenCalled();
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
  // Cancel keeps the server status unchanged.
  expect(apiClient.put).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Start competition' }));
  fireEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: 'Start competition' }),
  );
  await waitFor(() =>
    expect(apiClient.put).toHaveBeenCalledWith('/competitions/update/1', { status: 'ONGOING' }),
  );
});
