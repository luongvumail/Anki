import React, { useEffect, useRef } from "react";
import { Text, TouchableOpacity, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  Radii,
  Spacing,
  Typography,
  Layout,
  BorderWidths,
  Animations,
  triggerHaptic,
} from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";

export interface ErrorToastProps {
  visible: boolean;
  message: string;
  onRetry?: () => void;
  onDismiss: () => void;
}

export const ErrorToast = React.memo(function ErrorToast({
  visible,
  message,
  onRetry,
  onDismiss,
}: ErrorToastProps) {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const { theme } = useTheme();

  useEffect(() => {
    if (visible) {
      triggerHaptic("error");
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: Animations.springTension,
        friction: Animations.springFriction,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        onDismiss();
      }, 5000);

      return () => clearTimeout(timer);
    } else {
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: Animations.timingShort + 50,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim, onDismiss]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        {
          backgroundColor: theme.cardBg,
          borderColor: theme.red,
          shadowColor: theme.red,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Ionicons name="alert-circle" size={Layout.iconLg} color={theme.red} />
      <Text style={[styles.messageText, { color: theme.textPrimary }]} numberOfLines={2}>
        {message}
      </Text>

      {onRetry && (
        <TouchableOpacity
          style={[styles.retryBtn, { backgroundColor: theme.red }]}
          onPress={onRetry}
        >
          <Text style={styles.retryText}>THỬ LẠI</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={onDismiss} style={styles.closeBtn}>
        <Ionicons name="close" size={Layout.iconMd} color={theme.textMuted} />
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  toastContainer: {
    position: "absolute",
    top: Spacing.xxl,
    left: Spacing.pageMargin,
    right: Spacing.pageMargin,
    zIndex: 1000,
    borderRadius: Radii.lg,
    borderWidth: BorderWidths.default,
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    gap: Spacing.cellPadding,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  messageText: {
    flex: 1,
    fontSize: Typography.caption.fontSize,
    fontWeight: Typography.weight.bold,
  },
  retryBtn: {
    paddingHorizontal: Spacing.cellPadding,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  retryText: {
    fontSize: Typography.caption2.fontSize,
    fontWeight: Typography.weight.extraBold,
    color: "#FFFFFF",
  },
  closeBtn: {
    padding: Spacing.xs,
  },
});
