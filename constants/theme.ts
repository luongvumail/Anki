// Design tokens for Anki app
// Authentic Linear.app Dark Aesthetic System with a SINGLE UNIFIED PRIMARY BRAND COLOR

import * as Haptics from 'expo-haptics';

export const Colors = {
  // Authentic Linear.app & Notion Dark Surface Hierarchy
  bg: {
    primary: '#0D0E12',                  // Linear Deep Obsidian Slate Canvas
    secondary: '#16181D',                // Notion / Linear Panel Surface
    tertiary: '#20232A',                 // Elevated Input & Chip Surface
    quaternary: '#2A2E38',               // Hover & Active Selection Surface
    card: '#16181D',                     // Panel Surface
    glass: 'rgba(22, 24, 29, 0.94)',     // Translucent Bar Overlay
    overlay: 'rgba(13, 14, 18, 0.82)',    // Backdrop Overlay
  },

  // LINEAR SIGNATURE INDIGO ACCENT SYSTEM (#5E6AD2 / #707CE6)
  accent: {
    primary: '#5E6AD2',                  // Authentic Linear Signature Indigo
    primaryLight: '#707CE6',             // Muted Linear Glow
    primaryDim: 'rgba(94, 106, 210, 0.15)',
    indigo: '#5E6AD2',                   // Linear Indigo
    indigoLight: '#707CE6',              // Active Glow
    indigoDim: 'rgba(94, 106, 210, 0.15)',
    blue: '#707CE6',                     // Soft Linear Blue
    blueDim: 'rgba(94, 106, 210, 0.15)',
    gray: '#8B949E',                     // Slate Gray
    gray2: '#6E7681',                    // Muted Slate
    gray3: '#484F58',                    // Subtly Muted
    gray4: '#30363D',                    // Muted Container
    gray5: '#20232A',                    // Elevated Cell Surface
    gray6: '#16181D',                    // Card Panel Surface
  },

  // Refined Muted Color Palette (Linear / Notion Style - NO NEON)
  neon: {
    cyan: '#707CE6',                     // Soft Indigo Slate
    emerald: '#3FB950',                  // Linear Muted Sage Emerald
    purple: '#A371F7',                   // Linear Soft Lavender
    coral: '#F85149',                    // Linear Muted Crimson
  },

  // SRS Status Colors (Refined Linear Palette)
  srs: {
    again: '#F85149',                    // Muted Crimson (Quên)
    hard: '#A371F7',                     // Soft Lavender (Khó)
    good: '#3FB950',                     // Soft Sage (Thuộc)
    easy: '#707CE6',                     // Soft Indigo (Dễ / Thuộc)
  },

  // Eye-Care Anti-Halo Chinese Typography Labels
  text: {
    primary: '#F0F3F6',                  // Crisp Slate White
    secondary: '#8B949E',                // Muted Slate Gray
    tertiary: '#6E7681',                 // Faded Muted Label
    quaternary: '#484F58',               // Subtle Label
    inverse: '#0D0E12',
  },

  // Subtle Linear Separators
  border: {
    separator: '#1F222B',                // Subtle Separator Line
    default: 'transparent',              // Borderless
    strong: '#2A2E38',
    active: '#5E6AD2',                   // Linear Indigo Highlight
  },
};

// SF & Linear Technical Typography Metrics with Explicit Line Heights
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
    largeTitle: { fontSize: 32, lineHeight: 38 },
  },
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

// Vector Deck Icon Presets (Ionicons)
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

// Linear Geometry & Spacing Constants
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
  xs: 4,
  sm: 6,
  icon: 10,
  card: 16,                              // Modern Smooth Apple Card Corner Radius
  lg: 16,
  xl: 20,
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
