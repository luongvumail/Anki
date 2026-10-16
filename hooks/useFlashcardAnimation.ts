import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Animated } from "react-native";
import * as Speech from "expo-speech";
import { triggerHaptic } from "../constants/theme";
import { APP_CONFIG } from "../constants/config";

export function useFlashcardAnimation(
  character: string = "",
  initialRevealed: boolean = false,
  onReveal?: () => void,
) {
  const [isRevealed, setIsRevealed] = useState(initialRevealed);
  const [speaking, setSpeaking] = useState(false);
  const detailAnim = useRef(new Animated.Value(initialRevealed ? 1 : 0)).current;

  const currentCardRef = useRef(character);

  // Sync state only when character actually changes (swiping to another card)
  useEffect(() => {
    if (currentCardRef.current !== character) {
      currentCardRef.current = character;
      setIsRevealed(initialRevealed);
      detailAnim.setValue(initialRevealed ? 1 : 0);
    }
  }, [character, initialRevealed, detailAnim]);

  const handleToggleDetail = useCallback(() => {
    if (isRevealed) return;

    triggerHaptic("selection");
    setIsRevealed(true);

    Animated.spring(detailAnim, {
      toValue: 1,
      friction: 7,
      tension: 45,
      useNativeDriver: true,
    }).start(() => {
      if (onReveal) {
        onReveal();
      }
    });
  }, [isRevealed, detailAnim, onReveal]);

  const playTTS = useCallback(() => {
    if (!character) return;
    setSpeaking(true);
    Speech.stop();
    Speech.speak(character, {
      language: "zh-CN",
      rate: APP_CONFIG.SPEECH_RATE,
      onDone: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  }, [character]);

  // Clean up speech when switching cards or unmounting
  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, [character]);

  // Interpolations for smooth detail reveal while maintaining exact center positioning
  const hanziShiftY = detailAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -4],
  });

  const detailTranslateY = detailAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 0],
  });

  const detailScale = detailAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1],
  });

  const detailOpacity = detailAnim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 0.6, 1],
  });

  const hintOpacity = detailAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0, 0],
  });

  const hanziAnimatedStyle = useMemo(
    () => ({
      transform: [{ translateY: hanziShiftY }],
    }),
    [hanziShiftY],
  );

  const detailAnimatedStyle = useMemo(
    () => ({
      opacity: detailOpacity,
      transform: [{ translateY: detailTranslateY }, { scale: detailScale }],
    }),
    [detailOpacity, detailTranslateY, detailScale],
  );

  const hintAnimatedStyle = useMemo(
    () => ({
      opacity: hintOpacity,
    }),
    [hintOpacity],
  );

  return {
    isRevealed,
    speaking,
    hanziAnimatedStyle,
    detailAnimatedStyle,
    hintAnimatedStyle,
    handleToggleDetail,
    handleFlip: handleToggleDetail, // Alias for backward compatibility
    playTTS,
  };
}
