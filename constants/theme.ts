// Centralized Design System & Theme Engine according to DESIGN.md
import { StyleSheet } from "react-native";

export type ThemeMode = "system" | "light" | "dark";

export interface ColorPalette {
  isDark: boolean;
  mode: ThemeMode;

  // Backgrounds & Canvas
  bg: string;
  bgSoft: string;
  cardBg: string;
  cardBorder: string;
  cardBottom: string;

  // Text Colors
  textPrimary: string;
  textMuted: string;
  textSubhead: string;
  textInverse: string;

  // Form Elements
  inputBg: string;
  inputBorder: string;
  divider: string;
  overlay: string;

  // Brand & Status Accents
  green: string;
  greenDark: string;
  greenDim: string;
  blue: string;
  blueDark: string;
  blueDim: string;
  red: string;
  redDark: string;
  redDim: string;
  yellow: string;
  yellowDark: string;
  yellowDim: string;
  purple: string;
  purpleDark: string;
  purpleDim: string;

  // FSRS Status Colors
  srsAgain: string;
  srsHard: string;
  srsGood: string;
  srsEasy: string;
}

export const LightTheme: ColorPalette = {
  isDark: false,
  mode: "light",

  bg: "#F8FAFC",
  bgSoft: "#F1F5F9",
  cardBg: "#FFFFFF",
  cardBorder: "rgba(15, 23, 42, 0.09)",
  cardBottom: "transparent",

  textPrimary: "#0F172A",
  textMuted: "#64748B",
  textSubhead: "#475569",
  textInverse: "#FFFFFF",

  inputBg: "#F1F5F9",
  inputBorder: "transparent",
  divider: "#F1F5F9",
  overlay: "rgba(15, 23, 42, 0.6)",

  green: "#10B981",
  greenDark: "#059669",
  greenDim: "rgba(16, 185, 129, 0.12)",

  blue: "#0EA5E9",
  blueDark: "#0284C7",
  blueDim: "rgba(14, 165, 233, 0.12)",

  red: "#EF4444",
  redDark: "#DC2626",
  redDim: "rgba(239, 68, 68, 0.12)",

  yellow: "#F59E0B",
  yellowDark: "#D97706",
  yellowDim: "rgba(245, 158, 11, 0.12)",

  purple: "#8B5CF6",
  purpleDark: "#7C3AED",
  purpleDim: "rgba(139, 92, 246, 0.12)",

  srsAgain: "#EF4444",
  srsHard: "#8B5CF6",
  srsGood: "#10B981",
  srsEasy: "#0EA5E9",
};

export const DarkTheme: ColorPalette = {
  isDark: true,
  mode: "dark",

  bg: "#0F172A",
  bgSoft: "#334155",
  cardBg: "#1E293B",
  cardBorder: "rgba(255, 255, 255, 0.08)",
  cardBottom: "transparent",

  textPrimary: "#F8FAFC",
  textMuted: "#94A3B8",
  textSubhead: "#CBD5E1",
  textInverse: "#0F172A",

  inputBg: "#334155",
  inputBorder: "transparent",
  divider: "#334155",
  overlay: "rgba(15, 23, 42, 0.85)",

  green: "#10B981",
  greenDark: "#059669",
  greenDim: "rgba(16, 185, 129, 0.15)",

  blue: "#0EA5E9",
  blueDark: "#0284C7",
  blueDim: "rgba(14, 165, 233, 0.15)",

  red: "#EF4444",
  redDark: "#DC2626",
  redDim: "rgba(239, 68, 68, 0.15)",

  yellow: "#F59E0B",
  yellowDark: "#D97706",
  yellowDim: "rgba(245, 158, 11, 0.15)",

  purple: "#8B5CF6",
  purpleDark: "#7C3AED",
  purpleDim: "rgba(139, 92, 246, 0.15)",

  srsAgain: "#EF4444",
  srsHard: "#8B5CF6",
  srsGood: "#10B981",
  srsEasy: "#0EA5E9",
};

