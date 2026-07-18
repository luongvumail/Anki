// Design tokens for HanViet app
// Authentic Apple iOS Human Interface Guidelines (HIG) Dark Theme & Vector Icon Tokens

import * as Haptics from 'expo-haptics';

export const Colors = {
  // Pure Apple Dark Backgrounds
  bg: {
    primary: '#000000',                  // Pure Black Primary Background
    secondary: '#1C1C1E',                // Grouped Inset Background
    tertiary: '#2C2C2E',                 // Elevated Cell / Input Background
    quaternary: '#3A3A3C',               // Hover / Pressed Surface
    glass: 'rgba(28, 28, 30, 0.90)',     // iOS Translucent Glass Bar
    overlay: 'rgba(0, 0, 0, 0.70)',       // Sheet Modal Backdrop Overlay
  },

  // Single Apple System Accent & Neutral Grays
  accent: {
    blue: '#0A84FF',                     // Apple System Blue (Single App Accent)
    blueDim: 'rgba(10, 132, 255, 0.15)',
    gray: '#8E8E93',                     // System Gray
    gray2: '#636366',                    // System Gray 2
    gray3: '#48484A',                    // System Gray 3
    gray4: '#3A3A3C',                    // System Gray 4
    gray5: '#2C2C2E',                    // System Gray 5
    gray6: '#1C1C1E',                    // System Gray 6
  },

  // Restrained SRS Status Colors
  srs: {
    again: '#FF453A',                    // System Red
    hard: '#FF9F0A',                     // System Orange
    good: '#30D158',                     // System Green
    easy: '#0A84FF',                     // System Blue
  },

  // Apple System Text Labels
  text: {
    primary: '#FFFFFF',                  // Primary Label
    secondary: '#8E8E93',                // Secondary Label
    tertiary: '#636366',                 // Tertiary Label
    quaternary: '#48484A',               // Quaternary Label
    inverse: '#000000',
  },

  // Hairline Separators & Borders
  border: {
    separator: '#38383A',                // 0.5px Hairline Divider
    default: '#2C2C2E',
    strong: '#38383A',
    active: '#0A84FF',
  },
};

// SF Typography Metrics with Explicit Line Heights
export const Typography = {
  hanzi: {
    xl: 88,
    lg: 64,
    md: 40,
    sm: 26,
  },
  text: {
    caption2: { fontSize: 11, lineHeight: 13 },
    caption1: { fontSize: 12, lineHeight: 16 },
    footnote: { fontSize: 13, lineHeight: 18 },
    subhead: { fontSize: 15, lineHeight: 20 },
    callout: { fontSize: 16, lineHeight: 21 },
    body: { fontSize: 17, lineHeight: 22 },
    headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' as const },
    title3: { fontSize: 20, lineHeight: 25 },
    title2: { fontSize: 22, lineHeight: 28 },
    title1: { fontSize: 28, lineHeight: 34 },
    largeTitle: { fontSize: 34, lineHeight: 41 },
  },
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

// Apple Vector Deck Icon Presets (Ionicons)
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

// Apple HIG Geometry & Spacing Constants
export const Spacing = {
  pageMargin: 16,
  cellHorizontal: 16,
  cellVertical: 11,
  cellMinHeight: 44,
  sectionTop: 22,
  sectionBottom: 6,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 36,
};

export const Radii = {
  xs: 6,
  sm: 8,
  icon: 8,                               // SF Symbol Tile Radius
  card: 12,                              // iOS Inset Group Card Radius
  lg: 12,
  xl: 16,
  full: 9999,
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
