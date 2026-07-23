// Design tokens for Anki app according to EXACT Duolingo Specification

import * as Haptics from 'expo-haptics';

export const Colors = {
  // Duolingo Design Tokens
  duolingo: {
    // Primary colors
    green: '#58CC02',                    // --color-primary-green
    greenDark: '#58A700',                // --color-primary-green-dark
    greenShadow: '#58A700',
    greenLight: 'rgba(88, 204, 2, 0.15)',
    blue: '#1CB0F6',                     // --color-blue
    blueDark: '#1899D6',                 // --color-blue-dark
    blueDim: 'rgba(28, 176, 246, 0.15)',
    red: '#FF4B4B',                      // --color-red
    redDark: '#EA2B2B',                  // --color-red-dark
    redShadow: '#EA2B2B',
    redLight: 'rgba(255, 75, 75, 0.15)',
    yellow: '#FFC800',                   // --color-yellow
    yellowDark: '#E6B400',               // --color-yellow-dark
    orange: '#FFC800',
    purple: '#CE82FF',                   // --color-purple
    purpleDark: '#A568CC',               // --color-purple-dark
    purpleDim: 'rgba(206, 130, 255, 0.15)',

    // Neutral - Dark Mode (default canvas)
    bg: '#131F24',                       // --color-bg-dark
    bgSoft: '#1F2C34',                   // --color-bg-soft-dark
    border: '#2B3D4F',                   // --color-border
    text: '#F0F3F6',                     // --color-text
    textMuted: '#777777',                // --color-text-muted
    disabled: '#2B3D4F',                 // --color-disabled
    disabledText: '#526575',             // --color-disabled-text

    // Neutral - Light Mode
    bgLight: '#FFFFFF',                  // --color-bg
    bgSoftLight: '#F7F7F7',              // --color-bg-soft
    borderLight: '#E5E5E5',              // --color-border
    textLight: '#3C3C3C',                // --color-text
    disabledLight: '#E5E5E5',

    bgDark: '#131F24',
    bgSoftDark: '#1F2C34',
    disabledBg: '#2B3D4F',

    cardBg: '#1F2C34',
    cardBorder: '#2B3D4F',
    cardBottom: '#18242B',
    selectedBg: '#1F2C34',
    selectedBorder: '#1CB0F6',
    selectedBottom: '#1899D6',
  },

  // Global background mappings
  bg: {
    primary: '#131F24',
    secondary: '#1F2C34',
    tertiary: '#2B3D4F',
    quaternary: '#1F2C34',
    card: '#1F2C34',
    glass: 'rgba(19, 31, 36, 0.94)',
    overlay: 'rgba(19, 31, 36, 0.85)',
  },
  accent: {
    primary: '#1CB0F6',
    primaryLight: '#1CB0F6',
    primaryDim: 'rgba(28, 176, 246, 0.15)',
    indigo: '#1CB0F6',
    indigoLight: '#1CB0F6',
    indigoDim: 'rgba(28, 176, 246, 0.15)',
    blue: '#1CB0F6',
    blueDim: 'rgba(28, 176, 246, 0.15)',
    gray: '#777777',
    gray2: '#777777',
    gray3: '#777777',
    gray4: '#2B3D4F',
    gray5: '#1F2C34',
    gray6: '#1F2C34',
  },
  neon: {
    cyan: '#1CB0F6',
    emerald: '#58CC02',
    purple: '#CE82FF',
    coral: '#FF4B4B',
  },
  srs: {
    again: '#FF4B4B',
    hard: '#CE82FF',
    good: '#58CC02',
    easy: '#1CB0F6',
  },
  text: {
    primary: '#F0F3F6',
    secondary: '#AFAFAF',
    tertiary: '#777777',
    quaternary: '#777777',
    inverse: '#131F24',
  },
  border: {
    separator: '#2B3D4F',
    default: 'transparent',
    strong: '#2B3D4F',
    active: '#1CB0F6',
  },
};

// Typography Spec
export const Typography = {
  hanzi: {
    xl: 88,
    lg: 64,
    md: 40,                             // --fs-chinese-char: 40px
    sm: 26,
  },
  text: {
    caption2: { fontSize: 11, lineHeight: 14, fontWeight: '700' as const },
    caption1: { fontSize: 13, lineHeight: 16, fontWeight: '700' as const }, // --fs-caption
    footnote: { fontSize: 13, lineHeight: 18, fontWeight: '600' as const },
    subhead: { fontSize: 15, lineHeight: 20, fontWeight: '600' as const },
    callout: { fontSize: 16, lineHeight: 21, fontWeight: '700' as const },  // --fs-body
    body: { fontSize: 16, lineHeight: 22, fontWeight: '700' as const },     // --fs-body
    headline: { fontSize: 20, lineHeight: 26, fontWeight: '700' as const }, // --fs-h2
    title3: { fontSize: 20, lineHeight: 26, fontWeight: '700' as const },     // --fs-h2
    title2: { fontSize: 24, lineHeight: 30, fontWeight: '800' as const },     // --fs-h1
    title1: { fontSize: 28, lineHeight: 34, fontWeight: '800' as const },
    largeTitle: { fontSize: 32, lineHeight: 38, fontWeight: '800' as const }, // --fs-hero
  },
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extraBold: '800' as const,
  },
};

export const VECTOR_DECK_ICONS = [
  'book-outline',
  'language-outline',
  'school-outline',
  'journal-outline',
  'sparkles-outline',
  'bookmarks-outline',
  'earth-outline',
  'cube-outline',
  'trophy-outline',
  'ribbon-outline',
  'bulb-outline',
  'shapes-outline',
];

// Spacing & Elevation Spec
export const Spacing = {
  space1: 4,
  space2: 8,
  space3: 12,
  space4: 16,
  space6: 24,
  space8: 32,
  pageMargin: 16,
  cellHorizontal: 16,
  cellVertical: 11,
  cellMinHeight: 44,
  sectionTop: 24,
  sectionBottom: 8,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const Radii = {
  sm: 8,                                 // --radius-sm: 8px
  md: 12,                                // --radius-md: 12px
  lg: 16,                                // --radius-lg: 16px
  xl: 24,                                // --radius-xl: 24px
  full: 999,                             // --radius-full: 999px
  card: 16,
  icon: 10,
};

export const triggerHaptic = (
  type: 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error' = 'light'
) => {
  try {
    if (type === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    else if (type === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    else if (type === 'heavy') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    else if (type === 'selection') Haptics.selectionAsync();
    else if (type === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else if (type === 'warning') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    else if (type === 'error') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch {
    // safe fallback
  }
};
