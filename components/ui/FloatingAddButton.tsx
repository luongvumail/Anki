import React, { useRef, useState } from "react";
import {
  StyleSheet,
  View,
  Animated,
  PanResponder,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Radii, triggerHaptic } from "../../constants/theme";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const FAB_SIZE = 54;

interface FloatingAddButtonProps {
  onPress: () => void;
  bottomOffset?: number;
}

export function FloatingAddButton({ onPress, bottomOffset }: FloatingAddButtonProps) {
  const insets = useSafeAreaInsets();
  const [pressed, setPressed] = useState(false);

  const defaultBottom = bottomOffset !== undefined ? bottomOffset : Math.max(insets.bottom + 65, 80);
  const defaultY = SCREEN_HEIGHT - defaultBottom - FAB_SIZE;
  const defaultX = SCREEN_WIDTH - 18 - FAB_SIZE;

  // Single Animated.ValueXY initialized at default position
  const pan = useRef(new Animated.ValueXY({ x: defaultX, y: defaultY })).current;

  // Ref storing the exact settled position across drags & taps
  const lastPos = useRef({ x: defaultX, y: defaultY });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3;
      },
      onPanResponderGrant: () => {
        setPressed(true);
        triggerHaptic("light");
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
          triggerHaptic("medium");
          onPress();
        } else {
          const rawX = lastPos.current.x + gestureState.dx;
          const rawY = lastPos.current.y + gestureState.dy;

          // Clamp bounds within visible screen
          const clampedX = Math.max(12, Math.min(SCREEN_WIDTH - FAB_SIZE - 12, rawX));
          const clampedY = Math.max(insets.top + 10, Math.min(SCREEN_HEIGHT - insets.bottom - FAB_SIZE - 20, rawY));

          lastPos.current = { x: clampedX, y: clampedY };

          Animated.spring(pan, {
            toValue: { x: clampedX, y: clampedY },
            friction: 7,
            tension: 50,
            useNativeDriver: false,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        setPressed(false);
      },
    })
  ).current;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.fabContainer,
        {
          left: pan.x,
          top: pan.y,
        },
        pressed && styles.fabPressed,
      ]}
    >
      <View style={styles.fabInner}>
        <Ionicons name="sparkles" size={26} color="#FFFFFF" />
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
    backgroundColor: Colors.duolingo.green,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
    shadowColor: Colors.duolingo.green,
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
