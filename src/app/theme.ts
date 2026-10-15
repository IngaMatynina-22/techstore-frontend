import { createTheme, type ThemeOptions } from '@mui/material/styles'

const ACCENT = '#FF6B4A'
const CHARCOAL = '#1A1A1A'

const shared: ThemeOptions = {
  typography: {
    fontFamily: '"IBM Plex Sans", "Segoe UI", sans-serif',
    h4: { fontWeight: 700, letterSpacing: '-0.02em' },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: { borderRadius: 16 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 10, boxShadow: 'none' },
        contained: { '&:hover': { boxShadow: 'none' } },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: 20 },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: { fontWeight: 600 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
  },
}

export function createLightTheme() {
  return createTheme({
    ...shared,
    palette: {
      mode: 'light',
      primary: { main: ACCENT, contrastText: '#fff' },
      secondary: { main: CHARCOAL },
      background: { default: '#F5F5F5', paper: '#FFFFFF' },
      success: { main: '#22c55e' },
      warning: { main: '#f59e0b' },
      error: { main: '#ef4444' },
      divider: 'rgba(0,0,0,0.08)',
      text: { primary: CHARCOAL, secondary: '#6B7280' },
    },
    components: {
      ...shared.components,
      MuiCssBaseline: {
        styleOverrides: {
          body: { backgroundColor: '#F5F5F5', minHeight: '100vh' },
        },
      },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            border: '1px solid rgba(0,0,0,0.06)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: { fontWeight: 600, color: '#6B7280', borderColor: 'rgba(0,0,0,0.06)' },
          body: { borderColor: 'rgba(0,0,0,0.04)' },
        },
      },
    },
  })
}

export function createDarkTheme() {
  return createTheme({
    ...shared,
    palette: {
      mode: 'dark',
      primary: { main: ACCENT, contrastText: '#fff' },
      secondary: { main: '#9CA3AF' },
      background: { default: '#121212', paper: '#1E1E1E' },
      success: { main: '#22c55e' },
      warning: { main: '#f59e0b' },
      error: { main: '#ef4444' },
      divider: 'rgba(255,255,255,0.08)',
      text: { primary: '#F3F4F6', secondary: '#9CA3AF' },
    },
    components: {
      ...shared.components,
      MuiCssBaseline: {
        styleOverrides: {
          body: { backgroundColor: '#121212', minHeight: '100vh' },
        },
      },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: { fontWeight: 600, color: '#9CA3AF', borderColor: 'rgba(255,255,255,0.06)' },
          body: { borderColor: 'rgba(255,255,255,0.04)' },
        },
      },
    },
  })
}

/** @deprecated use createDarkTheme / createLightTheme via ThemeModeProvider */
export const theme = createDarkTheme()
