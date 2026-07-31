import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import NotFound from '../pages/NotFound';
import { renderWithProviders } from './testUtils';

describe('NotFound', () => {
  it('names the path that produced nothing', () => {
    renderWithProviders(<NotFound />, { route: '/totally-made-up' });

    expect(screen.getByText(/We couldn't find that page/i)).toBeInTheDocument();
    expect(screen.getByText('/totally-made-up')).toBeInTheDocument();
  });

  it('offers a way out', () => {
    renderWithProviders(<NotFound />, { route: '/nope' });

    expect(screen.getByRole('link', { name: /back to home/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /browse all contests/i })).toHaveAttribute(
      'href',
      '/contest-list'
    );
    expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
  });
});

describe('catch-all routing', () => {
  /**
   * Mirrors the shape App.jsx uses: a wildcard nested inside the public layout
   * group, declared before the authenticated groups. React Router ranks by
   * specificity rather than declaration order, so a real route must still win.
   */
  function Harness({ initialPath }) {
    return (
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route element={<div data-testid="public-layout"><Outlet /></div>}>
            <Route path="/" element={<p>home</p>} />
            <Route path="/contest-list" element={<p>catalogue</p>} />
            <Route path="*" element={<NotFound />} />
          </Route>
          <Route path="/AdminDashboard" element={<p>admin dashboard</p>} />
        </Routes>
      </MemoryRouter>
    );
  }

  it('does not swallow a route declared after it', () => {
    render(<Harness initialPath="/AdminDashboard" />);
    expect(screen.getByText('admin dashboard')).toBeInTheDocument();
  });

  it('does not swallow a route declared beside it', () => {
    render(<Harness initialPath="/contest-list" />);
    expect(screen.getByText('catalogue')).toBeInTheDocument();
  });

  it('catches an unknown path', () => {
    render(<Harness initialPath="/privacy-policy" />);
    expect(screen.getByText(/We couldn't find that page/i)).toBeInTheDocument();
  });
});
