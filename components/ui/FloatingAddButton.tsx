import React, { useRef, useState } from "react";
import { StyleSheet, View, Animated, PanResponder, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Radii, Layout, Spacing, Animations } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const FAB_SIZE = Layout.fabSize;

interface FloatingAddButtonProps {
  onPress: () => void;
  bottomOffset?: number;
}

export function FloatingAddButton({ onPress, bottomOffset }: FloatingAddButtonProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [pressed, setPressed] = useState(false);

  const defaultBottom =
    bottomOffset !== undefined ? bottomOffset : Math.max(insets.bottom + 65, 80);
  const defaultY = SCREEN_HEIGHT - defaultBottom - FAB_SIZE;
  const defaultX = SCREEN_WIDTH - Spacing.lg - FAB_SIZE;

  const pan = useRef(new Animated.ValueXY({ x: defaultX, y: defaultY })).current;
  const lastPos = useRef({ x: defaultX, y: defaultY });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3;
      },
      onPanResponderGrant: () => {
        setPressed(true);
      },
      onPanResponderMove: (_, gestureState) => {
        pan.setValue({
          x: lastPos.current.x + gestureState.dx,
          y: lastPos.current.y + gestureState.dy,
        });
      },
      onPanResponderRelease: (_, gestureState) => {
        setPressed(false);

        const isTap = Math.abs(gestureState.dx) < 5 && Math.abs(gestureState.dy) < 5;

        if (isTap) {
          onPress();
        } else {
          const rawX = lastPos.current.x + gestureState.dx;
          const rawY = lastPos.current.y + gestureState.dy;

          const clampedX = Math.max(
            Spacing.md,
            Math.min(SCREEN_WIDTH - FAB_SIZE - Spacing.md, rawX),
          );
          const clampedY = Math.max(
            insets.top + Spacing.sm,
            Math.min(SCREEN_HEIGHT - insets.bottom - FAB_SIZE - Spacing.xl, rawY),
          );

          lastPos.current = { x: clampedX, y: clampedY };

          Animated.spring(pan, {
            toValue: { x: clampedX, y: clampedY },
            friction: Animations.springFriction,
            tension: Animations.springTension - 20,
            useNativeDriver: false,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        setPressed(false);
      },
    }),
  ).current;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.fabContainer,
        {
          left: pan.x,
          top: pan.y,
          backgroundColor: theme.blue,
          shadowColor: theme.blue,
        },
        pressed && styles.fabPressed,
      ]}
    >
      <View style={styles.fabInner}>
        <Ionicons name="sparkles" size={Layout.iconLg} color="#FFFFFF" />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    position: "absolute",
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: Radii.full,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
  fabPressed: {
    transform: [{ scale: 0.92 }],
  },
  fabInner: {
    alignItems: "center",
    justifyContent: "center",
  },
});
