import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { Colors, Typography, Spacing } from '../../constants/theme';

interface SectionTitleProps {
  children: React.ReactNode;
  style?: TextStyle;
}

export const SectionTitle = React.memo(function SectionTitle({ children, style }: SectionTitleProps) {
  return <Text style={[styles.title, style]}>{children}</Text>;
});

const styles = StyleSheet.create({
  title: {
    fontSize: Typography.text.caption1.fontSize,
    color: Colors.text.secondary,
    fontWeight: Typography.weight.semibold,
    letterSpacing: -0.08,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
    marginLeft: 4,
  },
});
