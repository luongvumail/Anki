import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Spacing, Radii, Typography, Layout } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import { DeckIcon } from "../ui/DeckIcon";
import { AppCard } from "../ui/AppCard";
import { AppButton } from "../ui/AppButton";
import { ProgressBar } from "../ui/ProgressBar";
import { Deck } from "../../store/slices/types";

interface DeckCardItemProps {
  itemStats: {
    deck: Deck;
    total: number;
    due: number;
    newCount: number;
    reviewCount: number;
    masteryPct: number;
  };
  onDelete: (deckId: string, name: string) => void;
}

export const DeckCardItem = React.memo(function DeckCardItem({
  itemStats,
  onDelete,
}: DeckCardItemProps) {
  const { deck, total, due, masteryPct } = itemStats;
  const { theme } = useTheme();

  return (
    <AppCard style={styles.deckCardItem} onPress={() => router.push(`/deck/${deck.id}`)}>
      <View style={styles.deckHeaderRow}>
        <View style={[styles.deckIconBox, { backgroundColor: theme.blueDim }]}>
          <DeckIcon name={deck.icon || "book-outline"} size={Layout.iconLg} color={theme.blue} />
        </View>

        <View style={styles.deckMainTitleBox}>
          <View style={styles.titleChevronRow}>
            <Text style={[styles.deckTitle, { color: theme.textPrimary }]} numberOfLines={1}>
              {deck.name}
            </Text>
            <Ionicons name="chevron-forward" size={Layout.iconMd} color={theme.textMuted} />
          </View>
          <Text style={[styles.deckCardCountText, { color: theme.textMuted }]}>
            {total} từ vựng {due > 0 ? ` · ${due} thẻ cần ôn` : ""}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => onDelete(deck.id, deck.name)}
          style={styles.deleteBtn}
          hitSlop={Layout.hitSlopLg}
        >
          <Ionicons name="trash-outline" size={Layout.iconMd} color={theme.red} />
        </TouchableOpacity>
      </View>

      {deck.description ? (
        <Text style={[styles.deckDesc, { color: theme.textSubhead }]} numberOfLines={2}>
          {deck.description}
        </Text>
      ) : null}

      <View style={styles.masteryBarRow}>
        <ProgressBar
          progress={masteryPct / 100}
          height={Spacing.sm}
          fillColor={theme.green}
          style={{ flex: 1 }}
        />
        <Text style={[styles.masteryPctText, { color: theme.green }]}>{masteryPct}% Thuộc</Text>
      </View>

      <AppButton
        title={due > 0 ? `HỌC BÀI NGAY (${due} THẺ DỰ ĐỊNH)` : "XEM DANH SÁCH TỪ VỰNG"}
        variant={due > 0 ? "primary" : "secondary"}
        size="lg"
        onPress={() => {
          if (due > 0) {
            router.push(`/study/${deck.id}`);
          } else {
            router.push(`/deck/${deck.id}`);
          }
        }}
        style={{ marginTop: Spacing.md }}
      />
    </AppCard>
  );
});

const styles = StyleSheet.create({
  deckCardItem: { padding: Spacing.md, marginBottom: Spacing.cellPadding },
  deckHeaderRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  deckIconBox: {
    width: Layout.avatarMd,
    height: Layout.avatarMd,
    borderRadius: Radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  deckMainTitleBox: { flex: 1 },
  titleChevronRow: { flexDirection: "row", alignItems: "center", gap: Spacing.xs },
  deckTitle: {
    fontSize: Typography.bodyLG.fontSize,
    fontWeight: Typography.weight.extraBold,
    flexShrink: 1,
  },
  deckCardCountText: {
    fontSize: Typography.caption.fontSize,
    marginTop: 2,
    fontWeight: Typography.weight.semibold,
  },
  deleteBtn: { padding: Spacing.xs },
  deckDesc: { fontSize: Typography.caption.fontSize, marginTop: Spacing.xs, lineHeight: 17 },
  masteryBarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  masteryPctText: {
    fontSize: Typography.caption2.fontSize,
    fontWeight: Typography.weight.extraBold,
  },
});
