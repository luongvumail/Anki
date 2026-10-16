import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { Radii, Spacing } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";

interface ProgressBarProps {
  progress: number;
  height?: number;
  trackColor?: string;
  fillColor?: string;
  style?: ViewStyle;
}

export const ProgressBar = React.memo(function ProgressBar({
  progress,
  height = Spacing.cellPadding,
  trackColor,
  fillColor,
  style,
}: ProgressBarProps) {
  const { theme } = useTheme();
  const percentage = progress <= 1 ? progress * 100 : Math.min(progress, 100);

  const resolvedTrackColor = trackColor || theme.bgSoft;
  const resolvedFillColor = fillColor || theme.blue;

  return (
    <View style={[styles.track, { height, backgroundColor: resolvedTrackColor }, style]}>
      <View
        style={[
          styles.fill,
          { width: `${Math.max(0, percentage)}%`, backgroundColor: resolvedFillColor },
        ]}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  track: {
    borderRadius: Radii.full,
    overflow: "hidden",
    width: "100%",
  },
  fill: {
    height: "100%",
    borderRadius: Radii.full,
  },
});
