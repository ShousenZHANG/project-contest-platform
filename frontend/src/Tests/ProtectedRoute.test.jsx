import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import { useAuth } from '../context/AuthContext';

jest.mock('../context/AuthContext', () => ({ useAuth: jest.fn() }));

/**
 * The role string reaching this guard has three spellings in the wild: the
 * database stores TitleCase ("Participant"), the OAuth entry points pass
 * uppercase, and older fixtures use lowercase. An exact-match comparison sends
 * the user to the homepage with nothing rendered and nothing logged, which is
 * the hardest kind of bug to report — so the comparison is case-insensitive and
 * these tests keep it that way.
 */
describe('ProtectedRoute', () => {
  function renderAt(initialPath = '/secret') {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/" element={<div>home</div>} />
          <Route path="/login" element={<div>login</div>} />
          <Route
            path="/secret"
            element={
              <ProtectedRoute roles={['Participant']}>
                <div>secret page</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );
  }

  it('sends an unauthenticated visitor to the login page', () => {
    useAuth.mockReturnValue({ isAuthenticated: false, user: null });

    renderAt();

    expect(screen.getByText('login')).toBeInTheDocument();
    expect(screen.queryByText('secret page')).not.toBeInTheDocument();
  });

  it.each(['Participant', 'PARTICIPANT', 'participant'])(
    'admits a participant whose role arrives as %s',
    (role) => {
      useAuth.mockReturnValue({ isAuthenticated: true, user: { role } });

      renderAt();

      expect(screen.getByText('secret page')).toBeInTheDocument();
    }
  );

  it('sends an authenticated user without the role to the homepage', () => {
    useAuth.mockReturnValue({ isAuthenticated: true, user: { role: 'Organizer' } });

    renderAt();

    expect(screen.getByText('home')).toBeInTheDocument();
    expect(screen.queryByText('secret page')).not.toBeInTheDocument();
  });

  it('treats a missing role as unauthorised rather than throwing', () => {
    useAuth.mockReturnValue({ isAuthenticated: true, user: null });

    renderAt();

    expect(screen.getByText('home')).toBeInTheDocument();
  });

  it('renders the route unguarded when no roles are required', () => {
    useAuth.mockReturnValue({ isAuthenticated: true, user: { role: 'Judge' } });

    render(
      <MemoryRouter initialEntries={['/open']}>
        <Routes>
          <Route
            path="/open"
            element={
              <ProtectedRoute>
                <div>open page</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('open page')).toBeInTheDocument();
  });
});
