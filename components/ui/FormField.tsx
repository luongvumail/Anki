import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors, Typography, Spacing, Radii } from '../../constants/theme';

interface FormFieldProps extends TextInputProps {
  label: string;
  error?: string;
  helperText?: string;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
}

export function FormField({
  label,
  error,
  helperText,
  containerStyle,
  inputStyle,
  labelStyle,
  onFocus,
  onBlur,
  ...props
}: FormFieldProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.fieldBox, containerStyle]}>
      <Text style={[styles.fieldLabel, labelStyle]}>{label}</Text>
      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.inputWrapperFocused,
          !!error && styles.inputWrapperError,
        ]}
      >
        <TextInput
          style={[styles.input, inputStyle]}
          placeholderTextColor={Colors.text.tertiary}
          onFocus={(e) => {
            setIsFocused(true);
            if (onFocus) onFocus(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            if (onBlur) onBlur(e);
          }}
          {...props}
        />
      </View>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fieldBox: {
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    fontSize: Typography.text.caption2.fontSize,
    fontWeight: Typography.weight.bold,
    color: Colors.text.secondary,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 6,
    marginLeft: 2,
  },
  inputWrapper: {
    backgroundColor: Colors.bg.tertiary,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.border.default,
    minHeight: 46,
    justifyContent: 'center',
  },
  inputWrapperFocused: {
    borderColor: Colors.accent.indigo,
    backgroundColor: Colors.bg.tertiary,
  },
  inputWrapperError: {
    borderColor: Colors.neon.coral,
  },
  input: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: Typography.text.subhead.fontSize,
    color: Colors.text.primary,
  },
  errorText: {
    fontSize: Typography.text.caption2.fontSize,
    color: Colors.neon.coral,
    marginTop: 4,
    marginLeft: 2,
  },
  helperText: {
    fontSize: Typography.text.caption2.fontSize,
    color: Colors.text.tertiary,
    marginTop: 4,
    marginLeft: 2,
  },
});
