import React from "react";
import { Text, StyleSheet, TextStyle } from "react-native";
import { Typography, Spacing } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";

interface SectionTitleProps {
  children: React.ReactNode;
  style?: TextStyle;
}

export const SectionTitle = React.memo(function SectionTitle({
  children,
  style,
}: SectionTitleProps) {
  const { theme } = useTheme();
  return <Text style={[styles.title, { color: theme.textMuted }, style]}>{children}</Text>;
});

const styles = StyleSheet.create({
  title: {
    fontSize: Typography.caption.fontSize,
    fontWeight: Typography.weight.extraBold,
    letterSpacing: 0.8,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    marginLeft: 4,
    textTransform: "uppercase",
  },
});
