import { useColorScheme } from "react-native";
import { useMemo } from "react";
import { useStore } from "../store/useStore";
import {
  LightTheme,
  DarkTheme,
  ColorPalette,
  ThemeMode,
  createCommonStyles,
} from "../constants/theme";

export function useTheme(): {
  theme: ColorPalette;
  themeMode: ThemeMode;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  styles: ReturnType<typeof createCommonStyles>;
} {
  const systemColorScheme = useColorScheme();
  const themeMode = useStore((s) => s.themeMode) || "light";
  const setThemeMode = useStore((s) => s.setThemeMode);

  const isDark = themeMode === "dark" || (themeMode === "system" && systemColorScheme === "dark");

  const theme = isDark ? DarkTheme : LightTheme;

  const styles = useMemo(() => createCommonStyles(theme), [theme]);

  return { theme, themeMode, isDark, setThemeMode, styles };
}
