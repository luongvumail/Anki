import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Radii, Spacing, triggerHaptic } from "../../constants/theme";
import { Deck } from "../../store/slices/types";
import { DeckIcon } from "../ui/DeckIcon";
import { DuolingoMascot } from "../ui/DuolingoMascot";

interface ZigZagSkillPathProps {
  decks: Deck[];
  dueCardsMap: Record<string, number>;
  onSelectDeck: (deck: Deck) => void;
}

export function ZigZagSkillPath({
  decks,
  dueCardsMap,
  onSelectDeck,
}: ZigZagSkillPathProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  if (!decks || decks.length === 0) return null;

  // Offsets for Zig-Zag layout (0, 50, 70, 40, -40, -70, -50)
  const offsets = [0, 50, 70, 40, -40, -70, -50];

  // Find the priority deck index (deck with highest dueCount)
  let priorityIdx = 0;
  let maxDue = -1;
  decks.forEach((deck, idx) => {
    const due = dueCardsMap[deck.id] || deck.dueCount || 0;
    if (due > maxDue) {
      maxDue = due;
      priorityIdx = idx;
    }
  });

  return (
    <View style={styles.container}>
      {/* Unit Title Banner */}
      <View style={styles.unitBanner}>
        <View style={styles.unitBannerContent}>
          <Text style={styles.unitBannerTitle}>KHO BỘ THẺ CỦA TÔI</Text>
          <Text style={styles.unitBannerSub}>
            Chọn bộ thẻ bên dưới để bắt đầu lật thẻ Flashcard & làm bài tập SRS!
          </Text>
        </View>
      </View>

      {/* Real Decks Zig-Zag Path */}
      <View style={styles.pathList}>
        {decks.map((deck, idx) => {
          const offset = offsets[idx % offsets.length];
          const dueCount = dueCardsMap[deck.id] || deck.dueCount || 0;
          const isPriority = idx === priorityIdx;
          const isCompleted = dueCount === 0 && (deck.cardCount || 0) > 0;

          return (
            <React.Fragment key={deck.id}>
              {/* Mascot Panda standing by the priority deck */}
              {isPriority && (
                <View
                  style={[
                    styles.mascotPathContainer,
                    { transform: [{ translateX: -offset * 0.8 }] },
                  ]}
                >
                  <DuolingoMascot
                    expression={dueCount > 0 ? "happy" : "celebrate"}
                    size={64}
                    speechBubbleText={
                      dueCount > 0
                        ? `Bộ "${deck.name}" có ${dueCount} từ cần ôn!`
                        : `Bộ "${deck.name}" đã thuộc hết hôm nay!`
                    }
                  />
                </View>
              )}

              {/* Node Row for Real Deck */}
              <View style={[styles.nodeRow, { transform: [{ translateX: offset }] }]}>
                <View style={styles.nodeWrapper}>
                  {/* Floating Due Count Badge */}
                  {dueCount > 0 ? (
                    <Animated.View
                      style={[
                        styles.startBadge,
                        styles.startBadgeDue,
                        { transform: [{ scale: pulseAnim }] },
                      ]}
                    >
                      <View style={styles.badgeTextRow}>
                        <Ionicons name="flame" size={12} color="#FFFFFF" />
                        <Text style={styles.startBadgeText}>{dueCount} CẦN ÔN</Text>
                      </View>
                      <View style={[styles.badgeArrow, styles.badgeArrowDue]} />
                    </Animated.View>
                  ) : isCompleted ? (
                    <View style={[styles.startBadge, styles.startBadgeDone]}>
                      <View style={styles.badgeTextRow}>
                        <Ionicons name="checkmark-circle" size={12} color="#FFFFFF" />
                        <Text style={styles.startBadgeText}>HOÀN THÀNH</Text>
                      </View>
                      <View style={[styles.badgeArrow, styles.badgeArrowDone]} />
                    </View>
                  ) : (
                    <View style={[styles.startBadge, styles.startBadgeNew]}>
                      <View style={styles.badgeTextRow}>
                        <Ionicons name="play" size={11} color="#FFFFFF" />
                        <Text style={styles.startBadgeText}>BẮT ĐẦU</Text>
                      </View>
                      <View style={[styles.badgeArrow, styles.badgeArrowNew]} />
                    </View>
                  )}

                  {/* Real Deck Node Circle Button */}
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => {
                      triggerHaptic("medium");
                      onSelectDeck(deck);
                    }}
                    style={[
                      styles.nodeCircle,
                      dueCount > 0
                        ? styles.nodeCircleDue
                        : isCompleted
                        ? styles.nodeCircleDone
                        : styles.nodeCircleNew,
                    ]}
                  >
                    <DeckIcon
                      name={deck.icon}
                      size={32}
                      color="#FFFFFF"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Deck Name & Card Count Subtitle */}
              <View style={[styles.nodeLabelRow, { transform: [{ translateX: offset }] }]}>
                <Text style={styles.deckNameText}>{deck.name}</Text>
                <Text style={styles.deckCardCountText}>
                  {deck.cardCount || 0} từ vựng
                </Text>
              </View>
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.sm,
  },
  unitBanner: {
    backgroundColor: Colors.duolingo.cardBg,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderBottomWidth: 4,
    borderBottomColor: Colors.duolingo.cardBottom,
    marginBottom: Spacing.lg,
  },
  unitBannerContent: {
    flex: 1,
  },
  unitBannerTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.duolingo.blue,
    letterSpacing: 0.8,
  },
  unitBannerSub: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.duolingo.textMuted,
    marginTop: 4,
  },

  pathList: {
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  mascotPathContainer: {
    marginVertical: Spacing.xs,
  },

  nodeRow: {
    marginVertical: 12,
    alignItems: "center",
  },
  nodeWrapper: {
    alignItems: "center",
    position: "relative",
  },
  startBadge: {
    position: "absolute",
    top: -38,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radii.md,
    zIndex: 10,
  },
  startBadgeDue: {
    backgroundColor: Colors.duolingo.red,
  },
  startBadgeDone: {
    backgroundColor: Colors.duolingo.green,
  },
  startBadgeNew: {
    backgroundColor: Colors.duolingo.blue,
  },
  startBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  badgeTextRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  badgeArrow: {
    position: "absolute",
    bottom: -5,
    alignSelf: "center",
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 5,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  badgeArrowDue: {
    borderTopColor: Colors.duolingo.red,
  },
  badgeArrowDone: {
    borderTopColor: Colors.duolingo.green,
  },
  badgeArrowNew: {
    borderTopColor: Colors.duolingo.blue,
  },

  nodeCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  nodeCircleDue: {
    backgroundColor: Colors.duolingo.red,
    borderBottomWidth: 6,
    borderBottomColor: Colors.duolingo.redDark,
  },
  nodeCircleDone: {
    backgroundColor: Colors.duolingo.green,
    borderBottomWidth: 6,
    borderBottomColor: Colors.duolingo.greenDark,
  },
  nodeCircleNew: {
    backgroundColor: Colors.duolingo.blue,
    borderBottomWidth: 6,
    borderBottomColor: Colors.duolingo.blueDark,
  },

  nodeLabelRow: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  deckNameText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 4,
    textAlign: "center",
  },
  deckCardCountText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.duolingo.textMuted,
    marginTop: 2,
  },
});
