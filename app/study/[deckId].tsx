import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  useWindowDimensions,
  ActivityIndicator,
  ScrollView,
  PanResponder,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Speech from "expo-speech";
import { useStore } from "../../store/useStore";
import { SRS_GRADES } from "../../lib/srs";
import { getPinyinToneColor } from "../../lib/pinyinColor";
import { Colors, Typography, Spacing, Radii, triggerHaptic } from "../../constants/theme";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { SRSButtons } from "../../components/study/SRSButtons";
import { SessionDoneScreen } from "../../components/study/SessionDoneScreen";

const SWIPE_THRESHOLD = 90;

export default function StudyScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const cardWidth = width - Spacing.pageMargin * 2;
  const cardHeight = height * 0.54;

  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  const { session, startSession, endSession, advanceSession, gradeCard, decks } = useStore();

  const [flipped, setFlipped] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [activeSwipeDirection, setActiveSwipeDirection] = useState<
    "left" | "right" | "up" | "down" | null
  >(null);

  const slideAnim = useRef(new Animated.Value(0)).current; // 0 (front) -> 1 (revealed/expanded)
  const pan = useRef(new Animated.ValueXY()).current;

  // Computed values
  const deck = decks.find((d) => d.id === deckId);
  const currentCard = session?.queue[session.currentIndex ?? 0];
  const isSessionDone = session && session.currentIndex >= session.queue.length;
  const progress = session ? session.currentIndex / Math.max(session.queue.length, 1) : 0;

  // Refs for PanResponder handlers
  const flippedRef = useRef(flipped);
  const currentCardRef = useRef(currentCard);
  const sessionRef = useRef(session);
  useEffect(() => {
    flippedRef.current = flipped;
  }, [flipped]);
  useEffect(() => {
    currentCardRef.current = currentCard;
  }, [currentCard]);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    if (deckId) startSession(deckId);
    return () => {
      Speech.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId]);

  // Apple / Duolingo Style Reveal (Smooth Slide Up & Spring Expand)
  const flipCard = () => {
    if (flipped) return;
    triggerHaptic("light");
    setFlipped(true);

    Animated.spring(slideAnim, {
      toValue: 1,
      friction: 7,
      tension: 65,
      useNativeDriver: true,
    }).start();
  };

  const resetCardPosition = () => {
    slideAnim.setValue(0);
    pan.setValue({ x: 0, y: 0 });
    setFlipped(false);
    setActiveSwipeDirection(null);
  };

  const handleGrade = async (grade: number, direction: "left" | "right" | "up" | "down") => {
    const card = currentCardRef.current;
    const sess = sessionRef.current;
    if (!card || !sess) return;

    if (grade === SRS_GRADES.AGAIN) triggerHaptic("error");
    else if (grade === SRS_GRADES.HARD) triggerHaptic("warning");
    else triggerHaptic("success");

    await gradeCard(card, grade as any);

    const targetX = direction === "left" ? -width * 1.3 : direction === "right" ? width * 1.3 : 0;
    const targetY = direction === "up" ? -height * 1.3 : direction === "down" ? height * 1.3 : 0;

    const isLastCard = sess.currentIndex + 1 >= sess.queue.length && grade !== SRS_GRADES.AGAIN;

    Animated.timing(pan, {
      toValue: { x: targetX, y: targetY },
      duration: 260,
      useNativeDriver: true,
    }).start(() => {
      resetCardPosition();

      const updateDelay = isLastCard ? 150 : 0;
      setTimeout(() => {
        advanceSession(card, grade);
      }, updateDelay);
    });
  };

  const handleGradeRef = useRef(handleGrade);
  useEffect(() => {
    handleGradeRef.current = handleGrade;
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 8 || Math.abs(gestureState.dy) > 8;
      },
      onPanResponderMove: (_, gestureState) => {
        pan.setValue({ x: gestureState.dx, y: gestureState.dy });

        const { dx, dy } = gestureState;
        if (Math.abs(dx) > Math.abs(dy)) {
          if (dx < -40) setActiveSwipeDirection("left");
          else if (dx > 40) setActiveSwipeDirection("right");
          else setActiveSwipeDirection(null);
        } else {
          if (dy < -40) setActiveSwipeDirection("up");
          else if (dy > 40) setActiveSwipeDirection("down");
          else setActiveSwipeDirection(null);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const { dx, dy } = gestureState;
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);

        if (absX < 12 && absY < 12) {
          if (!flippedRef.current) {
            flipCard();
          }
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
          return;
        }

        if (!flippedRef.current) {
          setActiveSwipeDirection(null);
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            friction: 5,
            useNativeDriver: true,
          }).start();
          return;
        }

        if (absX > absY && absX > SWIPE_THRESHOLD) {
          if (dx < 0) handleGradeRef.current(SRS_GRADES.AGAIN, "left");
          else handleGradeRef.current(SRS_GRADES.GOOD, "right");
        } else if (absY > absX && absY > SWIPE_THRESHOLD) {
          if (dy < 0) handleGradeRef.current(SRS_GRADES.HARD, "up");
          else {
            setActiveSwipeDirection(null);
            Animated.spring(pan, {
              toValue: { x: 0, y: 0 },
              friction: 5,
              useNativeDriver: true,
            }).start();
          }
        } else {
          setActiveSwipeDirection(null);
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            friction: 5,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  const speakWord = () => {
    if (!currentCard) return;
    triggerHaptic("selection");
    setSpeaking(true);
    Speech.speak(currentCard.character, {
      language: "zh-CN",
      rate: 0.8,
      onDone: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  };

  const cardRotateStyle = {
    transform: [
      { translateX: pan.x },
      { translateY: pan.y },
      {
        rotate: pan.x.interpolate({
          inputRange: [-width, 0, width],
          outputRange: ["-10deg", "0deg", "10deg"],
        }),
      },
    ],
  };

  // Interpolations for Apple / Duolingo Slide-Up Reveal
  const charTranslateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [40, -10],
  });

  const charScale = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.82],
  });

  const answerTranslateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [30, 0],
  });

  const answerOpacity = slideAnim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 0.2, 1],
  });

  const tapHintOpacity = slideAnim.interpolate({
    inputRange: [0, 0.3],
    outputRange: [1, 0],
  });

  if (!session) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="small" color={Colors.accent.indigoLight} />
        <Text style={styles.loadingText}>ĐANG CHUẨN BỊ THẺ HỌC...</Text>
      </View>
    );
  }

  if (isSessionDone) {
    return (
      <SessionDoneScreen
        session={session}
        onDone={() => {
          endSession();
          router.back();
        }}
      />
    );
  }

  if (!currentCard) return null;

  const pinyinColor = getPinyinToneColor(currentCard.pinyin);

  return (
    <View style={styles.container}>
      {/* Header Bar (100% Vietnamese) */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 10, 48) }]}>
        <TouchableOpacity
          onPress={() => {
            triggerHaptic("light");
            endSession();
            router.back();
          }}
          style={styles.headerLeftBtn}
        >
          <Text style={styles.doneTextBtn}>Đóng</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{deck?.name || "PHIÊN HỌC THẺ"}</Text>
          <Text style={styles.headerSub}>
            THẺ {session.currentIndex + 1} / {session.queue.length}
          </Text>
        </View>
        <TouchableOpacity onPress={speakWord} style={styles.headerRightBtn}>
          <Ionicons
            name={speaking ? "volume-high" : "volume-medium-outline"}
            size={20}
            color={Colors.accent.indigoLight}
          />
        </TouchableOpacity>
      </View>

      {/* Progress Bar */}
      <ProgressBar progress={progress} style={{ marginHorizontal: Spacing.pageMargin }} />

      {/* Gesture hints (100% Vietnamese) */}
      <View style={styles.gestureHintRow}>
        <Text style={styles.gestureHintText}>👈 QUÊN • 👆 KHÓ • 👉 THUỘC</Text>
      </View>

      {/* Flashcard Area */}
      <View style={styles.cardArea}>
        <Animated.View
          style={[styles.cardWrapper, { width: cardWidth, height: cardHeight }, cardRotateStyle]}
          {...panResponder.panHandlers}
        >
          {/* Swipe badges */}
          {activeSwipeDirection === "left" && (
            <View
              style={[styles.swipeBadge, { backgroundColor: Colors.neon.coral, left: 20, top: 20 }]}
            >
              <Text style={styles.swipeBadgeText}>QUÊN</Text>
            </View>
          )}
          {activeSwipeDirection === "right" && (
            <View
              style={[
                styles.swipeBadge,
                { backgroundColor: Colors.neon.emerald, right: 20, top: 20 },
              ]}
            >
              <Text style={styles.swipeBadgeText}>THUỘC</Text>
            </View>
          )}
          {activeSwipeDirection === "up" && (
            <View
              style={[
                styles.swipeBadge,
                { backgroundColor: Colors.neon.purple, top: 20, alignSelf: "center" },
              ]}
            >
              <Text style={styles.swipeBadgeText}>KHÓ</Text>
            </View>
          )}

          {/* Unified Card Body (Apple / Duolingo Slide & Expand Style) */}
          <TouchableOpacity
            style={[styles.cardCardBody, { width: cardWidth, height: cardHeight }]}
            onPress={flipCard}
            activeOpacity={flipped ? 1 : 0.95}
          >
            {/* HSK Badge */}
            {currentCard.hskLevel ? (
              <View style={styles.hskBadge}>
                <Text style={styles.hskText}>HSK {currentCard.hskLevel}</Text>
              </View>
            ) : null}

            {/* Character Header (Slides up smoothly) */}
            <Animated.View
              style={[
                styles.charHeaderBox,
                {
                  transform: [{ translateY: charTranslateY }, { scale: charScale }],
                },
              ]}
            >
              <Text style={styles.characterBig}>{currentCard.character}</Text>
              {currentCard.traditional && currentCard.traditional !== currentCard.character && (
                <Text style={styles.traditional}>{currentCard.traditional}</Text>
              )}

              <TouchableOpacity style={styles.speakBtn} onPress={speakWord} activeOpacity={0.8}>
                <Ionicons
                  name={speaking ? "volume-high" : "volume-medium"}
                  size={16}
                  color={Colors.accent.indigoLight}
                />
                <Text style={styles.speakBtnText}>{speaking ? "Đang phát âm..." : "Phát âm"}</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Unrevealed Hint */}
            {!flipped && (
              <Animated.Text style={[styles.tapHint, { opacity: tapHintOpacity }]}>
                Chạm vào thẻ để xem đáp án
              </Animated.Text>
            )}

            {/* Revealed Answer Content (Slides up & Fades in smoothly) */}
            {flipped && (
              <Animated.View
                style={[
                  styles.answerContainer,
                  {
                    opacity: answerOpacity,
                    transform: [{ translateY: answerTranslateY }],
                  },
                ]}
              >
                <ScrollView
                  contentContainerStyle={styles.answerScrollContent}
                  showsVerticalScrollIndicator={false}
                  scrollEnabled={true}
                >
                  <Text style={[styles.pinyin, { color: pinyinColor }]}>{currentCard.pinyin}</Text>
                  <Text style={styles.hanviet}>{currentCard.hanviet}</Text>
                  <View style={styles.divider} />
                  <Text style={styles.translation}>{currentCard.translation}</Text>

                  {currentCard.examples && currentCard.examples.length > 0 && (
                    <View style={styles.exampleBox}>
                      <Text style={styles.exampleCn}>{currentCard.examples[0].chinese}</Text>
                      <Text style={[styles.examplePy, { color: pinyinColor }]}>
                        {currentCard.examples[0].pinyin}
                      </Text>
                      <Text style={styles.exampleVi}>{currentCard.examples[0].vietnamese}</Text>
                    </View>
                  )}
                </ScrollView>
              </Animated.View>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Action Area */}
      {flipped ? (
        <SRSButtons cardSRS={currentCard.srs} onGrade={handleGrade} />
      ) : (
        <View style={[styles.tapArea, { paddingBottom: Math.max(insets.bottom + 16, 24) }]}>
          <TouchableOpacity style={styles.revealBtn} onPress={flipCard} activeOpacity={0.8}>
            <Text style={styles.revealBtnText}>XEM ĐÁP ÁN (HOẶC CHẠM VÀO THẺ)</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.bg.primary,
  },
  loadingText: {
    color: Colors.text.secondary,
    marginTop: Spacing.md,
    fontSize: Typography.text.footnote.fontSize,
    letterSpacing: 1,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.pageMargin,
    paddingBottom: Spacing.xs,
  },
  headerLeftBtn: { padding: Spacing.xs },
  doneTextBtn: {
    fontSize: Typography.text.footnote.fontSize,
    color: Colors.accent.indigoLight,
    fontWeight: Typography.weight.bold,
  },
  headerRightBtn: { padding: Spacing.xs },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: {
    fontSize: Typography.text.caption1.fontSize,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    letterSpacing: 1,
  },
  headerSub: {
    fontSize: Typography.text.caption2.fontSize,
    color: Colors.text.secondary,
    marginTop: 1,
    letterSpacing: 0.8,
  },

  gestureHintRow: { alignItems: "center", marginTop: Spacing.sm },
  gestureHintText: {
    fontSize: Typography.text.caption2.fontSize,
    color: Colors.text.secondary,
    letterSpacing: 0.8,
    fontWeight: Typography.weight.semibold,
  },

  cardArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.bg.primary,
  },
  cardWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  cardCardBody: {
    borderRadius: Radii.xl,
    backgroundColor: Colors.bg.secondary,
    borderWidth: 1,
    borderColor: Colors.border.default,
    padding: Spacing.lg,
    overflow: "hidden",
    position: "relative",
    alignItems: "center",
  },

  swipeBadge: {
    position: "absolute",
    zIndex: 100,
    borderRadius: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  swipeBadgeText: {
    color: "#08090C",
    fontSize: Typography.text.footnote.fontSize,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.8,
  },

  hskBadge: {
    position: "absolute",
    top: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: Colors.bg.tertiary,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    zIndex: 10,
  },
  hskText: {
    fontSize: Typography.text.caption2.fontSize,
    color: Colors.accent.indigoLight,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.5,
  },

  charHeaderBox: {
    alignItems: "center",
    justifyContent: "center",
  },
  characterBig: {
    fontSize: Typography.hanzi.xl,
    color: Colors.text.primary,
    fontWeight: Typography.weight.bold,
  },
  traditional: {
    fontSize: Typography.text.subhead.fontSize,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  speakBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: Spacing.md,
    backgroundColor: Colors.bg.tertiary,
    borderRadius: Radii.full,
    height: 32,
    paddingHorizontal: Spacing.md,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  speakBtnText: {
    color: Colors.accent.indigoLight,
    fontSize: Typography.text.caption1.fontSize,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.5,
    textAlign: "center",
    textAlignVertical: "center",
    includeFontPadding: false,
  },
  tapHint: {
    position: "absolute",
    bottom: Spacing.lg,
    fontSize: Typography.text.caption2.fontSize,
    color: Colors.text.tertiary,
    letterSpacing: 0.8,
  },

  answerContainer: {
    flex: 1,
    width: "100%",
    marginTop: Spacing.xs,
  },
  answerScrollContent: {
    alignItems: "center",
    paddingBottom: Spacing.md,
  },
  pinyin: {
    fontSize: Typography.text.title2.fontSize,
    fontWeight: Typography.weight.bold,
    marginTop: Spacing.xs,
  },
  hanviet: {
    fontSize: Typography.text.title3.fontSize,
    color: Colors.text.primary,
    marginTop: 2,
    fontWeight: Typography.weight.semibold,
  },
  divider: {
    height: 1,
    width: "100%",
    backgroundColor: Colors.border.separator,
    marginVertical: Spacing.md,
  },
  translation: {
    fontSize: Typography.text.subhead.fontSize,
    color: Colors.text.primary,
    textAlign: "center",
    fontWeight: Typography.weight.semibold,
  },
  exampleBox: {
    backgroundColor: Colors.bg.tertiary,
    borderRadius: 10,
    padding: Spacing.md,
    marginTop: Spacing.md,
    width: "100%",
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  exampleCn: {
    fontSize: Typography.text.body.fontSize,
    color: Colors.text.primary,
    fontWeight: Typography.weight.semibold,
  },
  examplePy: { fontSize: Typography.text.caption1.fontSize, marginTop: 2 },
  exampleVi: {
    fontSize: Typography.text.caption1.fontSize,
    color: Colors.text.secondary,
    marginTop: 2,
  },

  tapArea: { paddingHorizontal: Spacing.pageMargin, paddingTop: Spacing.sm },
  revealBtn: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radii.card,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  revealBtnText: {
    color: Colors.text.primary,
    fontSize: Typography.text.footnote.fontSize,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.8,
    textAlign: "center",
    textAlignVertical: "center",
    includeFontPadding: false,
  },
});
