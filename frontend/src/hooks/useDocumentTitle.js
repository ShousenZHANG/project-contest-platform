import { useEffect } from 'react';

/**
 * Sets document.title while the component is mounted, then restores the
 * previous title on unmount.
 *
 * @param {string | null | undefined} title - Page-specific title fragment.
 *   Pass null/undefined to show only the site name.
 *
 * Usage:
 *   useDocumentTitle('Competition Dashboard');
 *   // => "Competition Dashboard · Contest Platform"
 */
export function useDocumentTitle(title) {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} · Contest Platform` : 'Contest Platform';
    return () => {
      document.title = prev;
    };
  }, [title]);
}
