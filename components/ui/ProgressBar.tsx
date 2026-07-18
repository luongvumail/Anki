import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../../constants/theme';

interface ProgressBarProps {
  progress: number; // 0 to 1 or percentage 0 to 100
  height?: number;
  trackColor?: string;
  fillColor?: string;
  style?: ViewStyle;
}

export function ProgressBar({
  progress,
  height = 4,
  trackColor = Colors.bg.tertiary,
  fillColor = Colors.accent.indigo,
  style,
}: ProgressBarProps) {
  const percentage = progress <= 1 ? progress * 100 : Math.min(progress, 100);
  return (
    <View style={[styles.track, { height, backgroundColor: trackColor }, style]}>
      <View
        style={[
          styles.fill,
          { width: `${Math.max(0, percentage)}%`, backgroundColor: fillColor },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    borderRadius: 2,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
});
