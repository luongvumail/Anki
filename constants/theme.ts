// Design tokens for HanViet app
// Dark theme with purple accent

export const Colors = {
  // Backgrounds
  bg: {
    primary: '#0a0a0f',
    secondary: '#12121a',
    card: '#1a1a26',
    elevated: '#22223a',
    overlay: 'rgba(10, 10, 15, 0.85)',
  },

  // Brand / Accent
  accent: {
    purple: '#7c3aed',
    purpleLight: '#a855f7',
    purpleDim: 'rgba(124, 58, 237, 0.15)',
    gold: '#f59e0b',
    goldDim: 'rgba(245, 158, 11, 0.15)',
    green: '#10b981',
    greenDim: 'rgba(16, 185, 129, 0.15)',
    red: '#ef4444',
    redDim: 'rgba(239, 68, 68, 0.15)',
    blue: '#3b82f6',
    blueDim: 'rgba(59, 130, 246, 0.15)',
  },

  // SRS button colors
  srs: {
    again: '#ef4444',
    hard: '#f59e0b',
    good: '#10b981',
    easy: '#3b82f6',
  },

  // Text
  text: {
    primary: '#f1f5f9',
    secondary: '#94a3b8',
    muted: '#475569',
    inverse: '#0a0a0f',
  },

  // Borders
  border: {
    subtle: 'rgba(255,255,255,0.06)',
    default: 'rgba(255,255,255,0.1)',
    strong: 'rgba(255,255,255,0.2)',
  },
};

export const Typography = {
  // Chinese characters
  hanzi: {
    xl: 80,
    lg: 56,
    md: 36,
    sm: 24,
  },
  // Regular text
  text: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  section: 48,
};

export const Radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const Shadows = {
  card: {
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  glow: {
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
};
