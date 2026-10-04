import React, { StrictMode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import OAuthCallback from '../pages/OAuthCallback';
import { useAuth } from '../context/AuthContext';

jest.mock('../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('sonner', () => ({ toast: { error: jest.fn() } }));

const login = jest.fn();

function SignInDestination() {
  const location = useLocation();
  return <div role="alert">{location.state?.oauthError || 'Password sign-in'}</div>;
}

function renderCallback(url) {
  window.history.replaceState({ retained: true }, '', url);
  return render(<StrictMode><MemoryRouter initialEntries={['/oauth/callback']}><Routes>
    <Route path="/oauth/callback" element={<OAuthCallback />} />
    <Route path="/login" element={<SignInDestination />} />
    <Route path="/judge" element={<h1>Judge destination</h1>} />
  </Routes></MemoryRouter></StrictMode>);
}

beforeEach(() => {
  jest.clearAllMocks();
  useAuth.mockReturnValue({ login });
});
afterEach(() => window.history.replaceState(null, '', '/'));

it('prioritizes a fragment business error over stale query credentials and creates no session', async () => {
  renderCallback('/oauth/callback?token=old-token&email=old%40example.com&role=Judge&userId=old#error=Use%20password%20sign-in');
  expect(await screen.findByRole('alert')).toHaveTextContent('Use password sign-in');
  expect(login).not.toHaveBeenCalled();
  expect(window.location.search).toBe('');
  expect(window.location.hash).toBe('');
  expect(window.history.state).toEqual({ retained: true });
});

it('rejects an empty error fragment even when the query contains complete credentials', async () => {
  renderCallback('/oauth/callback?token=old-token&email=old%40example.com&role=Judge&userId=old#error=');
  expect(await screen.findByRole('alert')).toHaveTextContent('OAuth sign-in could not be completed.');
  expect(login).not.toHaveBeenCalled();
});

it.each([
  '/oauth/callback#token=callback-token&email=judge%40example.com&role=Judge&userId=judge-1',
  '/oauth/callback?token=callback-token&email=judge%40example.com&role=JUDGE&userId=judge-1',
])('consumes a supported successful callback once and clears credentials: %s', async (url) => {
  renderCallback(url);
  expect(await screen.findByRole('heading', { name: 'Judge destination' })).toBeInTheDocument();
  await waitFor(() => expect(login).toHaveBeenCalledTimes(1));
  expect(login).toHaveBeenCalledWith({ userId: 'judge-1', email: 'judge@example.com', role: 'JUDGE', accessToken: 'callback-token' });
  expect(window.location.search).toBe('');
  expect(window.location.hash).toBe('');
});
