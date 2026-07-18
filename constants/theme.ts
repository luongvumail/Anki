// Design tokens for Anki app
// Authentic Linear.app Dark Aesthetic System & Eye-Care Anti-Halo Chinese Typography

import * as Haptics from 'expo-haptics';

export const Colors = {
  // Authentic Linear.app Surface Hierarchy
  bg: {
    primary: '#08090C',                  // Linear Obsidian Main Canvas
    secondary: '#121318',                // Linear Panel / Container Surface
    tertiary: '#1A1C23',                 // Linear Input / Elevated Surface
    quaternary: '#222530',               // Hover / Pressed Surface
    card: '#000000',                     // Pure Jet-Black Card Body (High Depth Contrast)
    glass: 'rgba(18, 19, 24, 0.92)',     // Linear Translucent Navigation Bar
    overlay: 'rgba(8, 9, 12, 0.85)',     // Modal Backdrop Overlay
  },

  // Linear.app Brand Accents & Soft Neon Palette
  accent: {
    indigo: '#5E6AD2',                   // Linear Signature Indigo / Violet Accent
    indigoLight: '#707CE6',              // Linear Active Indigo Glow
    indigoDim: 'rgba(94, 106, 210, 0.18)',
    blue: '#22D3EE',                     // Electric Cyan
    blueDim: 'rgba(34, 211, 238, 0.15)',
    gray: '#8B949E',                     // Linear Slate Gray
    gray2: '#6E7681',                    // Linear Muted Gray
    gray3: '#484F58',                    // Linear Dark Gray
    gray4: '#30363D',                    // Linear Border Gray 4
    gray5: '#1A1C23',                    // Linear Cell Gray 5
    gray6: '#121318',                    // Linear Panel Gray 6
  },

  // Soft Neon Color Palette (Pinyin Tones & SRS Memory States)
  neon: {
    cyan: '#22D3EE',                     // Tone 1 / Easy - Electric Cyan
    emerald: '#34D399',                  // Tone 2 / Good - Emerald Green
    purple: '#C084FC',                   // Tone 3 / Hard - Soft Purple
    coral: '#FB7185',                    // Tone 4 / Again - Neon Coral
  },

  // SRS Status Colors (Matching Soft Neon Palette)
  srs: {
    again: '#FB7185',                    // Neon Coral (Quên)
    hard: '#C084FC',                     // Soft Purple (Khó)
    good: '#34D399',                     // Emerald Green (Đã nhớ)
    easy: '#22D3EE',                     // Electric Cyan (Dễ / Thuộc)
  },

  // Eye-Care Anti-Halo Chinese Typography Labels
  text: {
    primary: '#F3F4F6',                  // Milk White (Anti-glare / Anti-halo for intricate Hanzi)
    secondary: '#8B949E',                // Linear Slate Gray
    tertiary: '#6E7681',                 // Muted Label
    quaternary: '#484F58',               // Faded Label
    inverse: '#08090C',
  },

  // Crisp Linear 1px Stroked Borders
  border: {
    separator: '#1F212B',                // Linear Subtle Separator
    default: '#232530',                  // Linear Panel 1px Border Stroke
    strong: '#303648',
    active: '#707CE6',                   // Active Indigo Border
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
  icon: 8,
  card: 10,                              // Linear Panel Corner Radius
  lg: 10,
  xl: 14,
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
