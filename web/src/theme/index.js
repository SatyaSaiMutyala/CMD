// Single MUI theme in Trustlab's shared web look: teal primary, gold accent, IBM Plex, 6px corners,
// teal panel title bars, white table heads with a pink rule. Light only.
// Custom palette entry: `hub` (every raw token). Custom Typography variants: `mono`, `eyebrow`, `display`.
import { createTheme } from '@mui/material/styles'
import { DESKTOP_MIN, fonts, MENU_SHADOW, SHADOW, tokens as t } from './tokens'

const heading = { fontFamily: fonts.body, fontWeight: 700, lineHeight: 1.25, letterSpacing: '-0.01em' }
const monoLabel = { fontFamily: fonts.mono, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: t.accent, dark: t.accentDark, light: t.accentSoft, contrastText: t.accentInk },
    secondary: { main: t.gold, dark: t.goldDark, contrastText: t.ink },
    success: { main: t.ok, contrastText: '#FFFFFF' },
    warning: { main: t.warn, contrastText: '#FFFFFF' },
    error: { main: t.bad, contrastText: '#FFFFFF' },
    info: { main: t.info, contrastText: '#FFFFFF' },
    background: { default: t.bg, paper: t.surface },
    text: { primary: t.ink, secondary: t.muted, disabled: t.faint },
    divider: t.line,
    hub: t,
  },
  // 12-column Grid breakpoints; `md` is where the sidebar layout starts
  breakpoints: { values: { xs: 0, sm: 600, md: DESKTOP_MIN, lg: 1200, xl: 1536 } },
  shape: { borderRadius: 6 },
  typography: {
    fontFamily: fonts.body,
    fontSize: 14,
    h1: { ...heading, fontSize: '1.25rem' }, // page title
    h2: { ...heading, fontSize: '1.125rem' },
    h3: { ...heading, fontSize: '1rem' },
    h4: { ...heading, fontSize: '0.875rem', letterSpacing: '0.01em' }, // panel titles
    body1: { fontSize: '0.875rem', lineHeight: 1.5 },
    body2: { fontSize: '0.8125rem', lineHeight: 1.5 },
    button: { fontWeight: 500, textTransform: 'none', letterSpacing: 0, fontSize: '0.8125rem' },
    mono: { fontFamily: fonts.mono, fontWeight: 500, fontSize: '0.8125rem', fontVariantNumeric: 'tabular-nums' },
    eyebrow: { ...monoLabel, fontSize: '0.6875rem', lineHeight: 1.4 },
    display: { fontFamily: fonts.mono, fontWeight: 600, fontSize: '1.75rem', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' },
  },
  shadows: ['none', SHADOW, SHADOW, ...Array(22).fill(MENU_SHADOW)],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        // No rubber-band bounce when scrolling past the top or bottom of a page
        'html, body': { overscrollBehavior: 'none' },
        body: { backgroundColor: t.bg, color: t.ink, WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' },
        '::selection': { background: t.accentSoft },
        ':focus-visible': { outline: `2px solid ${t.accent}`, outlineOffset: 2 },
        '@media (prefers-reduced-motion: reduce)': {
          '*, *::before, *::after': { transitionDuration: '0.01ms !important', animationDuration: '0.01ms !important' },
        },
      },
    },
    MuiTypography: {
      defaultProps: { variantMapping: { mono: 'span', eyebrow: 'div', display: 'div' } },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { backgroundImage: 'none' },
        outlined: { borderColor: t.line, boxShadow: SHADOW },
      },
    },
    MuiButtonBase: { defaultProps: { disableRipple: true } },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { minHeight: 36, paddingInline: 14, whiteSpace: 'nowrap' },
        sizeSmall: { minHeight: 30, paddingInline: 10, fontSize: '0.78rem' },
        sizeLarge: { minHeight: 44, fontSize: '0.9375rem', paddingInline: 20, fontWeight: 600 },
        outlined: {
          borderColor: t.line,
          color: t.muted,
          backgroundColor: t.surface,
          '&:hover': { borderColor: t.faint, color: t.ink, backgroundColor: t.surface },
        },
        outlinedError: {
          borderColor: t.bad,
          color: t.bad,
          '&:hover': { backgroundColor: t.bad, borderColor: t.bad, color: '#FFFFFF' },
        },
        text: { color: t.accentDark, '&:hover': { backgroundColor: t.accentSoft } },
        containedPrimary: { '&:hover': { backgroundColor: t.accentHover } },
        containedSuccess: { '&:hover': { filter: 'brightness(0.92)' } },
        containedError: { '&:hover': { filter: 'brightness(0.92)' } },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderBottomColor: t.line2, fontSize: '0.8125rem', padding: '10px 14px' },
        head: {
          ...monoLabel,
          fontSize: '0.6875rem',
          color: t.muted,
          backgroundColor: t.surface,
          borderBottom: `2px solid ${t.colRule}`,
          whiteSpace: 'nowrap',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: { minHeight: 44, textTransform: 'none', fontWeight: 600, fontSize: '0.8125rem' },
      },
    },
    MuiTooltip: {
      styleOverrides: { tooltip: { backgroundColor: t.ink, fontSize: '0.75rem' } },
    },
  },
})

export default theme
