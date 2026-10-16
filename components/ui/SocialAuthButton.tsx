import React, { useState } from "react";
import { Text, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Radii, Typography, Layout, Spacing, triggerHaptic } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";

interface SocialAuthButtonProps {
  provider: "google" | "apple";
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export function SocialAuthButton({
  provider,
  onPress,
  loading = false,
  disabled = false,
}: SocialAuthButtonProps) {
  const { theme } = useTheme();
  const [pressed, setPressed] = useState(false);

  const isGoogle = provider === "google";
  const title = loading
    ? "ĐANG KẾT NỐI..."
    : isGoogle
      ? "Tiếp tục với Google"
      : "Tiếp tục với Apple";

  const handlePressIn = () => {
    if (disabled || loading) return;
    triggerHaptic("light");
    setPressed(true);
  };

  const handlePressOut = () => {
    if (disabled || loading) return;
    setPressed(false);
  };

  const handlePress = () => {
    if (disabled || loading) return;
    onPress();
  };

  // Styling adheres strictly to DESIGN.md surface contrast
  const bgStyle = isGoogle
    ? { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }
    : { backgroundColor: theme.isDark ? "#F8FAFC" : "#0F172A", borderColor: "transparent" };

  const textStyle = isGoogle
    ? { color: theme.textPrimary }
    : { color: theme.isDark ? "#0F172A" : "#FFFFFF" };

  const iconColor = isGoogle ? "#EA4335" : theme.isDark ? "#0F172A" : "#FFFFFF";

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled || loading}
      style={[
        styles.btn,
        bgStyle,
        {
          transform: [{ scale: pressed ? 0.97 : 1 }],
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <View style={styles.contentRow}>
        <Ionicons
          name={isGoogle ? "logo-google" : "logo-apple"}
          size={Layout.iconLg}
          color={iconColor}
          style={styles.icon}
        />
        <Text style={[styles.title, textStyle]}>{title}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: Layout.btnHeightXl,
    borderRadius: Radii.lg,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    marginRight: Spacing.md,
  },
  title: {
    fontSize: Typography.subhead.fontSize,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.3,
  },
});
