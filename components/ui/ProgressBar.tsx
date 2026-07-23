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

export const ProgressBar = React.memo(function ProgressBar({
  progress,
  height = 14,
  trackColor = Colors.duolingo.disabledBg,
  fillColor = Colors.duolingo.green,
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
      >
        <View style={styles.highlightBar} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  track: {
    borderRadius: 999,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
    position: 'relative',
    overflow: 'hidden',
  },
  highlightBar: {
    position: 'absolute',
    top: 2,
    left: 8,
    right: 8,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 999,
  },
});
