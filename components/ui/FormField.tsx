import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
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
  const inputRef = useRef<TextInput>(null);

  return (
    <Pressable style={[styles.fieldBox, containerStyle]} onPress={() => inputRef.current?.focus()}>
      <Text style={[styles.fieldLabel, labelStyle]}>{label}</Text>
      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.inputWrapperFocused,
          !!error && styles.inputWrapperError,
        ]}
      >
        <TextInput
          ref={inputRef}
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
    </Pressable>
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
    minHeight: 48,
    justifyContent: 'center',
  },
  inputWrapperFocused: {
    backgroundColor: Colors.bg.tertiary,
  },
  inputWrapperError: {
    backgroundColor: Colors.bg.tertiary,
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
