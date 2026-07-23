import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  PanResponder,
  useWindowDimensions,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Speech from "expo-speech";
import { Card } from "../../store/slices/types";
import { Colors, Spacing, Radii, triggerHaptic } from "../../constants/theme";

export type ShortTermGrade = "again" | "hard" | "easy";

interface FlashcardViewProps {
  card: Card;
  onGrade: (grade: ShortTermGrade) => void;
}

const SWIPE_THRESHOLD = 90;

export function FlashcardView({ card, onGrade }: FlashcardViewProps) {
  const { width, height } = useWindowDimensions();
  const [showAnswer, setShowAnswer] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [activeSwipe, setActiveSwipe] = useState<ShortTermGrade | null>(null);

  const pan = useRef(new Animated.ValueXY()).current;
  const revealAnim = useRef(new Animated.Value(0)).current;

  const cardRef = useRef(card);
  const onGradeRef = useRef(onGrade);

  useEffect(() => {
    cardRef.current = card;
    onGradeRef.current = onGrade;

    // Reset animation state on new card
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowAnswer(false);
    setActiveSwipe(null);
    revealAnim.setValue(0);
    pan.setValue({ x: 0, y: 0 });
  }, [card, pan, revealAnim, onGrade]);

  const handleCardTap = () => {
    // One-way reveal per card: once answer is shown, tapping does not toggle back
    if (showAnswer) return;

    triggerHaptic("selection");
    setShowAnswer(true);

    Animated.timing(revealAnim, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const playTTS = async () => {
    try {
      triggerHaptic("light");
      setSpeaking(true);
      Speech.stop();
      Speech.speak(card.character, {
        language: "zh-CN",
        rate: 0.85,
        onDone: () => setSpeaking(false),
        onError: () => setSpeaking(false),
      });
    } catch {
      setSpeaking(false);
    }
  };

  const executeGrade = (grade: ShortTermGrade) => {
    triggerHaptic(grade === "easy" ? "success" : grade === "hard" ? "warning" : "error");

    let targetX = 0;
    let targetY = 0;
    if (grade === "again") targetX = -width * 1.3;
    else if (grade === "easy") targetX = width * 1.3;
    else if (grade === "hard") targetY = -height * 1.3;

    Animated.timing(pan, {
      toValue: { x: targetX, y: targetY },
      duration: 200,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      onGradeRef.current(grade);
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const { dx, dy } = gestureState;
        return Math.abs(dx) > 12 || Math.abs(dy) > 12;
      },
      onPanResponderMove: (_, gestureState) => {
        const { dx, dy } = gestureState;
        pan.setValue({ x: dx, y: dy });

        if (dy < -40 && Math.abs(dy) > Math.abs(dx)) {
          setActiveSwipe("hard");
        } else if (dx < -30) {
          setActiveSwipe("again");
        } else if (dx > 30) {
          setActiveSwipe("easy");
        } else {
          setActiveSwipe(null);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const { dx, dy, vx, vy } = gestureState;
        const absX = Math.abs(dx);

        if (dy < -SWIPE_THRESHOLD || vy < -0.5) {
          executeGrade("hard");
        } else if (absX > SWIPE_THRESHOLD || Math.abs(vx) > 0.5) {
          executeGrade(dx > 0 ? "easy" : "again");
        } else {
          setActiveSwipe(null);
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            friction: 7,
            tension: 80,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // 60fps Native Interpolations
  const heroTranslateY = revealAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [20, -18],
  });

  const heroScale = revealAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1.0, 0.75],
  });

  const answerTranslateY = revealAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [40, 0],
  });

  const answerOpacity = revealAnim.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0, 0.3, 1],
  });

  const hintOpacity = revealAnim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [1, 0, 0],
  });

  const rotate = pan.x.interpolate({
    inputRange: [-200, 0, 200],
    outputRange: ["-12deg", "0deg", "12deg"],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.container}>
      {/* SWIPEABLE CARD CONTAINER */}
      <View style={styles.cardArea}>
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.animatedCardContainer,
            {
              transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.cardBody}
            activeOpacity={0.96}
            onPress={handleCardTap}
          >
            {/* SWIPE OVERLAY BADGES */}
            {activeSwipe === "again" && (
              <View style={[styles.swipeBadge, styles.swipeBadgeAgain]}>
                <Text style={styles.swipeBadgeText}>👈 QUÊN</Text>
              </View>
            )}
            {activeSwipe === "hard" && (
              <View style={[styles.swipeBadge, styles.swipeBadgeHard]}>
                <Text style={styles.swipeBadgeText}>👆 KHÓ</Text>
              </View>
            )}
            {activeSwipe === "easy" && (
              <View style={[styles.swipeBadge, styles.swipeBadgeEasy]}>
                <Text style={styles.swipeBadgeText}>DỄ 👉</Text>
              </View>
            )}

            {/* CARD TOP HEADER: HSK BADGE */}
            <View style={styles.cardTopHeader}>
              <View style={styles.hskBadge}>
                <Text style={styles.hskBadgeText}>HÁN TỰ</Text>
              </View>
            </View>

            {/* HERO CHARACTER: GLIDES UPWARDS */}
            <Animated.View
              style={[
                styles.heroCenterBox,
                {
                  transform: [{ translateY: heroTranslateY }, { scale: heroScale }],
                },
              ]}
            >
              <Text style={styles.characterHero}>{card.character}</Text>
            </Animated.View>

            {/* TAP HINT (PROPERLY CENTERED AT BOTTOM, FADES OUT ON REVEAL) */}
            <Animated.View
              pointerEvents={showAnswer ? "none" : "auto"}
              style={[styles.tapHintBox, { opacity: hintOpacity }]}
            >
              <Ionicons name="sparkles" size={18} color={Colors.duolingo.blue} />
              <Text style={styles.tapHintText}>CHẠM VÀO THẺ ĐỂ MỞ ĐÁP ÁN</Text>
            </Animated.View>

            {/* SLIDE-UP ANSWER SHEET */}
            <Animated.View
              pointerEvents={showAnswer ? "auto" : "none"}
              style={[
                styles.answerSlideContainer,
                {
                  opacity: answerOpacity,
                  transform: [{ translateY: answerTranslateY }],
                },
              ]}
            >
              <View style={styles.divider} />

              {/* PINYIN ROW WITH COMPACT AUDIO ICON BUTTON */}
              <View style={styles.pinyinAudioRow}>
                <Text style={styles.pinyinText}>{card.pinyin}</Text>
                <TouchableOpacity
                  style={styles.audioIconBtn3D}
                  onPress={(e) => {
                    e.stopPropagation();
                    playTTS();
                  }}
                  activeOpacity={0.8}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={speaking ? "volume-high" : "volume-medium"}
                    size={22}
                    color={Colors.duolingo.blue}
                  />
                </TouchableOpacity>
              </View>

              {/* TRANSLATION */}
              <Text style={styles.translationText}>{card.translation}</Text>

              {/* RADICAL INFO */}
              {card.radical ? (
                <View style={styles.radicalPill}>
                  <Text style={styles.radicalText}>Bộ thủ: {card.radical}</Text>
                </View>
              ) : null}

              {/* EXAMPLES CONTAINER */}
              {card.examples && card.examples.length > 0 && (
                <ScrollView
                  style={styles.examplesScroll}
                  contentContainerStyle={styles.examplesScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.examplesBox}>
                    <Text style={styles.examplesHeader}>CÂU VÍ DỤ MINH HỌA:</Text>
                    {card.examples.map((ex, idx) => (
                      <View key={idx} style={styles.exampleItem}>
                        <Text style={styles.exampleCn}>{ex.chinese}</Text>
                        {ex.pinyin && <Text style={styles.examplePy}>{ex.pinyin}</Text>}
                        <Text style={styles.exampleVi}>{ex.vietnamese}</Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              )}
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.pageMargin,
    paddingBottom: Spacing.md,
    justifyContent: "center",
  },
  cardArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: Spacing.xs,
  },
  animatedCardContainer: {
    width: "100%",
    height: "100%",
  },
  cardBody: {
    flex: 1,
    backgroundColor: Colors.duolingo.bgSoftDark,
    borderRadius: Radii.xl,
    borderBottomWidth: 5,
    borderBottomColor: Colors.duolingo.cardBottom,
    padding: Spacing.lg,
    position: "relative",
    justifyContent: "space-between",
  },

  swipeBadge: {
    position: "absolute",
    top: 16,
    zIndex: 30,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radii.md,
    borderWidth: 0,
    borderBottomWidth: 3,
  },
  swipeBadgeAgain: {
    left: 16,
    backgroundColor: Colors.duolingo.red,
    borderBottomColor: Colors.duolingo.redDark,
  },
  swipeBadgeHard: {
    alignSelf: "center",
    backgroundColor: Colors.duolingo.yellow,
    borderBottomColor: Colors.duolingo.yellowDark,
  },
  swipeBadgeEasy: {
    right: 16,
    backgroundColor: Colors.duolingo.green,
    borderBottomColor: Colors.duolingo.greenDark,
  },
  swipeBadgeText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  cardTopHeader: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  hskBadge: {
    backgroundColor: Colors.duolingo.blueDim,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radii.full,
  },
  hskBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.duolingo.blue,
    letterSpacing: 0.5,
  },

  heroCenterBox: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: Spacing.xs,
  },
  characterHero: {
    fontSize: 88,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
  },

  tapHintBox: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.duolingo.cardBg,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: Radii.lg,
    borderBottomWidth: 3,
    borderBottomColor: Colors.duolingo.cardBottom,
    zIndex: 10,
  },
  tapHintText: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.duolingo.blue,
    letterSpacing: 0.5,
  },

  answerSlideContainer: {
    flex: 1,
    alignItems: "center",
    width: "100%",
  },
  divider: {
    height: 2,
    width: "100%",
    backgroundColor: Colors.duolingo.cardBorder,
    marginBottom: Spacing.xs,
  },

  pinyinAudioRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 2,
  },
  pinyinText: {
    fontSize: 26,
    fontWeight: "800",
    color: Colors.duolingo.blue,
  },
  audioIconBtn3D: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.duolingo.blueDim,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 2,
    borderBottomColor: "#173A4F",
  },

  translationText: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.duolingo.green,
    marginTop: 4,
    textAlign: "center",
  },

  radicalPill: {
    backgroundColor: Colors.duolingo.cardBg,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Radii.full,
    marginTop: 6,
  },
  radicalText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.duolingo.textMuted,
  },

  examplesScroll: {
    flex: 1,
    width: "100%",
    marginTop: 8,
  },
  examplesScrollContent: {
    paddingBottom: 4,
  },
  examplesBox: {
    width: "100%",
    backgroundColor: Colors.duolingo.cardBg,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderBottomWidth: 3,
    borderBottomColor: Colors.duolingo.cardBottom,
  },
  examplesHeader: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.duolingo.textMuted,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  exampleItem: {
    marginBottom: 6,
  },
  exampleCn: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  examplePy: {
    fontSize: 12,
    color: Colors.duolingo.blue,
    marginTop: 1,
  },
  exampleVi: {
    fontSize: 13,
    color: Colors.duolingo.textMuted,
    marginTop: 1,
  },
});
