import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {
  BorderWidths,
  Layout,
  Radii,
  Spacing,
  triggerHaptic,
  Typography,
} from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import { Deck } from "../../store/slices/types";
import { DeckIcon } from "../ui/DeckIcon";

interface ZigZagSkillPathProps {
  decks: Deck[];
  dueCardsMap: Record<string, number>;
  onSelectDeck: (deck: Deck) => void;
}

interface PathNodeItemProps {
  deck: Deck;
  offset: number;
  dueCount: number;
  isPriority: boolean;
  isCompleted: boolean;
  pulseAnim: Animated.Value;
  onSelect: (deck: Deck) => void;
}

const PathNodeItem = React.memo(function PathNodeItem({
  deck,
  offset,
  dueCount,
  isPriority,
  isCompleted,
  pulseAnim,
  onSelect,
}: PathNodeItemProps) {
  const { theme } = useTheme();
  const [pressed, setPressed] = useState(false);

  const handlePressIn = () => {
    triggerHaptic("medium");
    setPressed(true);
  };

  const handlePressOut = () => {
    setPressed(false);
  };

  const getNodeColors = () => {
    if (isPriority) {
      return {
        bg: theme.blue,
        border: theme.blue,
        bottom: theme.blueDark,
        iconColor: theme.blue,
      };
    }
    if (isCompleted) {
      return {
        bg: theme.green,
        border: theme.green,
        bottom: theme.greenDark,
        iconColor: theme.yellow,
      };
    }
    return {
      bg: theme.cardBg,
      border: theme.cardBorder,
      bottom: theme.cardBottom,
      iconColor: theme.textMuted,
    };
  };

  const nodeColors = getNodeColors();

  return (
    <View style={[styles.nodeRow, { transform: [{ translateX: offset }] }]}>
      <View style={styles.nodeWrapper}>
        {/* Sleek Node Button */}
        <TouchableOpacity
          activeOpacity={1}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={() => onSelect(deck)}
          style={[
            styles.nodeButtonCraft,
            {
              backgroundColor: isPriority || isCompleted ? nodeColors.bg : theme.bgSoft,
              transform: [{ scale: pressed ? 0.94 : 1 }],
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          {isCompleted ? (
            <Ionicons name="checkmark-sharp" size={Layout.iconLg} color="#FFFFFF" />
          ) : isPriority ? (
            <DeckIcon name={deck.icon} size={Layout.iconLg} color="#FFFFFF" />
          ) : (
            <DeckIcon name={deck.icon} size={Layout.iconLg} color={theme.textMuted} />
          )}
        </TouchableOpacity>
      </View>

      {/* Minimal Deck Info Card */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => onSelect(deck)}
        style={[
          styles.nodeTextCard,
          {
            backgroundColor: theme.cardBg,
          },
        ]}
      >
        <Text style={[styles.nodeDeckName, { color: theme.textPrimary }]} numberOfLines={1}>
          {deck.name}
        </Text>
        <Text style={[styles.nodeDeckSub, { color: theme.textMuted }]}>
          {deck.cardCount || 0} từ · {dueCount > 0 ? `Cần ôn ${dueCount}` : "Đã thuộc"}
        </Text>
      </TouchableOpacity>
    </View>
  );
});

export function ZigZagSkillPath({ decks, dueCardsMap, onSelectDeck }: ZigZagSkillPathProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const { theme } = useTheme();

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  if (!decks || decks.length === 0) return null;

  const offsets = [0, 48, 68, 36, -36, -68, -48];

  let priorityIdx = 0;
  let maxDue = -1;
  decks.forEach((deck, idx) => {
    const due = dueCardsMap[deck.id] || deck.dueCount || 0;
    if (due > maxDue) {
      maxDue = due;
      priorityIdx = idx;
    }
  });

  const totalDueAllDecks = Object.values(dueCardsMap).reduce((a, b) => a + b, 0);

  return (
    <View style={styles.container}>
      {/* Clean Borderless Unit Title Banner */}
      <View
        style={[
          styles.unitBanner,
          {
            backgroundColor: theme.blue,
          },
        ]}
      >
        <View style={styles.unitBannerTopRow}>
          <View style={styles.dueSummaryPill}>
            <Ionicons name="flame" size={Layout.iconSm} color={theme.yellow} />
            <Text style={styles.dueSummaryText}>{totalDueAllDecks} CẦN ÔN</Text>
          </View>
        </View>

        <Text style={styles.unitBannerTitle}>HÀNH TRÌNH TIẾNG TRUNG</Text>
        <Text style={styles.unitBannerSub}>
          Chọn bộ thẻ bên dưới để bắt đầu lật Flashcard & thực hành phản xạ FSRS!
        </Text>
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
              <PathNodeItem
                deck={deck}
                offset={offset}
                dueCount={dueCount}
                isPriority={isPriority}
                isCompleted={isCompleted}
                pulseAnim={pulseAnim}
                onSelect={onSelectDeck}
              />
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 0,
    paddingBottom: Spacing.sm,
    alignItems: "center",
  },
  unitBanner: {
    width: "100%",
    borderRadius: Radii.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    borderWidth: 0,
  },
  unitBannerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  unitPill: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs / 2,
    borderRadius: Radii.full,
  },
  unitPillText: {
    fontSize: Typography.caption2.fontSize,
    fontWeight: Typography.weight.extraBold,
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  dueSummaryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
    borderRadius: Radii.full,
  },
  dueSummaryText: {
    fontSize: Typography.caption2.fontSize,
    fontWeight: Typography.weight.extraBold,
    color: "#FFFFFF",
  },
  unitBannerTitle: {
    fontSize: Typography.title3.fontSize,
    fontWeight: Typography.weight.extraBold,
    color: "#FFFFFF",
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  unitBannerSub: {
    fontSize: Typography.caption1.fontSize,
    color: "rgba(255, 255, 255, 0.95)",
    fontWeight: Typography.weight.semibold,
    lineHeight: 16,
  },
  pathList: {
    alignItems: "center",
    gap: Spacing.xxl,
    width: "100%",
  },
  mascotPathContainer: {
    marginBottom: -Spacing.xs,
    zIndex: 10,
  },
  nodeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.cellPadding,
  },
  nodeWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  dueBadge: {
    position: "absolute",
    top: -Spacing.sm,
    zIndex: 15,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
    borderRadius: Radii.full,
    borderWidth: BorderWidths.default,
  },
  dueBadgeText: {
    fontSize: Typography.caption2.fontSize,
    fontWeight: Typography.weight.extraBold,
    color: "#FFFFFF",
  },
  completedBadge: {
    position: "absolute",
    top: -Spacing.xs,
    zIndex: 15,
    width: Layout.iconLg,
    height: Layout.iconLg,
    borderRadius: Layout.iconLg / 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: BorderWidths.default,
  },
  nodeButtonCraft: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  nodeTextCard: {
    paddingHorizontal: Spacing.cellPadding,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.lg,
    borderWidth: 0,
    maxWidth: 170,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1,
  },
  nodeDeckName: {
    fontSize: Typography.caption.fontSize,
    fontWeight: Typography.weight.extraBold,
  },
  nodeDeckSub: {
    fontSize: Typography.caption2.fontSize,
    marginTop: 2,
    fontWeight: Typography.weight.semibold,
  },
});
