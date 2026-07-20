import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Speech from "expo-speech";
import { useStore } from "../../store/useStore";
import { isDue } from "../../lib/srs";
import { Colors, Typography, Spacing, Radii, triggerHaptic } from "../../constants/theme";
import { SectionTitle } from "../../components/ui/SectionTitle";
import { InsetGroup } from "../../components/ui/InsetGroup";
import { InsetRow } from "../../components/ui/InsetRow";

export default function CardDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id, deckId } = useLocalSearchParams<{ id: string; deckId: string }>();
  const { cards, deleteCard } = useStore();
  const [speaking, setSpeaking] = useState(false);

  const deckCards = cards[deckId] || [];
  const card = deckCards.find((c) => c.id === id);

  const handleDelete = () => {
    if (!card) return;
    triggerHaptic("warning");
    Alert.alert("Xóa thẻ vựng", `Bạn có chắc chắn muốn xóa từ "${card.character}" khỏi bộ thẻ?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa thẻ",
        style: "destructive",
        onPress: async () => {
          triggerHaptic("medium");
          await deleteCard(card.id, deckId);
          router.back();
        },
      },
    ]);
  };

  const speak = () => {
    if (!card) return;
    triggerHaptic("selection");
    setSpeaking(true);
    Speech.speak(card.character, {
      language: "zh-CN",
      rate: 0.8,
      onDone: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  };

  if (!card) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.accent.indigoLight} size="small" />
      </View>
    );
  }

  const due = isDue(card.srs);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: Math.max(insets.top + 16, 54),
          paddingBottom: Math.max(insets.bottom + 20, 40),
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Header Navigation */}
      <View style={styles.topNavRow}>
        <TouchableOpacity
          onPress={() => {
            triggerHaptic("light");
            router.back();
          }}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.accent.indigoLight} />
          <Text style={styles.backText}>Quay lại</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleDelete} style={styles.deleteHeaderBtn} activeOpacity={0.7}>
          <Ionicons name="trash-outline" size={20} color={Colors.neon.coral} />
        </TouchableOpacity>
      </View>

      {/* Word Hero Card */}
      <View style={styles.wordHeroCard}>
        <View style={styles.wordHeaderRow}>
          <Text style={styles.characterText}>{card.character}</Text>
          {card.hskLevel ? (
            <View style={styles.hskChip}>
              <Text style={styles.hskChipText}>HSK {card.hskLevel}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.subInfoRow}>
          <Text style={styles.pinyinText}>{card.pinyin}</Text>
        </View>

        <Text style={styles.translationText}>{card.translation}</Text>

        <TouchableOpacity style={styles.speakPillBtn} onPress={speak} activeOpacity={0.8}>
          <Ionicons
            name={speaking ? "volume-high" : "volume-medium"}
            size={16}
            color={Colors.accent.indigoLight}
          />
          <Text style={styles.speakPillText}>{speaking ? "Đang phát âm..." : "Nghe phát âm"}</Text>
        </TouchableOpacity>
      </View>

      {/* Info Group */}
      <SectionTitle>THÔNG TIN TỪ VỰNG</SectionTitle>
      <InsetGroup>
        <InsetRow label="Pinyin" value={card.pinyin} valueColor={Colors.neon.cyan} labelStyle={{ width: 100 }} />
        <InsetRow label="Nghĩa TV" value={card.translation} isBorder labelStyle={{ width: 100 }} />
        {card.traditional && card.traditional !== card.character && (
          <InsetRow label="Phồn thể" value={card.traditional} isBorder labelStyle={{ width: 100 }} />
        )}
        {card.radical ? (
          <InsetRow label="Bộ thủ" value={card.radical} isBorder labelStyle={{ width: 100 }} />
        ) : null}
        {card.strokeCount ? (
          <InsetRow label="Số nét" value={`${card.strokeCount} nét`} isBorder labelStyle={{ width: 100 }} />
        ) : null}
        {card.tags && card.tags.length > 0 && (
          <InsetRow label="Phân loại" value={card.tags.join(", ")} isBorder labelStyle={{ width: 100 }} />
        )}
      </InsetGroup>

      {/* SRS Memory Group */}
      <SectionTitle>TRẠNG THÁI TRÍ NHỚ (ANKI)</SectionTitle>
      <InsetGroup>
        <InsetRow label="Lần ôn" value={`${card.srs.repetitions} lần`} labelStyle={{ width: 100 }} />
        <InsetRow label="Khoảng cách" value={`${card.srs.interval} ngày`} isBorder labelStyle={{ width: 100 }} />
        <InsetRow label="Hệ số Ease" value={`${card.srs.easeFactor}`} isBorder labelStyle={{ width: 100 }} />
        <InsetRow
          label="Trạng thái"
          value={due ? "Cần ôn ngay" : "Đã thuộc"}
          valueColor={due ? Colors.neon.coral : Colors.neon.emerald}
          isBorder
          labelStyle={{ width: 100 }}
        />
        <InsetRow
          label="Lần ôn tiếp"
          value={new Date(card.srs.dueDate).toLocaleDateString("vi-VN")}
          isBorder
          labelStyle={{ width: 100 }}
        />
      </InsetGroup>

      {/* Examples Group */}
      {card.examples && card.examples.length > 0 && (
        <>
          <SectionTitle>CÂU VÍ DỤ NGUYÊN CẢNH</SectionTitle>
          <InsetGroup>
            {card.examples.map((ex, i) => (
              <View key={i} style={[styles.exampleItem, i > 0 && styles.cellBorderTop]}>
                <Text style={styles.exCn}>{ex.chinese}</Text>
                <Text style={styles.exPy}>{ex.pinyin}</Text>
                <Text style={styles.exVi}>{ex.vietnamese}</Text>
              </View>
            ))}
          </InsetGroup>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  content: { paddingHorizontal: Spacing.pageMargin },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.bg.primary,
  },

  topNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  backText: {
    color: Colors.accent.indigoLight,
    fontSize: Typography.text.body.fontSize,
    fontWeight: Typography.weight.medium,
  },
  deleteHeaderBtn: {
    padding: Spacing.xs,
  },

  wordHeroCard: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radii.card,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    alignItems: "flex-start",
  },
  wordHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  characterText: {
    fontSize: 34,
    lineHeight: 40,
    color: Colors.text.primary,
    fontWeight: Typography.weight.bold,
  },
  hskChip: {
    backgroundColor: Colors.bg.tertiary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  hskChipText: {
    fontSize: Typography.text.caption2.fontSize,
    color: Colors.accent.indigoLight,
    fontWeight: Typography.weight.bold,
  },
  subInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  pinyinText: {
    fontSize: Typography.text.callout.fontSize,
    color: Colors.neon.cyan,
    fontWeight: Typography.weight.semibold,
  },
  dotSeparator: {
    color: Colors.text.tertiary,
    fontSize: 12,
  },
  hanvietText: {
    fontSize: Typography.text.subhead.fontSize,
    color: Colors.text.secondary,
    fontWeight: Typography.weight.medium,
  },
  translationText: {
    fontSize: Typography.text.body.fontSize,
    color: Colors.text.primary,
    fontWeight: Typography.weight.semibold,
    marginTop: 8,
  },
  speakPillBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: Spacing.md,
    backgroundColor: Colors.bg.tertiary,
    borderRadius: Radii.full,
    height: 32,
    paddingHorizontal: Spacing.md,
  },
  speakPillText: {
    color: Colors.accent.indigoLight,
    fontSize: Typography.text.caption1.fontSize,
    fontWeight: Typography.weight.bold,
  },

  cellBorderTop: {
    borderTopWidth: 1,
    borderTopColor: Colors.border.separator,
  },

  exampleItem: {
    padding: Spacing.cellHorizontal,
  },
  exCn: {
    fontSize: Typography.text.body.fontSize,
    color: Colors.text.primary,
    fontWeight: Typography.weight.semibold,
  },
  exPy: { fontSize: Typography.text.footnote.fontSize, color: Colors.neon.cyan, marginTop: 2 },
  exVi: { fontSize: Typography.text.footnote.fontSize, color: Colors.text.secondary, marginTop: 2 },
});
