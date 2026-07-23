import React, { useState, useEffect, useMemo } from "react";
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
import { getPinyinToneColor } from "../../lib/pinyinColor";
import { Colors, Typography, Spacing, Radii, triggerHaptic } from "../../constants/theme";
import { SectionTitle } from "../../components/ui/SectionTitle";
import { DuolingoCard } from "../../components/ui/DuolingoCard";
import { DuolingoButton } from "../../components/ui/DuolingoButton";

export default function CardDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id, deckId } = useLocalSearchParams<{ id: string; deckId: string }>();
  const cards = useStore((s) => s.cards);
  const deleteCard = useStore((s) => s.deleteCard);
  const [speaking, setSpeaking] = useState(false);

  const card = useMemo(() => {
    const deckCards = cards[deckId] || [];
    return deckCards.find((c) => c.id === id);
  }, [cards, deckId, id]);

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  const handleDelete = () => {
    if (!card) return;
    triggerHaptic("warning");
    Alert.alert("Xóa thẻ vựng", `Bạn có chắc chắn muốn xóa từ "${card.character}" khỏi bộ thẻ?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa thẻ",
        style: "destructive",
        onPress: async () => {
          triggerHaptic("heavy");
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={Colors.duolingo.blue} />
      </View>
    );
  }

  const pinyinColor = getPinyinToneColor(card.pinyin);

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={[styles.headerBar, { paddingTop: Math.max(insets.top + 8, 44) }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            triggerHaptic("light");
            router.back();
          }}
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>CHI TIẾT TỪ VỰNG</Text>

        <TouchableOpacity style={styles.deleteCardBtn} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={22} color={Colors.duolingo.red} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 40, 60) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Flashcard Hero Banner */}
        <DuolingoCard style={styles.heroCard}>
          <Text style={styles.characterBig}>{card.character}</Text>
          {card.traditional && card.traditional !== card.character ? (
            <Text style={styles.traditionalText}>Phồn thể: {card.traditional}</Text>
          ) : null}

          <Text style={[styles.pinyinBig, { color: pinyinColor }]}>{card.pinyin}</Text>
          <Text style={styles.translationBig}>{card.translation}</Text>

          {/* 3D Audio Push Button */}
          <DuolingoButton
            title={speaking ? "ĐANG PHÁT..." : "🔊 NGHE PHÁT ÂM"}
            variant="blue"
            onPress={speak}
            height={48}
            style={{ marginTop: Spacing.md }}
          />
        </DuolingoCard>

        {/* SRS Learning Status Card */}
        <SectionTitle>TRẠNG THÁI TRÍ NHỚ (SRS)</SectionTitle>
        <DuolingoCard style={styles.detailCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Trạng thái hiện tại</Text>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: isDue(card.srs)
                    ? Colors.duolingo.red
                    : card.srs?.repetitions > 0
                    ? Colors.duolingo.green
                    : Colors.duolingo.blue,
                },
              ]}
            >
              <Text style={styles.statusBadgeText}>
                {isDue(card.srs)
                  ? "⚡ CẦN ÔN TẬP"
                  : card.srs?.repetitions > 0
                  ? "✓ ĐÃ THUỘC"
                  : "✨ TỪ MỚI"}
              </Text>
            </View>
          </View>

          <View style={[styles.detailRow, styles.borderTop]}>
            <Text style={styles.detailLabel}>Số lần đã ôn thành công</Text>
            <Text style={styles.detailVal}>{card.srs?.repetitions || 0} lần</Text>
          </View>

          <View style={[styles.detailRow, styles.borderTop]}>
            <Text style={styles.detailLabel}>Khoảng cách lặp lại (Interval)</Text>
            <Text style={styles.detailVal}>{card.srs?.interval || 0} ngày</Text>
          </View>

          <View style={[styles.detailRow, styles.borderTop]}>
            <Text style={styles.detailLabel}>Hệ số dễ (Ease Factor)</Text>
            <Text style={styles.detailVal}>{((card.srs?.easeFactor || 2.5) * 100).toFixed(0)}%</Text>
          </View>
        </DuolingoCard>

        {/* Example Sentences */}
        {card.examples && card.examples.length > 0 ? (
          <>
            <SectionTitle>CÂU VÍ DỤ MINH HỌA</SectionTitle>
            {card.examples.map((ex, idx) => (
              <DuolingoCard key={idx} style={styles.exampleCard}>
                <Text style={styles.exampleCn}>{ex.chinese}</Text>
                {ex.pinyin ? (
                  <Text style={[styles.examplePy, { color: pinyinColor }]}>{ex.pinyin}</Text>
                ) : null}
                <Text style={styles.exampleVi}>{ex.vietnamese}</Text>
              </DuolingoCard>
            ))}
          </>
        ) : null}

        {/* Delete Button */}
        <DuolingoButton
          title="🗑️ XÓA THẺ TỪ VỰNG NÀY"
          variant="error"
          onPress={handleDelete}
          height={48}
          style={{ marginTop: Spacing.md }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.duolingo.bg },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.duolingo.bg },

  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.pageMargin,
    paddingBottom: Spacing.xs,
    backgroundColor: Colors.duolingo.bg,
    borderBottomWidth: 2,
    borderBottomColor: Colors.duolingo.cardBorder,
  },
  backBtn: { padding: 4 },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  deleteCardBtn: { padding: 4 },

  scrollContent: { paddingHorizontal: Spacing.pageMargin, paddingTop: Spacing.md },

  heroCard: { padding: Spacing.xl, alignItems: "center", marginBottom: Spacing.lg },
  characterBig: { fontSize: 64, fontWeight: "800", color: "#FFFFFF" },
  traditionalText: { fontSize: 13, color: Colors.duolingo.textMuted, marginTop: 2 },
  pinyinBig: { fontSize: 22, fontWeight: "800", marginTop: Spacing.xs },
  translationBig: { fontSize: 18, fontWeight: "700", color: "#FFFFFF", marginTop: 4, textAlign: "center" },

  detailCard: { padding: Spacing.md, marginBottom: Spacing.lg },
  detailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: Spacing.sm },
  borderTop: { borderTopWidth: 1, borderTopColor: Colors.duolingo.cardBorder },
  detailLabel: { fontSize: 14, color: Colors.duolingo.textMuted, fontWeight: "600" },
  detailVal: { fontSize: 14, fontWeight: "800", color: "#FFFFFF" },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.full,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  exampleCard: { padding: Spacing.md, marginBottom: 10 },
  exampleCn: { fontSize: 16, fontWeight: "800", color: "#FFFFFF" },
  examplePy: { fontSize: 13, marginTop: 2, fontWeight: "600" },
  exampleVi: { fontSize: 13, color: Colors.duolingo.textMuted, marginTop: 2 },
});
