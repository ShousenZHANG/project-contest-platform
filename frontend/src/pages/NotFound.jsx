/**
 * NotFound.jsx
 *
 * Catch-all for URLs that match no route. Without it, React Router rendered
 * nothing at all: a typo or a stale link produced the public layout wrapped
 * around an empty page, with no indication that anything had gone wrong.
 */

import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Compass, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

function NotFound() {
  useDocumentTitle('Page not found');
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6 py-16">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Compass className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        </div>

        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          404
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          We couldn&apos;t find that page
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Nothing is served at{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
            {pathname}
          </code>
          . It may have moved, or the link that brought you here may be out of date.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go back
          </Button>
          <Button asChild>
            <Link to="/">
              <Home className="mr-2 h-4 w-4" />
              Back to home
            </Link>
          </Button>
        </div>

        <p className="mt-8 text-xs text-muted-foreground">
          Looking for a competition?{' '}
          <Link to="/contest-list" className="underline hover:text-foreground">
            Browse all contests
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

export default NotFound;
