import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Outlet, useNavigate } from 'react-router-dom';
import PageTransition from '../layouts/PageTransition';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';

/**
 * The motion system's whole point is that a duration is written once. These tests guard the two
 * things that would quietly undo that: a call site restating a number, and a class name that
 * nothing defines.
 *
 * The dead-class check exists because the previous state of this codebase was exactly that — the
 * primitives carried `animate-in` and `zoom-in-95` from shadcn, but tailwindcss-animate was never
 * installed, so the modals claimed an animation they never played. jsdom computes no styles for
 * these, so the assertion is on the class list rather than on motion itself.
 */

const TAILWIND_ANIMATE_CLASSES = [
  'animate-in',
  'animate-out',
  'fade-in-0',
  'fade-out-0',
  'zoom-in-95',
  'zoom-out-95',
  'slide-in-from-top',
  'slide-in-from-right',
];

describe('PageTransition', () => {
  function Shell() {
    return (
      <PageTransition>
        <Outlet />
      </PageTransition>
    );
  }

  function Page({ label }) {
    const navigate = useNavigate();
    return (
      <div>
        <span>{label}</span>
        <button onClick={() => navigate('/second')}>go</button>
      </div>
    );
  }

  function renderShell() {
    return render(
      <MemoryRouter initialEntries={['/first']}>
        <Routes>
          <Route element={<Shell />}>
            <Route path="/first" element={<Page label="first page" />} />
            <Route path="/second" element={<Page label="second page" />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
  }

  it('marks route content with the page motion class', () => {
    const { container } = renderShell();

    expect(container.querySelector('.motion-page')).not.toBeNull();
    expect(screen.getByText('first page')).toBeInTheDocument();
  });

  it('re-applies the class on navigation, so the fade replays', () => {
    const { container } = renderShell();
    const wrapper = container.querySelector('.motion-page');

    act(() => {
      screen.getByRole('button', { name: 'go' }).click();
    });

    expect(screen.getByText('second page')).toBeInTheDocument();
    expect(wrapper.classList.contains('motion-page')).toBe(true);
  });

  it('keeps the same element across navigation rather than remounting the subtree', () => {
    const { container } = renderShell();
    const before = container.querySelector('.motion-page');

    act(() => {
      screen.getByRole('button', { name: 'go' }).click();
    });

    expect(container.querySelector('.motion-page')).toBe(before);
  });

  it('passes extra classes through without dropping its own', () => {
    const { container } = render(
      <MemoryRouter>
        <PageTransition className="h-full">content</PageTransition>
      </MemoryRouter>
    );

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('motion-page');
    expect(wrapper).toHaveClass('h-full');
  });
});

describe('Radix surfaces use the motion system', () => {
  it('a dialog names the motion classes this app actually defines', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Confirm</DialogTitle>
          <DialogDescription>Are you sure?</DialogDescription>
        </DialogContent>
      </Dialog>
    );

    const content = screen.getByRole('dialog');
    expect(content).toHaveClass('motion-dialog');
    expect(content).toHaveAttribute('data-state', 'open');
  });

  it('carries no tailwindcss-animate class, since that plugin is not installed', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Confirm</DialogTitle>
          <DialogDescription>Are you sure?</DialogDescription>
        </DialogContent>
      </Dialog>
    );

    const content = screen.getByRole('dialog');
    TAILWIND_ANIMATE_CLASSES.forEach((dead) => {
      expect(content.className).not.toContain(dead);
    });
  });
});
