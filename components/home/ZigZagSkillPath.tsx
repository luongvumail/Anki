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
  onSelectDeck: (deck: Deck) => void;
  dueCardsMap?: Record<string, number>;
}

export function ZigZagSkillPath({
  decks,
  onSelectDeck,
  dueCardsMap = {},
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

  // Horizontal offsets for Zig-Zag layout (0: center, -50: left, 50: right)
  const offsets = [0, 50, 70, 40, -40, -70, -50];

  return (
    <View style={styles.container}>
      {/* Unit Title Banner */}
      <View style={styles.unitBanner}>
        <View style={styles.unitBannerContent}>
          <Text style={styles.unitBannerTitle}>ĐƠN VỊ 1: KHO TỪ VỰNG TIẾNG TRUNG</Text>
          <Text style={styles.unitBannerSub}>Hoàn thành các bài tập để nhận mốc thưởng XP và Streak!</Text>
        </View>
        <TouchableOpacity
          style={styles.guideBookBtn}
          activeOpacity={0.8}
          onPress={() => triggerHaptic("light")}
        >
          <Ionicons name="book" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Path Nodes List */}
      <View style={styles.pathList}>
        {decks.map((deck, idx) => {
          const offset = offsets[idx % offsets.length];
          const dueCount = dueCardsMap[deck.id] || deck.dueCount || 0;
          const isCurrent = idx === 0 || dueCount > 0;
          const isCompleted = dueCount === 0 && (deck.cardCount || 0) > 0;

          const showChest = idx > 0 && idx % 4 === 0;
          const showMascot = idx === 0 || (isCurrent && idx % 3 === 0);

          return (
            <React.Fragment key={deck.id}>
              {/* Optional Mascot standing by path */}
              {showMascot && (
                <View style={[styles.mascotPathContainer, { transform: [{ translateX: -offset * 0.8 }] }]}>
                  <DuolingoMascot
                    expression={isCompleted ? "celebrate" : dueCount > 0 ? "happy" : "waving"}
                    size={64}
                    speechBubbleText={isCurrent ? "Cùng học nào! 加油!" : "Thắng tiến!"}
                  />
                </View>
              )}

              {showChest && (
                <View style={[styles.chestContainer, { transform: [{ translateX: -offset * 0.5 }] }]}>
                  <TouchableOpacity
                    style={styles.chestNode}
                    onPress={() => triggerHaptic("success")}
                    activeOpacity={0.8}
                  >
                    <Text style={{ fontSize: 28 }}>🎁</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={[styles.nodeRow, { transform: [{ translateX: offset }] }]}>
                {isCurrent ? (
                  <View style={styles.nodeWrapper}>
                    {/* Floating START Popup Label */}
                    <Animated.View style={[styles.startBadge, { transform: [{ scale: pulseAnim }] }]}>
                      <Text style={styles.startBadgeText}>
                        {dueCount > 0 ? `${dueCount} CẦN ÔN` : "BẮT ĐẦU"}
                      </Text>
                      <View style={styles.badgeArrow} />
                    </Animated.View>

                    {/* Active Lesson Node Button */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => {
                        triggerHaptic("medium");
                        onSelectDeck(deck);
                      }}
                      style={[
                        styles.nodeCircle,
                        styles.nodeActiveCircle,
                      ]}
                    >
                      <DeckIcon name={deck.icon} size={30} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ) : isCompleted ? (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      triggerHaptic("light");
                      onSelectDeck(deck);
                    }}
                    style={[styles.nodeCircle, styles.nodeCompletedCircle]}
                  >
                    <Ionicons name="checkmark-sharp" size={32} color="#FFFFFF" />
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.nodeCircle, styles.nodeLockedCircle]}>
                    <Ionicons name="lock-closed" size={24} color={Colors.duolingo.disabledText} />
                  </View>
                )}

                <Text style={styles.nodeTitleText} numberOfLines={1}>
                  {deck.name}
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
    width: "100%",
    paddingBottom: Spacing.space6,       // --space-6: 24px
  },
  unitBanner: {
    backgroundColor: Colors.duolingo.green,
    borderRadius: Radii.lg,              // --radius-lg: 16px
    padding: Spacing.space4,             // --space-4: 16px
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.space6,
    borderWidth: 0,                       // Rule 2
    borderBottomWidth: 4,
    borderBottomColor: Colors.duolingo.greenDark,
  },
  unitBannerContent: {
    flex: 1,
    paddingRight: Spacing.space2,
  },
  unitBannerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  unitBannerSub: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.9)",
    marginTop: 2,
  },
  guideBookBtn: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  pathList: {
    alignItems: "center",
    gap: 28,
  },
  nodeRow: {
    alignItems: "center",
  },
  nodeWrapper: {
    alignItems: "center",
    position: "relative",
  },
  startBadge: {
    position: "absolute",
    top: -34,
    backgroundColor: Colors.duolingo.blue,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radii.md,
    borderWidth: 0,
    borderBottomWidth: 2,
    borderBottomColor: Colors.duolingo.blueDark,
    alignItems: "center",
    zIndex: 10,
  },
  startBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  badgeArrow: {
    position: "absolute",
    bottom: -5,
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 5,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: Colors.duolingo.blueDark,
  },

  nodeCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0,                       // Rule 2
  },
  nodeActiveCircle: {
    backgroundColor: Colors.duolingo.green,
    borderBottomWidth: 6,
    borderBottomColor: Colors.duolingo.greenDark,
  },
  nodeCompletedCircle: {
    backgroundColor: Colors.duolingo.yellow,
    borderBottomWidth: 6,
    borderBottomColor: Colors.duolingo.yellowDark,
  },
  nodeLockedCircle: {
    backgroundColor: Colors.duolingo.disabled,
    borderBottomWidth: 6,
    borderBottomColor: "#CFCFCF",
  },

  nodeTitleText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.duolingo.text,
    marginTop: 6,
    textAlign: "center",
    maxWidth: 120,
  },

  chestContainer: {
    alignItems: "center",
    marginVertical: 4,
  },
  chestNode: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.duolingo.bgSoftDark,
    borderWidth: 0,
    borderBottomWidth: 5,
    borderBottomColor: Colors.duolingo.cardBottom,
    alignItems: "center",
    justifyContent: "center",
  },
  mascotPathContainer: {
    alignItems: "center",
    marginVertical: -6,
    zIndex: 5,
  },
});
