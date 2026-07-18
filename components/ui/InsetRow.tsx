import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Colors, Typography, Spacing } from '../../constants/theme';

interface InsetRowProps {
  label: string;
  value?: string | number;
  valueColor?: string;
  isBorder?: boolean;
  right?: React.ReactNode;
  style?: ViewStyle;
  labelStyle?: TextStyle;
  valueStyle?: TextStyle;
}

export function InsetRow({
  label,
  value,
  valueColor,
  isBorder = false,
  right,
  style,
  labelStyle,
  valueStyle,
}: InsetRowProps) {
  return (
    <View style={[styles.row, isBorder && styles.cellBorderTop, style]}>
      <Text style={[styles.label, labelStyle]}>{label}</Text>
      {right ? (
        right
      ) : (
        <Text
          style={[
            styles.value,
            valueColor ? { color: valueColor, fontWeight: Typography.weight.semibold } : null,
            valueStyle,
          ]}
        >
          {value ?? ''}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.cellHorizontal,
    paddingVertical: Spacing.cellVertical,
    minHeight: Spacing.cellMinHeight,
  },
  cellBorderTop: {
    borderTopWidth: 1,
    borderTopColor: Colors.border.separator,
  },
  label: {
    width: 140,
    fontSize: Typography.text.body.fontSize,
    color: Colors.text.primary,
    fontWeight: Typography.weight.medium,
  },
  value: {
    flex: 1,
    fontSize: Typography.text.body.fontSize,
    color: Colors.text.secondary,
  },
});
