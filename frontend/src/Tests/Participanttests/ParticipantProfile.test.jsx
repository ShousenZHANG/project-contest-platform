import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import Profile from '../../Participant/profile/Profile';
import { renderWithProviders } from '../testUtils';
import apiClient from '../../api/apiClient';

jest.mock('../../api/apiClient');

beforeEach(() => {
  Storage.prototype.getItem = jest.fn((key) => {
    if (key === 'token') return 'fake-token';
    if (key === 'userId') return 'user-1';
    if (key === 'role') return 'Participant';
    if (key === 'email') return 'p@example.com';
    return null;
  });

  apiClient.get.mockResolvedValue({
    data: {
      name: 'Pat Participant',
      email: 'p@example.com',
      description: 'Loves hackathons',
      avatarUrl: '/avatar.png',
    },
  });
  apiClient.put.mockResolvedValue({ data: {} });

  window.URL.createObjectURL = jest.fn(() => 'blob:fake');
  window.URL.revokeObjectURL = jest.fn();
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('Participant Profile', () => {
  it('seeds the form from the fetched profile', async () => {
    renderWithProviders(<Profile />);

    expect(await screen.findByDisplayValue('Pat Participant')).toBeInTheDocument();
    expect(screen.getByDisplayValue('p@example.com')).toBeInTheDocument();
  });

  it('submits the edited profile', async () => {
    renderWithProviders(<Profile />);

    const nameInput = await screen.findByDisplayValue('Pat Participant');
    fireEvent.change(nameInput, { target: { value: 'Pat Updated' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(apiClient.put).toHaveBeenCalledWith(
        '/users/profile',
        expect.objectContaining({ name: 'Pat Updated' })
      )
    );
  });

  it('does not let a background refetch overwrite an edit in progress', async () => {
    const { queryClient } = renderWithProviders(<Profile />);

    const nameInput = await screen.findByDisplayValue('Pat Participant');
    fireEvent.change(nameInput, { target: { value: 'Half-typed name' } });

    // Simulate the profile arriving again, as refetch-on-focus would.
    apiClient.get.mockResolvedValue({
      data: { name: 'Pat Participant', email: 'p@example.com', description: '', avatarUrl: '' },
    });
    await queryClient.refetchQueries();

    await waitFor(() =>
      expect(screen.getByDisplayValue('Half-typed name')).toBeInTheDocument()
    );
  });
});