// Legacy Colors export for 100% backward compatibility with un-refactored components
export const Colors = {
  App: {
    green: "#58CC02",
    greenDark: "#58A700",
    greenDim: "rgba(88, 204, 2, 0.15)",
    blue: "#1CB0F6",
    blueDark: "#1899D6",
    blueDim: "rgba(28, 176, 246, 0.15)",
    red: "#FF4B4B",
    redDark: "#EA2B2B",
    redDim: "rgba(255, 75, 75, 0.15)",
    yellow: "#FFC800",
    yellowDark: "#E6B400",
    yellowDim: "rgba(255, 200, 0, 0.15)",
    purple: "#CE82FF",
    purpleDark: "#A568CC",
    purpleDim: "rgba(206, 130, 255, 0.15)",
    bg: "#131F24",
    bgSoft: "#1F2C34",
    bgSoftDark: "#1F2C34",
    border: "transparent",
    text: "#F0F3F6",
    textMuted: "#777777",
    cardBg: "#1F2C34",
    cardBorder: "transparent",
    cardBottom: "transparent",
    disabledBg: "#2B3D4F",
    disabledText: "#526575",
  },
  bg: {
    primary: "#131F24",
    secondary: "#1F2C34",
    tertiary: "#2B3D4F",
    card: "#1F2C34",
    glass: "rgba(19, 31, 36, 0.94)",
    overlay: "rgba(19, 31, 36, 0.85)",
  },
  accent: {
    primary: "#1CB0F6",
    primaryLight: "#1CB0F6",
    primaryDim: "rgba(28, 176, 246, 0.15)",
    purple: "#A855F7",
    purpleDim: "rgba(168, 85, 247, 0.15)",
    orange: "#FF9600",
    orangeDim: "rgba(255, 150, 0, 0.15)",
    blue: "#1CB0F6",
    blueDim: "rgba(28, 176, 246, 0.15)",
    indigo: "#1CB0F6",
    indigoLight: "#1CB0F6",
    indigoDim: "rgba(28, 176, 246, 0.15)",
    gray: "#777777",
  },
  neon: {
    cyan: "#1CB0F6",
    emerald: "#58CC02",
    purple: "#CE82FF",
    coral: "#FF4B4B",
  },
  srs: {
    again: "#FF4B4B",
    hard: "#CE82FF",
    good: "#58CC02",
    easy: "#1CB0F6",
  },
  text: {
    primary: "#F0F3F6",
    white: "#FFFFFF",
    secondary: "#AFAFAF",
    tertiary: "#777777",
    inverse: "#131F24",
  },
  border: {
    separator: "transparent",
    default: "transparent",
    strong: "transparent",
    active: "#1CB0F6",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,

  pageMargin: 16,
  cellPadding: 12,
  cardGap: 12,
  minTouchTarget: 48,
  cellHorizontal: 16,
  cellVertical: 12,
  cellMinHeight: 44,
  sectionTop: 24,
  sectionBottom: 8,
};

export const Radii = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
  card: 16,
  input: 12,
  button: 16,
  avatar: 20,
  badge: 999,
};

export const Layout = {
  iconSm: 16,
  iconMd: 20,
  iconLg: 24,
  iconXl: 32,
  avatarSm: 32,
  avatarMd: 40,
  avatarLg: 48,
  avatarXl: 80,
  btnHeightSm: 32,
  btnHeightMd: 40,
  btnHeightLg: 46,
  btnHeightXl: 52,
  fabSize: 54,
  hitSlopSm: { top: 6, bottom: 6, left: 6, right: 6 },
  hitSlopMd: { top: 8, bottom: 8, left: 8, right: 8 },
  hitSlopLg: { top: 10, bottom: 10, left: 10, right: 10 },
};

export const BorderWidths = {
  none: 0,
  thin: 0,
  default: 0,
  card3D: 0,
};

export const Animations = {
  timingShort: 200,
  timingMedium: 400,
  timingLong: 800,
  springTension: 70,
  springFriction: 8,
};

