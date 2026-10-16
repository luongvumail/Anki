import React, { useState } from "react";
import { TouchableOpacity, View, StyleSheet, ViewStyle } from "react-native";
import { Radii, Spacing, triggerHaptic } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";

export interface AppCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: "default" | "active" | "success" | "error";
  style?: ViewStyle;
  padding?: number;
}

export function AppCard({
  children,
  onPress,
  variant = "default",
  style,
  padding = Spacing.md,
}: AppCardProps) {
  const [pressed, setPressed] = useState(false);
  const { theme } = useTheme();

  const getVariantStyle = () => {
    switch (variant) {
      case "active":
        return {
          bg: theme.blueDim,
          border: theme.blue,
        };
      case "success":
        return {
          bg: theme.greenDim,
          border: theme.green,
        };
      case "error":
        return {
          bg: theme.redDim,
          border: theme.red,
        };
      case "default":
      default:
        return {
          bg: theme.cardBg,
          border: theme.cardBorder,
        };
    }
  };

  const vColors = getVariantStyle();

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={() => {
          triggerHaptic("light");
          setPressed(true);
        }}
        onPressOut={() => setPressed(false)}
        onPress={onPress}
        style={[
          styles.cardBase,
          {
            backgroundColor: vColors.bg,
            borderColor: vColors.border || theme.cardBorder,
            shadowOpacity: theme.isDark ? 0.3 : 0.07,
            transform: [{ scale: pressed ? 0.98 : 1 }],
            opacity: pressed ? 0.92 : 1,
            padding,
          },
          style,
        ]}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={[
        styles.cardBase,
        {
          backgroundColor: vColors.bg,
          borderColor: vColors.border || theme.cardBorder,
          shadowOpacity: theme.isDark ? 0.3 : 0.07,
          padding,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  cardBase: {
    width: "100%",
    borderRadius: Radii.lg,
    borderWidth: 1,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
});
