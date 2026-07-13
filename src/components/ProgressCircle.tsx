import React, { useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ProgressCircleProps {
  progress: number; // Value between 0 and 1
  size?: number;
  strokeWidth?: number;
  label?: string;
  subLabel?: string;
}

export default function ProgressCircle({
  progress,
  size = 220,
  strokeWidth = 16,
  label,
  subLabel,
}: ProgressCircleProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const animatedStrokeOffset = useSharedValue(circumference);

  useEffect(() => {
    // Animate stroke offset based on current progress
    const cleanProgress = Math.min(Math.max(progress, 0), 1);
    const strokeOffset = circumference - cleanProgress * circumference;
    animatedStrokeOffset.value = withTiming(strokeOffset, { duration: 800 });
  }, [progress, circumference]);

  const animatedProps = useAnimatedProps(() => {
    return {
      strokeDashoffset: animatedStrokeOffset.value,
    };
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        <Defs>
          <LinearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#8A2387" />
            <Stop offset="50%" stopColor="#E94057" />
            <Stop offset="100%" stopColor="#F27121" />
          </LinearGradient>
        </Defs>

        {/* Background Track Circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        {/* Foreground Progress Circle */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#progressGrad)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          strokeLinecap="round"
          fill="transparent"
          transform={`rotate(-90 ${size / 2} ${size / 2})`} // Start from top
        />
      </Svg>

      {/* Internal Text Labels */}
      <View style={styles.textContainer}>
        {label && <Text style={styles.label}>{label}</Text>}
        {subLabel && <Text style={styles.subLabel}>{subLabel}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  svg: {
    position: 'absolute',
  },
  textContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  subLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#AEAEB2',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
});
