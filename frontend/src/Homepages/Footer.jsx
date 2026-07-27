/**
 * Footer.jsx
 *
 * Public homepage footer. Migrated from MUI/CSS to shadcn/ui + Tailwind.
 * Uses lucide icons in place of fa-* font icons.
 *
 * Internal destinations use react-router <Link> so navigation stays client-side;
 * every link here points at a route that actually exists in App.jsx.
 *
 * Developer: Beiqi Dai (migrated)
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Home, BookOpen } from 'lucide-react';
import { Separator } from '../components/ui/separator';

const REPO_URL = 'https://github.com/ShousenZHANG/project-contest-platform';

// Inline SVG — GitHub isn't exported in the installed lucide-react version.
function GithubIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.26.82-.577 0-.285-.01-1.04-.015-2.04-3.338.725-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.082-.73.082-.73 1.205.085 1.838 1.237 1.838 1.237 1.07 1.835 2.807 1.305 3.492.998.108-.776.42-1.305.763-1.605-2.665-.305-5.467-1.332-5.467-5.93 0-1.31.467-2.382 1.235-3.222-.123-.303-.535-1.524.117-3.176 0 0 1.008-.323 3.3 1.23a11.5 11.5 0 0 1 3.003-.404c1.018.005 2.043.138 3.003.404 2.29-1.553 3.297-1.23 3.297-1.23.653 1.652.24 2.873.118 3.176.77.84 1.233 1.912 1.233 3.222 0 4.61-2.806 5.622-5.48 5.92.43.37.812 1.102.812 2.222 0 1.605-.014 2.898-.014 3.293 0 .32.216.694.825.576C20.565 21.795 24 17.297 24 12c0-6.63-5.373-12-12-12z" />
    </svg>
  );
}

const columns = [
  {
    title: 'Questora',
    Icon: Home,
    links: [
      { label: 'Home', to: '/' },
      { label: 'Browse Contests', to: '/contest-list' },
      { label: 'Sign in', to: '/login' },
    ],
  },
  {
    title: 'Contests',
    Icon: Trophy,
    links: [
      { label: 'All Contests', to: '/contest-list' },
      { label: 'Submission Gallery', to: '/work-list' },
    ],
  },
  {
    title: 'Resources',
    Icon: BookOpen,
    links: [
      { label: 'How to Participate', to: '/how-to-use' },
      { label: 'Source Code', href: REPO_URL },
    ],
  },
];

function FooterLink({ link }) {
  const className = 'hover:text-foreground transition-colors';

  if (link.href) {
    return (
      <a href={link.href} target="_blank" rel="noopener noreferrer" className={className}>
        {link.label}
      </a>
    );
  }

  return (
    <Link to={link.to} className={className}>
      {link.label}
    </Link>
  );
}

function Footer() {
  return (
    <footer className="relative isolate overflow-hidden border-t border-border/60 bg-background">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-50 via-background to-purple-50 dark:from-indigo-950/40 dark:via-background dark:to-purple-950/40"
      />

      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 mb-12">
          {columns.map(({ title, Icon, links }) => (
            <div key={title} className="space-y-4">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                  <Icon className="h-4 w-4" />
                </span>
                <span>{title}</span>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {links.map((link) => (
                  <li key={link.label}>
                    <FooterLink link={link} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Questora · Open source under the MIT License
          </p>

          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Questora on GitHub"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <GithubIcon className="h-4 w-4" />
          </a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
