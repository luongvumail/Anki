---
name: Anki Learning Design System
description: Ultra-clean, unified design system with full-width surface sections, ambient elevation contrast, 2 button tiers (Primary & Secondary), and zero visual clutter for Light, Dark, and System Theme.
colors:
  # Light Palette
  bg-light: "#F8FAFC"
  bg-soft-light: "#F1F5F9"
  card-bg-light: "#FFFFFF"
  card-border-light: "transparent"
  text-primary-light: "#0F172A"
  text-muted-light: "#64748B"

  # Dark Palette
  bg-dark: "#0F172A"
  bg-soft-dark: "#1E293B"
  card-bg-dark: "#1E293B"
  card-border-dark: "transparent"
  text-primary-dark: "#F8FAFC"
  text-muted-dark: "#94A3B8"

  # Core Accents
  blue: "#0EA5E9"
  green: "#10B981"
  red: "#EF4444"
  amber: "#F59E0B"
  purple: "#8B5CF6"

typography:
  hanzi-hero: { fontFamily: System, fontSize: 64px, fontWeight: 800, lineHeight: 72px }
  hanzi-card: { fontFamily: System, fontSize: 44px, fontWeight: 800, lineHeight: 52px }
  title-xl: { fontFamily: System, fontSize: 24px, fontWeight: 800, lineHeight: 30px }
  title-lg: { fontFamily: System, fontSize: 20px, fontWeight: 800, lineHeight: 26px }
  title-md: { fontFamily: System, fontSize: 16px, fontWeight: 700, lineHeight: 22px }
  body-md: { fontFamily: System, fontSize: 15px, fontWeight: 500, lineHeight: 22px }
  caption: { fontFamily: System, fontSize: 12px, fontWeight: 600, lineHeight: 16px }
  caption2: { fontFamily: System, fontSize: 11px, fontWeight: 700, lineHeight: 14px }

rounded:
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  full: 999px

spacing:
  xs: 4px
  sm: 8px
  cellPadding: 12px
  md: 12px
  lg: 16px
  xl: 24px
  pageMargin: 16px

borderWidths:
  none: 0px

components:
  card-surface:
    rounded: "{rounded.xl}"
    padding: 16px
    borderWidth: 0px
    backgroundColor: "{colors.card-bg-light}"
  detail-section-box:
    width: "100%"
    alignSelf: "stretch"
    rounded: "{rounded.lg}"
    padding: 12px
  button-primary:
    backgroundColor: "{colors.blue}"
    rounded: "{rounded.lg}"
    padding: 14px
  button-secondary:
    backgroundColor: "{colors.bg-soft-light}"
    rounded: "{rounded.lg}"
    padding: 14px
---

# Anki Learning — Minimal & Unified Design Spec

## Overview

Anki adopts a minimal, highly unified design aesthetic. It eliminates explicit colored borders, 3D bottom effects, and visual clutter. Cards rely on subtle surface background contrast (`cardBg` vs `bg`), while detail section blocks fill 100% full width (`alignSelf: "stretch"`) to ensure uniform layout alignment regardless of content length.

---

## Key Layout Rules & Specifications

1. **Full-Width Section Stretch**:
   - Both **CẤU TRÚC TỪ & BỘ THỦ** (`radicalBreakdownBox`) and **CÂU VÍ DỤ** (`exampleContainer`) use `width: "100%"` and `alignSelf: "stretch"`.
   - The parent ScrollView container (`centeredScrollContent` & `detailSheetContainer`) uses `alignItems: "stretch"` to guarantee equal full-width layout across all flashcard detail cards.

2. **Zero Border Colors**:
   - Cards and containers use pure surface fills without explicit border outlines or 3D bottom strokes.

3. **Unified 2-Tier Buttons**:
   - **Primary**: Solid accent fill (`theme.blue` / `theme.green`) with crisp white text.
   - **Secondary**: Soft surface fill (`theme.bgSoft`) with primary text color (`theme.textPrimary`).

4. **Subtle Surface Contrast**:
   - Surfaces use smooth ambient elevation shadows or soft background fills (`theme.bgSoft`, `theme.purpleDim`) instead of stark lines. 

END
