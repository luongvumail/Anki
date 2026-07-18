// Design tokens for HanViet app
// Premium Dark theme — Style B: glassmorphism, gradients, micro-animations

export const Colors = {
  // Backgrounds
  bg: {
    primary: '#080810',
    secondary: '#0f0f1a',
    card: '#13131f',
    elevated: '#1c1c2e',
    glass: 'rgba(255, 255, 255, 0.04)',
    overlay: 'rgba(8, 8, 16, 0.92)',
  },

  // Brand / Accent
  accent: {
    purple: '#7c3aed',
    purpleLight: '#a78bfa',
    purpleMid: '#8b5cf6',
    purpleDim: 'rgba(139, 92, 246, 0.12)',
    purpleGlow: 'rgba(139, 92, 246, 0.25)',
    gold: '#f59e0b',
    goldLight: '#fbbf24',
    goldDim: 'rgba(245, 158, 11, 0.12)',
    green: '#10b981',
    greenLight: '#34d399',
    greenDim: 'rgba(16, 185, 129, 0.12)',
    red: '#ef4444',
    redLight: '#f87171',
    redDim: 'rgba(239, 68, 68, 0.12)',
    blue: '#3b82f6',
    blueLight: '#60a5fa',
    blueDim: 'rgba(59, 130, 246, 0.12)',
  },

  // Gradients (used as [start, end] arrays)
  gradient: {
    hero: ['#1a0533', '#0d1a3a'] as const,
    card: ['#181828', '#0f0f1a'] as const,
    purple: ['#7c3aed', '#5b21b6'] as const,
    purpleSubtle: ['rgba(139,92,246,0.15)', 'rgba(91,33,182,0.05)'] as const,
    success: ['#10b981', '#059669'] as const,
    gold: ['#f59e0b', '#d97706'] as const,
    red: ['#ef4444', '#dc2626'] as const,
    dark: ['#1c1c2e', '#080810'] as const,
  },

  // SRS button colors
  srs: {
    again: '#ef4444',
    againGlow: 'rgba(239,68,68,0.3)',
    hard: '#f59e0b',
    hardGlow: 'rgba(245,158,11,0.3)',
    good: '#10b981',
    goodGlow: 'rgba(16,185,129,0.3)',
    easy: '#3b82f6',
    easyGlow: 'rgba(59,130,246,0.3)',
  },

  // Text
  text: {
    primary: '#f1f5f9',
    secondary: '#94a3b8',
    muted: '#475569',
    dim: '#2d3748',
    inverse: '#080810',
  },

  // Borders
  border: {
    subtle: 'rgba(255,255,255,0.05)',
    default: 'rgba(255,255,255,0.08)',
    strong: 'rgba(255,255,255,0.16)',
    glow: 'rgba(139,92,246,0.3)',
  },
};

export const Typography = {
  // Chinese characters — use system font with bold
  hanzi: {
    xl: 88,
    lg: 64,
    md: 40,
    sm: 26,
  },
  // Regular text
  text: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 26,
    xxxl: 34,
  },
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
    black: '900' as const,
  },
  // Letter spacing
  tracking: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1,
    widest: 2,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 36,
  section: 52,
};

export const Radii = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  xxl: 36,
  full: 999,
};

export const Shadows = {
  card: {
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  glow: {
    shadowColor: '#a78bfa',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  strong: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 16,
  },
};

export const Animation = {
  fast: 150,
  normal: 250,
  slow: 400,
  spring: {
    damping: 15,
    stiffness: 200,
    mass: 0.8,
  },
};