export const Typography = {
  hanziHero: { fontSize: 64, lineHeight: 72, fontWeight: "800" as const },
  hanziCard: { fontSize: 44, lineHeight: 52, fontWeight: "800" as const },
  hanziMedium: { fontSize: 32, lineHeight: 38, fontWeight: "800" as const },

  hanzi: {
    xl: 88,
    lg: 64,
    md: 40,
    sm: 26,
  },

  titleXL: { fontSize: 28, lineHeight: 34, fontWeight: "800" as const },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: "800" as const },
  title2: { fontSize: 24, lineHeight: 30, fontWeight: "800" as const },
  titleLG: { fontSize: 22, lineHeight: 28, fontWeight: "800" as const },
  title3: { fontSize: 20, lineHeight: 26, fontWeight: "700" as const },
  titleMD: { fontSize: 18, lineHeight: 24, fontWeight: "700" as const },
  bodyLG: { fontSize: 17, lineHeight: 24, fontWeight: "600" as const },
  callout: { fontSize: 16, lineHeight: 21, fontWeight: "700" as const },
  bodyMD: { fontSize: 15, lineHeight: 21, fontWeight: "600" as const },
  subhead: { fontSize: 14, lineHeight: 18, fontWeight: "700" as const },
  caption: { fontSize: 13, lineHeight: 17, fontWeight: "600" as const },
  caption1: { fontSize: 12, lineHeight: 16, fontWeight: "600" as const },
  caption2: { fontSize: 11, lineHeight: 14, fontWeight: "700" as const },

  text: {
    caption2: { fontSize: 11, lineHeight: 14, fontWeight: "700" as const },
    caption1: { fontSize: 13, lineHeight: 16, fontWeight: "700" as const },
    footnote: { fontSize: 13, lineHeight: 18, fontWeight: "600" as const },
    subhead: { fontSize: 15, lineHeight: 20, fontWeight: "600" as const },
    callout: { fontSize: 16, lineHeight: 21, fontWeight: "700" as const },
    body: { fontSize: 16, lineHeight: 22, fontWeight: "700" as const },
    headline: { fontSize: 20, lineHeight: 26, fontWeight: "700" as const },
    title3: { fontSize: 20, lineHeight: 26, fontWeight: "700" as const },
    title2: { fontSize: 24, lineHeight: 30, fontWeight: "800" as const },
    title1: { fontSize: 28, lineHeight: 34, fontWeight: "800" as const },
    largeTitle: { fontSize: 32, lineHeight: 38, fontWeight: "800" as const },
  },

  weight: {
    regular: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
    extraBold: "800" as const,
  },
};

export const VECTOR_DECK_ICONS = [
  "book-outline",
  "language-outline",
  "school-outline",
  "journal-outline",
  "sparkles-outline",
  "bookmarks-outline",
  "earth-outline",
  "cube-outline",
  "trophy-outline",
  "ribbon-outline",
  "bulb-outline",
  "shapes-outline",
];

/**
 * Creates standardized reusable styles dynamically bound to the current active Theme palette.
 * Minimizes custom/ad-hoc styling across screen components.
 */
export function createCommonStyles(theme: ColorPalette) {
  return StyleSheet.create({
    flex1: {
      flex: 1,
    },
    screenContainer: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    contentPadding: {
      paddingHorizontal: Spacing.pageMargin,
      paddingTop: Spacing.md,
      paddingBottom: Spacing.xl,
    },
    card: {
      backgroundColor: theme.cardBg,
      borderRadius: Radii.card,
      borderWidth: 2,
      borderColor: theme.cardBorder,
      borderBottomWidth: 4,
      borderBottomColor: theme.cardBottom,
      padding: Spacing.lg,
    },
    cardInteractive: {
      backgroundColor: theme.cardBg,
      borderRadius: Radii.card,
      borderWidth: 2,
      borderColor: theme.cardBorder,
      borderBottomWidth: 4,
      borderBottomColor: theme.cardBottom,
      padding: Spacing.lg,
    },
    input: {
      backgroundColor: theme.inputBg,
      borderRadius: Radii.input,
      borderWidth: 2,
      borderColor: theme.inputBorder,
      color: theme.textPrimary,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      fontSize: 16,
      fontWeight: "600",
    },
    textPrimary: {
      color: theme.textPrimary,
      fontSize: Typography.bodyMD.fontSize,
      fontWeight: Typography.bodyMD.fontWeight,
    },
    textMuted: {
      color: theme.textMuted,
      fontSize: Typography.caption.fontSize,
      fontWeight: Typography.caption.fontWeight,
    },
    titleXL: {
      color: theme.textPrimary,
      fontSize: Typography.titleXL.fontSize,
      fontWeight: Typography.titleXL.fontWeight,
    },
    titleLG: {
      color: theme.textPrimary,
      fontSize: Typography.titleLG.fontSize,
      fontWeight: Typography.titleLG.fontWeight,
    },
    titleMD: {
      color: theme.textPrimary,
      fontSize: Typography.titleMD.fontSize,
      fontWeight: Typography.titleMD.fontWeight,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
    },
    rowBetween: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    center: {
      alignItems: "center",
      justifyContent: "center",
    },
    gapSm: {
      gap: Spacing.sm,
    },
    gapMd: {
      gap: Spacing.md,
    },
    gapLg: {
      gap: Spacing.lg,
    },
    badge: {
      backgroundColor: theme.bgSoft,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      borderRadius: Radii.full,
      borderWidth: 1,
      borderColor: theme.cardBorder,
      alignSelf: "flex-start",
    },
    badgeText: {
      color: theme.textMuted,
      fontSize: 12,
      fontWeight: "700",
    },
  });
}

export const triggerHaptic = (
  _type: "light" | "medium" | "heavy" | "selection" | "success" | "warning" | "error" = "light",
) => {
  // Toàn bộ tính năng rung / haptic đã được tắt
};
