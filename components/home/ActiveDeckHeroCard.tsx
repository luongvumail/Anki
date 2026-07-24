import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Radii, Spacing } from "../../constants/theme";
import { Deck } from "../../store/slices/types";
import { DeckIcon } from "../ui/DeckIcon";
import { DuolingoButton } from "../ui/DuolingoButton";

interface ActiveDeckHeroCardProps {
  deck: Deck;
  dueCount: number;
  learnedCount: number;
  newCount: number;
  onStartStudy: () => void;
  onChangeDeck: () => void;
}

export function ActiveDeckHeroCard({
  deck,
  dueCount,
  learnedCount,
  newCount,
  onStartStudy,
  onChangeDeck,
}: ActiveDeckHeroCardProps) {
  const totalCards = deck.cardCount || (dueCount + learnedCount + newCount) || 0;

  return (
    <View style={styles.cardContainer}>
      {/* Top Header Row: Deck Info & Change Deck Button */}
      <View style={styles.topRow}>
        <TouchableOpacity
          style={styles.deckTitleBtn}
          onPress={onChangeDeck}
          activeOpacity={0.8}
        >
          <View style={styles.iconTile}>
            <DeckIcon name={deck.icon} size={22} color={Colors.duolingo.blue} />
          </View>
          <View style={styles.titleTextGroup}>
            <Text style={styles.deckLabel}>BỘ THẺ ĐANG HỌC</Text>
            <View style={styles.nameRow}>
              <Text style={styles.deckNameText} numberOfLines={1}>
                {deck.name}
              </Text>
              <Ionicons name="chevron-down" size={16} color={Colors.duolingo.blue} />
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.switchBadge}
          onPress={onChangeDeck}
          activeOpacity={0.8}
        >
          <Text style={styles.switchBadgeText}>Đổi bộ ▾</Text>
        </TouchableOpacity>
      </View>

      {/* SRS Stats Row: Due, Learned, New */}
      <View style={styles.statsGrid}>
        {/* DUE COUNT (RED) */}
        <View style={[styles.statBox, styles.statBoxDue]}>
          <Text style={styles.statEmoji}>🔥</Text>
          <View>
            <Text style={[styles.statValueText, { color: Colors.duolingo.red }]}>
              {dueCount}
            </Text>
            <Text style={styles.statLabelText}>Cần ôn</Text>
          </View>
        </View>

        {/* LEARNED COUNT (GREEN) */}
        <View style={[styles.statBox, styles.statBoxLearned]}>
          <Text style={styles.statEmoji}>✅</Text>
          <View>
            <Text style={[styles.statValueText, { color: Colors.duolingo.green }]}>
              {learnedCount}
            </Text>
            <Text style={styles.statLabelText}>Đã thuộc</Text>
          </View>
        </View>

        {/* NEW COUNT (BLUE) */}
        <View style={[styles.statBox, styles.statBoxNew]}>
          <Text style={styles.statEmoji}>🆕</Text>
          <View>
            <Text style={[styles.statValueText, { color: "#FFFFFF" }]}>
              {newCount}
            </Text>
            <Text style={styles.statLabelText}>Từ mới</Text>
          </View>
        </View>
      </View>

      {/* Main Start Action Button */}
      <DuolingoButton
        title={
          dueCount > 0
            ? `🚀 ÔN TẬP NGAY (${dueCount} TỪ CẦN ÔN)`
            : totalCards > 0
            ? "🚀 BẮT ĐẦU HỌC BÀI KẾ TIẾP"
            : "➕ THÊM TỪ VỰNG VÀO BỘ"
        }
        variant="primary"
        size="lg"
        onPress={onStartStudy}
        style={{ marginTop: Spacing.xs }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: Colors.duolingo.cardBg,
    borderRadius: Radii.xl,
    borderBottomWidth: 5,
    borderBottomColor: Colors.duolingo.cardBottom,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  deckTitleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  iconTile: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.duolingo.bgSoftDark,
    alignItems: "center",
    justifyContent: "center",
  },
  titleTextGroup: {
    flex: 1,
  },
  deckLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.duolingo.textMuted,
    letterSpacing: 0.8,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  deckNameText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    flexShrink: 1,
  },
  switchBadge: {
    backgroundColor: Colors.duolingo.bgSoftDark,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.full,
    borderBottomWidth: 2,
    borderBottomColor: Colors.duolingo.cardBottom,
  },
  switchBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  statsGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: Spacing.md,
  },
  statBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: Radii.lg,
    backgroundColor: Colors.duolingo.bgSoftDark,
  },
  statBoxDue: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.duolingo.red,
  },
  statBoxLearned: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.duolingo.green,
  },
  statBoxNew: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.duolingo.blue,
  },
  statEmoji: {
    fontSize: 16,
  },
  statValueText: {
    fontSize: 16,
    fontWeight: "800",
  },
  statLabelText: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.duolingo.textMuted,
  },
});
