/**
 * Footer.jsx
 *
 * Public homepage footer. Migrated from MUI/CSS to shadcn/ui + Tailwind.
 * Uses lucide icons in place of fa-* font icons.
 *
 * Developer: Beiqi Dai (migrated)
 */

import React from 'react';
import { Trophy, Home, BookOpen } from 'lucide-react';
import { Separator } from '../components/ui/separator';

// Inline SVG socials — Twitter/Github/Youtube/Instagram aren't exported in
// the installed lucide-react version, so we use brand-style glyphs here.
function TwitterIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zM17.083 19.77h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function GithubIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.26.82-.577 0-.285-.01-1.04-.015-2.04-3.338.725-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.082-.73.082-.73 1.205.085 1.838 1.237 1.838 1.237 1.07 1.835 2.807 1.305 3.492.998.108-.776.42-1.305.763-1.605-2.665-.305-5.467-1.332-5.467-5.93 0-1.31.467-2.382 1.235-3.222-.123-.303-.535-1.524.117-3.176 0 0 1.008-.323 3.3 1.23a11.5 11.5 0 0 1 3.003-.404c1.018.005 2.043.138 3.003.404 2.29-1.553 3.297-1.23 3.297-1.23.653 1.652.24 2.873.118 3.176.77.84 1.233 1.912 1.233 3.222 0 4.61-2.806 5.622-5.48 5.92.43.37.812 1.102.812 2.222 0 1.605-.014 2.898-.014 3.293 0 .32.216.694.825.576C20.565 21.795 24 17.297 24 12c0-6.63-5.373-12-12-12z" />
    </svg>
  );
}

function YoutubeIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.6 15.6V8.4l6.2 3.6-6.2 3.6z" />
    </svg>
  );
}

function InstagramIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M12 2.2c3.2 0 3.6 0 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.43.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s0 3.6-.07 4.85c-.05 1.17-.25 1.8-.41 2.23a3.7 3.7 0 0 1-.9 1.38c-.42.42-.82.68-1.38.9-.43.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.6 0-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.43-.36-1.06-.41-2.23C2.2 15.6 2.2 15.2 2.2 12s0-3.6.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.43-.16 1.06-.36 2.23-.41C8.4 2.2 8.8 2.2 12 2.2zm0-2.2C8.74 0 8.33 0 7.05.07 5.78.13 4.9.34 4.14.63a6 6 0 0 0-2.16 1.41A6 6 0 0 0 .57 4.2C.28 4.96.07 5.84.01 7.11-.05 8.39 0 8.8 0 12.06s0 3.67.07 4.94c.06 1.27.27 2.15.56 2.91a6 6 0 0 0 1.41 2.16 6 6 0 0 0 2.16 1.41c.76.29 1.64.5 2.91.56C8.33 24 8.74 24 12 24s3.67 0 4.94-.07c1.27-.06 2.15-.27 2.91-.56a6 6 0 0 0 2.16-1.41 6 6 0 0 0 1.41-2.16c.29-.76.5-1.64.56-2.91.07-1.27.07-1.68.07-4.94s0-3.67-.07-4.94c-.06-1.27-.27-2.15-.56-2.91a6 6 0 0 0-1.41-2.16A6 6 0 0 0 19.85.57c-.76-.29-1.64-.5-2.91-.56C15.67 0 15.26 0 12 0zm0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32zm0 10.16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.4-11.84a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88z" />
    </svg>
  );
}

function DiscordIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.07.07 0 0 0-.075.035c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.6 12.6 0 0 0-.617-1.25.08.08 0 0 0-.075-.035 19.74 19.74 0 0 0-4.885 1.515.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.014.043.03.057a19.9 19.9 0 0 0 5.99 3.03.08.08 0 0 0 .084-.028 14.2 14.2 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.371-.291a.074.074 0 0 1 .077-.01c3.927 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.099.245.198.372.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.04.106c.36.698.772 1.362 1.225 1.994a.077.077 0 0 0 .084.028 19.84 19.84 0 0 0 6-3.03.077.077 0 0 0 .03-.056c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.331c-1.182 0-2.157-1.085-2.157-2.419s.956-2.42 2.157-2.42c1.21 0 2.176 1.096 2.157 2.42 0 1.334-.956 2.419-2.157 2.419zm7.974 0c-1.182 0-2.157-1.085-2.157-2.419s.955-2.42 2.157-2.42c1.21 0 2.176 1.096 2.157 2.42 0 1.334-.946 2.419-2.157 2.419z" />
    </svg>
  );
}

const socials = [
  { href: 'https://twitter.com', label: 'Twitter', Icon: TwitterIcon },
  { href: 'https://github.com', label: 'GitHub', Icon: GithubIcon },
  { href: 'https://youtube.com', label: 'YouTube', Icon: YoutubeIcon },
  { href: 'https://instagram.com', label: 'Instagram', Icon: InstagramIcon },
  { href: 'https://discord.com', label: 'Discord', Icon: DiscordIcon },
];

const columns = [
  {
    title: 'Questora',
    Icon: Home,
    links: [
      { label: 'Home', href: '/' },
      { label: 'About Us', href: '#' },
      { label: 'Contact', href: '#' },
    ],
  },
  {
    title: 'Contests',
    Icon: Trophy,
    links: [
      { label: 'Ongoing', href: '/contest-list' },
      { label: 'Upcoming', href: '/contest-list' },
      { label: 'Archives', href: '/contest-list' },
    ],
  },
  {
    title: 'Resources',
    Icon: BookOpen,
    links: [
      { label: 'How to Participate', href: '/how-to-use' },
      { label: 'FAQs', href: '#' },
      { label: 'Help Center', href: '#' },
    ],
  },
];

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
                    <a
                      href={link.href}
                      className="hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} COMPW27 • A Web3 Project
          </p>

          <div className="flex items-center gap-2">
            {socials.map(({ href, label, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>

          <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <li>
              <a href="/privacy-policy" className="hover:text-foreground transition-colors">
                Privacy Policy
              </a>
            </li>
            <li>
              <a href="/terms-of-use" className="hover:text-foreground transition-colors">
                Terms of Use
              </a>
            </li>
            <li>
              <a href="/contributor-license" className="hover:text-foreground transition-colors">
                Contributor License
              </a>
            </li>
            <li>
              <a href="/sitemap" className="hover:text-foreground transition-colors">
                Sitemap
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
