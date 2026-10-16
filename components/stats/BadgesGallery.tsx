import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStore, Card } from "../../store/useStore";
import { ALL_BADGES } from "../../store/slices/userProgressSlice";
import { Spacing, Typography, Layout, Radii } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import { AppCard } from "../ui/AppCard";
import { SectionTitle } from "../ui/SectionTitle";
import { computeLearnedCount } from "../../lib/deckUtils";

interface BadgesGalleryProps {
  streakCount?: number;
  learnedCards?: number;
}

export function BadgesGallery({
  streakCount: propStreak,
  learnedCards: propLearned,
}: BadgesGalleryProps) {
  const { theme } = useTheme();
  const unlockedBadgeIds = useStore((s) => s.unlockedBadgeIds || []);
  const checkAndUnlockBadges = useStore((s) => s.checkAndUnlockBadges);

  const fallbackCards = useStore((s) => {
    let list: Card[] = [];
    Object.values(s.cards).forEach((cardList) => {
      list = list.concat(cardList);
    });
    return computeLearnedCount(list);
  });

  const streakCount = propStreak ?? 0;
  const learnedCardsCount = propLearned ?? fallbackCards;

  React.useEffect(() => {
    if (checkAndUnlockBadges) {
      checkAndUnlockBadges(streakCount, learnedCardsCount);
    }
  }, [streakCount, learnedCardsCount, checkAndUnlockBadges]);

  return (
    <View style={styles.container}>
      <SectionTitle>BỘ SƯU TẬP HUY HIỆU THÀNH TÍCH</SectionTitle>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
      >
        {ALL_BADGES.map((badge) => {
          let isUnlocked = unlockedBadgeIds.includes(badge.id);
          let progressText = "";

          if (badge.category === "streak") {
            progressText = `${Math.min(badge.target, streakCount)}/${badge.target} ngày`;
            if (streakCount >= badge.target) isUnlocked = true;
          } else if (badge.category === "vocab") {
            progressText = `${Math.min(badge.target, learnedCardsCount)}/${badge.target} từ`;
            if (learnedCardsCount >= badge.target) isUnlocked = true;
          } else {
            progressText = isUnlocked ? "Đạt" : `Chưa mở`;
          }

          return (
            <AppCard
              key={badge.id}
              style={StyleSheet.flatten([
                styles.badgeCompactCard,
                {
                  borderColor: isUnlocked ? theme.yellow : theme.cardBorder,
                  opacity: isUnlocked ? 1 : 0.75,
                },
              ])}
            >
              <View
                style={[
                  styles.iconBoxCompact,
                  { backgroundColor: isUnlocked ? theme.yellowDim : theme.bgSoft },
                ]}
              >
                <Ionicons
                  name={badge.icon as any}
                  size={Layout.iconMd}
                  color={isUnlocked ? theme.yellow : theme.textMuted}
                />
              </View>

              <Text
                style={[
                  styles.badgeTitle,
                  { color: isUnlocked ? theme.textPrimary : theme.textMuted },
                ]}
                numberOfLines={1}
              >
                {badge.title}
              </Text>

              <Text style={[styles.badgeDesc, { color: theme.textMuted }]} numberOfLines={1}>
                {badge.description}
              </Text>

              <View
                style={[
                  styles.tagCompact,
                  { backgroundColor: isUnlocked ? theme.greenDim : theme.bgSoft },
                ]}
              >
                <Text
                  style={[
                    styles.progressText,
                    { color: isUnlocked ? theme.green : theme.textMuted },
                  ]}
                >
                  {isUnlocked ? "ĐÃ MỞ" : progressText}
                </Text>
              </View>
            </AppCard>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: Spacing.xs, marginBottom: Spacing.xl },

  horizontalList: { gap: Spacing.sm, paddingRight: Spacing.pageMargin },
  badgeCompactCard: {
    width: 135,
    padding: Spacing.sm,
    alignItems: "center",
  },
  iconBoxCompact: {
    width: Layout.avatarMd,
    height: Layout.avatarMd,
    borderRadius: Radii.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
  },
  badgeTitle: {
    fontSize: Typography.caption.fontSize,
    fontWeight: Typography.weight.extraBold,
    textAlign: "center",
  },
  badgeDesc: {
    fontSize: Typography.caption2.fontSize,
    textAlign: "center",
    marginTop: 2,
  },
  tagCompact: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: Radii.sm,
    marginTop: Spacing.xs,
  },
  progressText: {
    fontSize: Typography.caption2.fontSize - 1,
    fontWeight: Typography.weight.extraBold,
  },
});
