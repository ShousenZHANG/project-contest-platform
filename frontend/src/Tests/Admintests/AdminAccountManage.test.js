import React from 'react';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import AdminAccountManage from '../../Admin/AdminAccountManage';
import { renderWithProviders } from '../testUtils';
import apiClient from '../../api/apiClient';

jest.mock('../../api/apiClient');

beforeAll(() => {
  Storage.prototype.getItem = jest.fn((key) => {
    if (key === 'email') return 'admin@example.com';
    if (key === 'token') return 'admin-token';
    if (key === 'userId') return 'admin-id';
    if (key === 'role') return 'admin';
    return null;
  });
});

beforeEach(() => {
  apiClient.get.mockResolvedValue({
    data: {
      data: [
        {
          id: 'user-1',
          name: 'Test User',
          email: 'testuser@example.com',
          description: 'A test user',
          role: 'PARTICIPANT',
        },
      ],
      pages: 1,
      total: 1,
    },
  });

  apiClient.delete.mockResolvedValue({ data: { message: 'User deleted successfully.' } });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('AdminAccountManage', () => {
  it('provisions a judge through the administrator endpoint without changing the admin session', async () => {
    apiClient.post.mockResolvedValue({ data: { id: 'judge-1', name: 'New Judge', role: 'Judge' } });
    renderWithProviders(<AdminAccountManage />);
    fireEvent.click(screen.getByRole('button', { name: 'Create judge' }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'New Judge' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'judge@example.com' } });
    fireEvent.change(screen.getByLabelText('Temporary password'), {
      target: { value: 'TestingPassword1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith('/users/admin/accounts', {
        name: 'New Judge',
        email: 'judge@example.com',
        password: 'TestingPassword1',
        role: 'JUDGE',
      }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(localStorage.getItem('token')).toBe('admin-token');
  });

  it('keeps provisioning fields when the server reports a duplicate email', async () => {
    apiClient.post.mockRejectedValue(new Error('Email is already registered.'));
    renderWithProviders(<AdminAccountManage />);
    fireEvent.click(screen.getByRole('button', { name: 'Create judge' }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'New Judge' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'judge@example.com' } });
    fireEvent.change(screen.getByLabelText('Temporary password'), {
      target: { value: 'TestingPassword1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Email is already registered.');
    expect(screen.getByLabelText('Email')).toHaveValue('judge@example.com');
  });
  it('renders and shows loading initially', async () => {
    renderWithProviders(<AdminAccountManage />);

    expect(screen.getByText(/Loading users.../i)).toBeInTheDocument();

    await screen.findByText(/All Users/i);
  });

  it('renders user data after fetch', async () => {
    renderWithProviders(<AdminAccountManage />);

    await screen.findByText('Test User');
    const rows = await screen.findAllByRole('row');
    const userRow = rows.find((row) => within(row).queryByText('Test User'));

    expect(userRow).toBeTruthy();
    expect(within(userRow).getByText('Test User')).toBeInTheDocument();
    expect(within(userRow).getByText('testuser@example.com')).toBeInTheDocument();
    expect(within(userRow).getByText('A test user')).toBeInTheDocument();
    expect(within(userRow).getByText('PARTICIPANT')).toBeInTheDocument();
  });

  it('deletes a user after confirmation', async () => {
    renderWithProviders(<AdminAccountManage />);

    const deleteButton = await screen.findByRole('button', { name: /Delete/i });
    fireEvent.click(deleteButton);
    fireEvent.click(await screen.findByRole('button', { name: /Delete user/i }));

    // The mutation dispatches asynchronously, so the call lands a tick later.
    await waitFor(() =>
      expect(apiClient.delete).toHaveBeenCalledWith(expect.stringContaining('/users/user-1')),
    );
  });
});
