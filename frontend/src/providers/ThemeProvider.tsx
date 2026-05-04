import { ThemeProvider as NextThemeProvider } from 'next-themes';
import type { ReactNode } from 'react';

/**
 * Theme provider — toggles `.dark` class on <html> based on user preference
 * and `prefers-color-scheme`. Persists choice to localStorage.
 *
 * Usage in main.jsx:
 *   <ThemeProvider>
 *     <App />
 *   </ThemeProvider>
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="theme"
    >
      {children}
    </NextThemeProvider>
  );
}
