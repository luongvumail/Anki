import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Radii } from '../../constants/theme';

interface InsetGroupProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const InsetGroup = React.memo(function InsetGroup({ children, style }: InsetGroupProps) {
  return <View style={[styles.insetGroup, style]}>{children}</View>;
});

const styles = StyleSheet.create({
  insetGroup: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radii.card,
    overflow: 'hidden',
  },
});
