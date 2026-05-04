/**
 * Design tokens — single source of truth for colors, spacing, typography,
 * shadows, and border radii. Import these in sx={} props and styled components
 * instead of hardcoding values.
 *
 * Named exports (palette, typography, shape, shadows, layout) are preserved
 * for backward-compatibility with theme.js.
 */

export const palette = {
  primary: {
    main: '#2563EB',
    light: '#60A5FA',
    dark: '#1D4ED8',
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#7C3AED',
    light: '#A78BFA',
    dark: '#5B21B6',
    contrastText: '#FFFFFF',
  },
  success: {
    main: '#059669',
    light: '#34D399',
    dark: '#047857',
  },
  warning: {
    main: '#D97706',
    light: '#FBBF24',
    dark: '#B45309',
  },
  error: {
    main: '#DC2626',
    light: '#F87171',
    dark: '#B91C1C',
  },
  grey: {
    50:  '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
};

export const typography = {
  fontFamily: [
    'Inter',
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    'Roboto',
    '"Helvetica Neue"',
    'Arial',
    'sans-serif',
  ].join(','),
  h1: { fontSize: '2.25rem', fontWeight: 700, lineHeight: 1.2 },
  h2: { fontSize: '1.875rem', fontWeight: 700, lineHeight: 1.3 },
  h3: { fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.4 },
  h4: { fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.4 },
  h5: { fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.5 },
  h6: { fontSize: '1rem', fontWeight: 600, lineHeight: 1.5 },
  body1: { fontSize: '1rem', lineHeight: 1.6 },
  body2: { fontSize: '0.875rem', lineHeight: 1.6 },
  caption: { fontSize: '0.75rem', lineHeight: 1.5 },
};

export const shape = {
  borderRadius: 8,
};

export const shadows = {
  card:     '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
  elevated: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
  modal:    '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
};

export const layout = {
  sidebarWidth: 260,
  sidebarCollapsedWidth: 72,
  topbarHeight: 64,
  maxContentWidth: 1280,
};

/**
 * Default export: structured token object for use in sx={} props and
 * primitive components. Derived from the named exports above so there is
 * no duplication.
 */
const tokens = {
  colors: {
    primary:   { main: palette.primary.main, light: palette.primary.light, dark: palette.primary.dark, contrast: palette.primary.contrastText },
    secondary: { main: palette.secondary.main, light: palette.secondary.light, dark: palette.secondary.dark, contrast: palette.secondary.contrastText },
    success:   { main: palette.success.main, light: palette.success.light, dark: palette.success.dark, contrast: '#fff' },
    warning:   { main: palette.warning.main, light: palette.warning.light, dark: palette.warning.dark, contrast: '#fff' },
    error:     { main: palette.error.main, light: palette.error.light, dark: palette.error.dark, contrast: '#fff' },
    grey:      palette.grey,
    // Chart palette — replace hardcoded hex in dashboard files
    chart: [
      palette.primary.main,
      palette.secondary.main,
      palette.success.main,
      palette.warning.main,
      palette.error.main,
      '#0288d1',
    ],
  },
  spacing: {
    xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
  },
  radius: {
    sm: 4, md: 8, lg: 12, xl: 16, full: 9999,
  },
  shadows: {
    card:   shadows.card,
    popup:  shadows.modal,
    sticky: '0 2px 4px rgba(0,0,0,0.06)',
  },
  typography: {
    fontFamily: typography.fontFamily,
    sizes: { xs: 11, sm: 12, base: 14, md: 16, lg: 20, xl: 24, xxl: 32 },
    weights: { regular: 400, medium: 500, semibold: 600, bold: 700 },
  },
  transitions: {
    fast:   'all 0.15s ease',
    normal: 'all 0.25s ease',
    slow:   'all 0.4s ease',
  },
};

export default tokens;
