import React, { useState } from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from "react-native";
import { Colors, Radii, triggerHaptic } from "../../constants/theme";

export type DuolingoButtonVariant =
  | "primary"
  | "success"
  | "blue"
  | "error"
  | "purple"
  | "yellow"
  | "secondary"
  | "ghost";

export type DuolingoButtonSize = "lg" | "md" | "sm";

export interface DuolingoButtonProps {
  title: string;
  onPress: () => void;
  variant?: DuolingoButtonVariant;
  size?: DuolingoButtonSize;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
  height?: number;
}

export function DuolingoButton({
  title,
  onPress,
  variant = "primary",
  size = "lg",
  disabled = false,
  style,
  textStyle,
  icon,
  height,
}: DuolingoButtonProps) {
  const [pressed, setPressed] = useState(false);

  // Size Presets (Hoạt động giống CSS classes: btn-lg=52px, btn-md=44px, btn-sm=36px)
  const getSizeStyle = () => {
    switch (size) {
      case "sm":
        return { height: height || 36, fontSize: 13, paddingHorizontal: 12 };
      case "md":
        return { height: height || 44, fontSize: 14, paddingHorizontal: 14 };
      case "lg":
      default:
        return { height: height || 52, fontSize: 16, paddingHorizontal: 16 };
    }
  };

  const sizeStyle = getSizeStyle();

  const getVariantStyles = () => {
    if (disabled) {
      return {
        bg: Colors.duolingo.disabled,
        bottom: Colors.duolingo.cardBottom,
        text: Colors.duolingo.disabledText,
      };
    }

    switch (variant) {
      case "primary":
      case "success":
        return {
          bg: Colors.duolingo.green,
          bottom: Colors.duolingo.greenDark,
          text: "#FFFFFF",
        };
      case "blue":
        return {
          bg: Colors.duolingo.blue,
          bottom: Colors.duolingo.blueDark,
          text: "#FFFFFF",
        };
      case "error":
        return {
          bg: Colors.duolingo.red,
          bottom: Colors.duolingo.redDark,
          text: "#FFFFFF",
        };
      case "purple":
        return {
          bg: Colors.duolingo.purple,
          bottom: Colors.duolingo.purpleDark,
          text: "#FFFFFF",
        };
      case "yellow":
        return {
          bg: Colors.duolingo.yellow,
          bottom: Colors.duolingo.yellowDark,
          text: Colors.duolingo.text,
        };
      case "secondary":
        return {
          bg: Colors.duolingo.bgSoftDark,
          bottom: Colors.duolingo.cardBottom,
          text: "#FFFFFF",
        };
      case "ghost":
        return {
          bg: "transparent",
          bottom: "transparent",
          text: Colors.duolingo.blue,
        };
    }
  };

  const vColors = getVariantStyles();

  const handlePressIn = () => {
    if (disabled) return;
    setPressed(true);
    triggerHaptic("light");
  };

  const handlePressOut = () => {
    if (disabled) return;
    setPressed(false);
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      style={[
        styles.buttonBase,
        {
          height: sizeStyle.height,
          paddingHorizontal: sizeStyle.paddingHorizontal,
          backgroundColor: vColors.bg,
          borderBottomColor: vColors.bottom,
          borderBottomWidth: pressed ? 0 : 4,
          transform: [{ translateY: pressed ? 4 : 0 }],
        },
        style,
      ]}
    >
      {icon}
      <Text
        style={[
          styles.buttonText,
          {
            fontSize: sizeStyle.fontSize,
            color: vColors.text,
          },
          textStyle,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  buttonBase: {
    width: "100%",
    borderRadius: Radii.lg, // --radius-lg: 16px
    borderWidth: 0, // KHÔNG border mảnh bao quanh (Rule 2)
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  buttonText: {
    fontWeight: "800", // font-weight: 800
    letterSpacing: 0.5,
    textAlign: "center",
    textAlignVertical: "center",
    includeFontPadding: false,
    textTransform: "uppercase",
  },
});
