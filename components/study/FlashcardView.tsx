import React, { useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  PanResponder,
  Pressable,
  Easing,
  useWindowDimensions,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { Card } from "../../store/slices/types";
import { Spacing, Radii, Typography, BorderWidths, triggerHaptic } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import { AudioButton } from "../ui/AudioButton";
import { getPinyinToneColor } from "../../lib/pinyinColor";
import { useFlashcardAnimation } from "../../hooks/useFlashcardAnimation";

interface FlashcardViewProps {
  card: Card;
  onNext?: () => void;
  onPrev?: () => void;
  currentIndex?: number;
  totalCards?: number;
  showNextButton?: boolean;
  isRevealedInitially?: boolean;
  onReveal?: () => void;
}

export const FlashcardView = React.memo(function FlashcardView({
  card,
  onNext,
  onPrev,
  isRevealedInitially = false,
  onReveal,
}: FlashcardViewProps) {
  const { width } = useWindowDimensions();
  const { theme } = useTheme();
  const cardWidth = width - Spacing.pageMargin * 2;

  const swipeAnim = useRef(new Animated.Value(0)).current;

  const {
    isRevealed,
    speaking,
    hanziAnimatedStyle,
    detailAnimatedStyle,
    handleToggleDetail,
    playTTS,
  } = useFlashcardAnimation(card?.character || "", isRevealedInitially, onReveal);

  // Keep latest callbacks in ref to avoid stale closures in PanResponder
  const callbacksRef = useRef({ onNext, onPrev, handleToggleDetail });
  callbacksRef.current = { onNext, onPrev, handleToggleDetail };

  // Reset swipe animation position when card changes
  React.useEffect(() => {
    swipeAnim.setValue(0);
  }, [card?.id, swipeAnim]);

  // TikTok-Style Vertical Swipe Animation & Tap PanResponder
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return (
          Math.abs(gestureState.dy) > 8 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.2
        );
      },
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        return (
          Math.abs(gestureState.dy) > 8 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.2
        );
      },
      onPanResponderGrant: () => {
        swipeAnim.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        swipeAnim.setValue(gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        const { dy, dx, vy } = gestureState;
        const {
          onNext: nextFn,
          onPrev: prevFn,
          handleToggleDetail: toggleFn,
        } = callbacksRef.current;

        if (dy < -60 || vy < -0.45) {
          // Swipe UP -> Next Card
          triggerHaptic("selection");
          Animated.timing(swipeAnim, {
            toValue: -750,
            duration: 220,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start(() => {
            if (nextFn) nextFn();
          });
        } else if (dy > 60 || vy > 0.45) {
          // Swipe DOWN -> Previous Card
          triggerHaptic("selection");
          Animated.timing(swipeAnim, {
            toValue: 750,
            duration: 220,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start(() => {
            if (prevFn) prevFn();
          });
        } else if (Math.abs(dy) < 18 && Math.abs(dx) < 18) {
          // Tap anywhere on card -> Toggle Detail Reveal
          Animated.spring(swipeAnim, {
            toValue: 0,
            friction: 7,
            tension: 50,
            useNativeDriver: true,
          }).start();
          toggleFn();
        } else {
          // Snap back smoothly if threshold not met
          Animated.spring(swipeAnim, {
            toValue: 0,
            velocity: vy,
            friction: 7,
            tension: 50,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  // Fluid TikTok swipe interpolations
  const swipeOpacity = swipeAnim.interpolate({
    inputRange: [-350, 0, 350],
    outputRange: [0.35, 1, 0.35],
    extrapolate: "clamp",
  });

  const swipeScale = swipeAnim.interpolate({
    inputRange: [-350, 0, 350],
    outputRange: [0.94, 1, 0.94],
    extrapolate: "clamp",
  });

  const swipeRotate = swipeAnim.interpolate({
    inputRange: [-400, 0, 400],
    outputRange: ["-2.5deg", "0deg", "2.5deg"],
    extrapolate: "clamp",
  });

  const cardThemeStyle = React.useMemo(
    () => ({
      width: cardWidth,
      backgroundColor: theme.cardBg,
      borderColor: theme.isDark ? theme.cardBorder : "rgba(15, 23, 42, 0.12)",
      borderBottomColor: theme.cardBottom,
      shadowColor: theme.isDark ? "#000000" : "#0F172A",
      shadowOpacity: theme.isDark ? 0.3 : 0.16,
      shadowRadius: theme.isDark ? 16 : 24,
      shadowOffset: { width: 0, height: 8 },
      elevation: theme.isDark ? 4 : 10,
    }),
    [cardWidth, theme.cardBg, theme.cardBorder, theme.cardBottom, theme.isDark],
  );

  if (!card) return null;

  return (
    <View style={styles.container}>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.fullCardContainer,
          cardThemeStyle,
          {
            opacity: swipeOpacity,
            transform: [{ translateY: swipeAnim }, { scale: swipeScale }, { rotate: swipeRotate }],
          },
        ]}
      >
        {/* Main Content Area (Click Anywhere to Toggle Detail) */}
        <Pressable style={styles.centerStageContainer} onPress={handleToggleDetail}>
          <ScrollView
            style={styles.scrollViewStyle}
            contentContainerStyle={styles.centeredScrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
            scrollEnabled={isRevealed}
          >
            {/* Always Centered Hanzi Header */}
            <Animated.View style={[styles.hanziWrapper, hanziAnimatedStyle]}>
              <Pressable onPress={handleToggleDetail} hitSlop={12}>
                <Text style={[styles.mainCharacter, { color: theme.textPrimary }]}>
                  {card.character}
                </Text>
              </Pressable>

              <View style={styles.audioRow}>
                <AudioButton onPress={playTTS} isPlaying={speaking} size="md" />
              </View>
            </Animated.View>

            {/* Expanded Detail Sheet (Centered inside card) */}
            {isRevealed && (
              <Animated.View style={[styles.detailSheetContainer, detailAnimatedStyle]}>
                {/* Pinyin */}
                <Text style={[styles.detailPinyin, { color: getPinyinToneColor(card.pinyin) }]}>
                  {card.pinyin}
                </Text>

                {/* Translation */}
                <Text style={[styles.detailTranslation, { color: theme.textPrimary }]}>
                  {card.translation}
                </Text>

                {/* Hán Việt Tag */}
                {card.hanviet ? (
                  <View style={styles.badgesRow}>
                    <View style={[styles.tagBadge, { backgroundColor: theme.blueDim }]}>
                      <Text style={[styles.tagText, { color: theme.blue }]}>
                        Hán Việt: {card.hanviet}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {/* Word Structure & Radical Breakdown Box */}
                {card.radical ? (
                  <View style={[styles.radicalBreakdownBox, { backgroundColor: theme.purpleDim }]}>
                    <View style={styles.radicalBreakdownHeader}>
                      <Ionicons name="git-network-outline" size={16} color={theme.purple} />
                      <Text style={[styles.radicalBreakdownTitle, { color: theme.purple }]}>
                        CẤU TRÚC TỪ & BỘ THỦ
                      </Text>
                    </View>
                    <Text style={[styles.radicalBreakdownText, { color: theme.textPrimary }]}>
                      {card.radical}
                    </Text>
                  </View>
                ) : null}

                {/* Example Sentences */}
                {card.examples && card.examples.length > 0 ? (
                  <View style={[styles.exampleContainer, { backgroundColor: theme.bgSoft }]}>
                    <View style={styles.exampleHeaderRow}>
                      <Ionicons name="book-outline" size={16} color={theme.textMuted} />
                      <Text style={[styles.exampleHeaderTitle, { color: theme.textMuted }]}>
                        CÂU VÍ DỤ
                      </Text>
                    </View>
                    {card.examples.map((ex, idx) => (
                      <View
                        key={idx}
                        style={[
                          styles.exampleItem,
                          idx > 0 && {
                            marginTop: Spacing.sm,
                            paddingTop: Spacing.sm,
                            borderTopWidth: 1,
                            borderTopColor: theme.cardBorder,
                          },
                        ]}
                      >
                        <Text style={[styles.exampleCn, { color: theme.textPrimary }]}>
                          {ex.chinese}
                        </Text>
                        {ex.pinyin ? (
                          <Text style={[styles.examplePy, { color: theme.blue }]}>{ex.pinyin}</Text>
                        ) : null}
                        {ex.vietnamese ? (
                          <Text style={[styles.exampleVi, { color: theme.textMuted }]}>
                            {ex.vietnamese}
                          </Text>
                        ) : null}
                      </View>
                    ))}
                  </View>
                ) : null}
              </Animated.View>
            )}
          </ScrollView>
        </Pressable>
      </Animated.View>

      {/* Fixed Footer Guidance */}
      <View style={styles.footerGuidanceContainer}>
        {!isRevealed && (
          <Text style={[styles.tapHintSmallText, { color: theme.textMuted }]}>
            Chạm vào thẻ để xem nghĩa & chi tiết
          </Text>
        )}

        <View style={styles.swipeHintFooter}>
          <Ionicons name="swap-vertical" size={13} color={theme.textMuted} />
          <Text style={[styles.swipeHintFooterText, { color: theme.textMuted }]}>
            Vuốt lên để xem tiếp • Vuốt xuống để quay lại
          </Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.pageMargin,
    paddingVertical: Spacing.md,
  },
  fullCardContainer: {
    flex: 1,
    width: "100%",
    borderRadius: Radii.xl,
    padding: Spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: BorderWidths.thin,
  },
  centerStageContainer: {
    flex: 1,
    width: "100%",
    alignSelf: "stretch",
    alignItems: "stretch",
    justifyContent: "center",
  },
  scrollViewStyle: {
    width: "100%",
    alignSelf: "stretch",
  },
  centeredScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "stretch",
    width: "100%",
    paddingVertical: Spacing.sm,
  },
  hanziWrapper: {
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  mainCharacter: {
    fontSize: Typography.hanziHero.fontSize + 4,
    fontWeight: Typography.weight.extraBold,
    textAlign: "center",
  },
  audioRow: {
    marginTop: Spacing.xs,
    alignItems: "center",
  },
  detailSheetContainer: {
    width: "100%",
    alignSelf: "stretch",
    marginTop: Spacing.sm,
    alignItems: "stretch",
  },
  detailPinyin: {
    fontSize: Typography.title3.fontSize + 2,
    fontWeight: Typography.weight.bold,
    marginTop: Spacing.xs,
    textAlign: "center",
    alignSelf: "center",
  },
  detailTranslation: {
    fontSize: Typography.callout.fontSize + 1,
    marginTop: Spacing.xs,
    fontWeight: Typography.weight.extraBold,
    textAlign: "center",
    alignSelf: "center",
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  tagBadge: {
    paddingHorizontal: Spacing.cellPadding,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.md,
  },
  tagText: {
    fontSize: Typography.caption.fontSize,
    fontWeight: Typography.weight.bold,
  },
  radicalBreakdownBox: {
    width: "100%",
    alignSelf: "stretch",
    borderRadius: Radii.lg,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    alignItems: "center",
  },
  radicalBreakdownHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  radicalBreakdownTitle: {
    fontSize: Typography.caption2.fontSize,
    fontWeight: Typography.weight.extraBold,
    letterSpacing: 0.8,
  },
  radicalBreakdownText: {
    fontSize: Typography.caption.fontSize + 1,
    fontWeight: Typography.weight.semibold,
    textAlign: "center",
    lineHeight: 18,
  },
  exampleContainer: {
    width: "100%",
    alignSelf: "stretch",
    borderRadius: Radii.lg,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    alignItems: "center",
  },
  exampleHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  exampleHeaderTitle: {
    fontSize: Typography.caption2.fontSize,
    fontWeight: Typography.weight.extraBold,
    letterSpacing: 0.8,
  },
  exampleItem: {
    width: "100%",
    alignItems: "center",
  },
  exampleCn: {
    fontSize: Typography.subhead.fontSize,
    fontWeight: Typography.weight.extraBold,
    textAlign: "center",
  },
  examplePy: {
    fontSize: Typography.caption.fontSize,
    marginTop: 2,
    textAlign: "center",
  },
  exampleVi: {
    fontSize: Typography.caption.fontSize,
    marginTop: 2,
    textAlign: "center",
  },
  footerGuidanceContainer: {
    alignItems: "center",
    marginTop: Spacing.xs,
    paddingTop: Spacing.xs,
  },
  tapHintSmallText: {
    fontSize: Typography.caption2.fontSize, // 11px small font
    fontWeight: Typography.weight.semibold,
    textAlign: "center",
    marginBottom: 2,
    opacity: 0.85,
  },
  swipeHintFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  swipeHintFooterText: {
    fontSize: Typography.caption2.fontSize,
    fontWeight: Typography.weight.semibold,
  },
});
