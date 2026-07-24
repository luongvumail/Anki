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
import { Colors, Radii, Spacing, triggerHaptic } from "../../constants/theme";

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

    return () => {
      Speech.stop();
    };
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

  const answerTranslateY = revealAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [30, 0],
  });

  const answerOpacity = revealAnim.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0, 0.4, 1],
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
            {/* SWIPE OVERLAY BADGES WITH VECTOR ICONS */}
            {activeSwipe === "again" && (
              <View style={[styles.swipeBadge, styles.swipeBadgeAgain]}>
                <View style={styles.badgeIconRow}>
                  <Ionicons name="arrow-back" size={14} color="#FFFFFF" />
                  <Text style={styles.swipeBadgeText}>QUÊN</Text>
                </View>
              </View>
            )}
            {activeSwipe === "hard" && (
              <View style={[styles.swipeBadge, styles.swipeBadgeHard]}>
                <View style={styles.badgeIconRow}>
                  <Ionicons name="arrow-up" size={14} color="#FFFFFF" />
                  <Text style={styles.swipeBadgeText}>KHÓ</Text>
                </View>
              </View>
            )}
            {activeSwipe === "easy" && (
              <View style={[styles.swipeBadge, styles.swipeBadgeEasy]}>
                <View style={styles.badgeIconRow}>
                  <Text style={styles.swipeBadgeText}>DỄ</Text>
                  <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                </View>
              </View>
            )}

            {/* CARD TOP HEADER: HSK BADGE */}
            <View style={styles.cardTopHeader}>
              <View style={styles.hskBadge}>
                <Ionicons name="sparkles" size={14} color={Colors.duolingo.blue} />
                <Text style={styles.hskBadgeText}>HÁN TỰ</Text>
              </View>
            </View>

            {/* UNREVEALED STATE: CHARACTER IS 100% DEAD CENTERED IN THE CARD */}
            {!showAnswer ? (
              <View style={styles.unrevealedCenterContainer}>
                <View style={styles.heroCenterBox}>
                  <Text style={styles.characterHero}>{card.character}</Text>
                </View>

                {/* BORDERLESS TAP HINT AT BOTTOM OF UNREVEALED CARD */}
                <View style={styles.tapHintBox}>
                  <Ionicons name="sparkles" size={16} color={Colors.duolingo.blue} />
                  <Text style={styles.tapHintText}>CHẠM VÀO THẺ ĐỂ MỞ ĐÁP ÁN</Text>
                </View>
              </View>
            ) : (
              /* REVEALED STATE: PERFECTLY BALANCED FULL-CARD VERTICAL DISTRIBUTION */
              <Animated.View
                style={[
                  styles.answerSlideContainer,
                  {
                    opacity: answerOpacity,
                    transform: [{ translateY: answerTranslateY }],
                  },
                ]}
              >
                {/* CHARACTER HEADER AT TOP OF REVEALED STATE */}
                <View style={styles.revealedHeroHeaderBox}>
                  <Text style={styles.revealedCharacterHero}>{card.character}</Text>
                </View>

                <View style={styles.divider} />

                {/* PINYIN ROW WITH 3D AUDIO BUTTON */}
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
                      size={24}
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

                {/* EXAMPLES CONTAINER - EXPANDS TO FILL REMAINING SPACE NATURALLY */}
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
            )}

            {/* SWIPE GESTURE GUIDE LEGEND BAR AT BOTTOM OF CARD BODY */}
            <View style={styles.swipeGuideFooter}>
              <View style={[styles.swipeGuidePill, styles.swipeGuideAgain]}>
                <View style={styles.guidePillRow}>
                  <Ionicons name="arrow-back" size={12} color={Colors.duolingo.red} />
                  <Text style={styles.swipeGuideText}>Trái: Quên</Text>
                </View>
              </View>
              <View style={[styles.swipeGuidePill, styles.swipeGuideHard]}>
                <View style={styles.guidePillRow}>
                  <Ionicons name="arrow-up" size={12} color={Colors.duolingo.yellow} />
                  <Text style={styles.swipeGuideText}>Lên: Khó</Text>
                </View>
              </View>
              <View style={[styles.swipeGuidePill, styles.swipeGuideEasy]}>
                <View style={styles.guidePillRow}>
                  <Ionicons name="arrow-forward" size={12} color={Colors.duolingo.green} />
                  <Text style={styles.swipeGuideText}>Phải: Dễ</Text>
                </View>
              </View>
            </View>
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
  badgeIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  guidePillRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  cardTopHeader: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  hskBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.duolingo.blueDim,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.full,
  },
  hskBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },

  /* UNREVEALED FLEX CONTAINER: CHARACTER IS 100% DEAD CENTERED */
  unrevealedCenterContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  heroCenterBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  characterHero: {
    fontSize: 98,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: 1,
  },

  /* BORDERLESS TAP HINT AT BOTTOM OF UNREVEALED CARD */
  tapHintBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "transparent",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radii.full,
    borderWidth: 0,
    marginBottom: 8,
  },
  tapHintText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },

  /* REVEALED STATE CONTAINER: BALANCED VERTICAL SPACING ACROSS WHOLE CARD */
  answerSlideContainer: {
    flex: 1,
    alignItems: "center",
    width: "100%",
    marginVertical: 4,
  },
  revealedHeroHeaderBox: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    marginBottom: 4,
  },
  revealedCharacterHero: {
    fontSize: 60,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
  },
  divider: {
    height: 2,
    width: "100%",
    backgroundColor: Colors.duolingo.cardBorder,
    marginVertical: 8,
  },

  pinyinAudioRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    marginVertical: 6,
  },
  pinyinText: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  audioIconBtn3D: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.duolingo.blueDim,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 3,
    borderBottomColor: "#173A4F",
  },

  translationText: {
    fontSize: 26,
    fontWeight: "800",
    color: Colors.duolingo.green,
    marginVertical: 6,
    textAlign: "center",
  },

  radicalPill: {
    backgroundColor: Colors.duolingo.cardBg,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: Radii.full,
    marginVertical: 8,
  },
  radicalText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.duolingo.textMuted,
  },

  examplesScroll: {
    flex: 1,
    width: "100%",
    marginTop: 12,
    marginBottom: 4,
  },
  examplesScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  examplesBox: {
    width: "100%",
    backgroundColor: Colors.duolingo.cardBg,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    borderWidth: 0,
  },
  examplesHeader: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.duolingo.textMuted,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  exampleItem: {
    marginVertical: 4,
  },
  exampleCn: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  examplePy: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.duolingo.blue,
    marginTop: 2,
  },
  exampleVi: {
    fontSize: 14,
    color: Colors.duolingo.textMuted,
    marginTop: 2,
  },

  /* SWIPE GESTURE GUIDE LEGEND BAR AT BOTTOM OF CARD BODY */
  swipeGuideFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
  swipeGuidePill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    borderRadius: Radii.md,
  },
  swipeGuideAgain: {
    backgroundColor: "rgba(255, 75, 75, 0.15)",
  },
  swipeGuideHard: {
    backgroundColor: "rgba(255, 200, 0, 0.15)",
  },
  swipeGuideEasy: {
    backgroundColor: "rgba(88, 204, 2, 0.15)",
  },
  swipeGuideText: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.duolingo.textMuted,
  },
});
