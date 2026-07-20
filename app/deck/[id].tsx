import React, { useEffect, useState } from "react";
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
import { useStore, Card } from "../../store/useStore";
import { isDue } from "../../lib/srs";
import { Colors, Typography, Spacing, Radii, triggerHaptic } from "../../constants/theme";
import { DeckIcon } from "../../components/ui/DeckIcon";
import { SectionTitle } from "../../components/ui/SectionTitle";
import { InsetGroup } from "../../components/ui/InsetGroup";

export default function DeckDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { decks, cards, fetchCards, deleteCard, deleteDeck, resetDeckProgress, isLoading } = useStore();
  const [resetting, setResetting] = useState(false);
  const deck = decks.find((d) => d.id === id);
  const deckCards = cards[id] || [];

  const handleDeleteDeck = () => {
    if (!deck) return;
    triggerHaptic("warning");
    Alert.alert(
      "Xóa bộ thẻ",
      `Bạn có chắc chắn muốn xóa bộ thẻ "${deck.name}" cùng toàn bộ từ vựng bên trong không?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa bộ thẻ",
          style: "destructive",
          onPress: async () => {
            triggerHaptic("heavy");
            await deleteDeck(id);
            router.back();
          },
        },
      ],
    );
  };

  useEffect(() => {
    if (id) fetchCards(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleDeleteCard = (card: Card) => {
    triggerHaptic("warning");
    Alert.alert("Xoá thẻ", `Bạn có chắc muốn xoá thẻ "${card.character}"?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xoá thẻ",
        style: "destructive",
        onPress: () => {
          triggerHaptic("error");
          deleteCard(card.id, id);
        },
      },
    ]);
  };

  const [clearing, setClearing] = useState(false);

  const handleClearAllCards = () => {
    if (deckCards.length === 0) return;
    triggerHaptic("warning");
    Alert.alert(
      "Xóa toàn bộ thẻ",
      `Bạn có chắc chắn muốn xóa toàn bộ ${deckCards.length} thẻ vựng trong bộ "${deck?.name}" không?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa tất cả",
          style: "destructive",
          onPress: async () => {
            triggerHaptic("heavy");
            setClearing(true);
            try {
              for (const card of deckCards) {
                await deleteCard(card.id, id);
              }
              triggerHaptic("success");
            } catch {
              triggerHaptic("error");
            } finally {
              setClearing(false);
            }
          },
        },
      ],
    );
  };

  const handleResetProgress = () => {
    triggerHaptic("warning");
    Alert.alert(
      "Reset tiến độ học",
      "Tất cả từ vựng trong bộ thẻ này sẽ quay về trạng thái MỚI (chưa học). Bạn có chắc chắn không?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            triggerHaptic("medium");
            setResetting(true);
            try {
              await resetDeckProgress(id);
              triggerHaptic("success");
            } catch (e: any) {
              triggerHaptic("error");
              Alert.alert("Lỗi", e.message || "Không thể reset tiến độ.");
            } finally {
              setResetting(false);
            }
          },
        },
      ],
    );
  };

  if (!deck)
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.accent.indigoLight} size="small" />
      </View>
    );

  const dueCards = deckCards.filter((c) => isDue(c.srs));
  const newCards = deckCards.filter((c) => c.srs.repetitions === 0);
  const learnedCards = deckCards.filter((c) => c.srs.repetitions > 0 && !isDue(c.srs));

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 10, 48) }]}>
        <View style={styles.topNavRow}>
          <TouchableOpacity
            onPress={() => {
              triggerHaptic("light");
              router.back();
            }}
            style={styles.backBtn}
          >
            <Ionicons name="chevron-back" size={24} color={Colors.accent.indigoLight} />
            <Text style={styles.backText}>Bộ thẻ</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleDeleteDeck} style={styles.deleteHeaderBtn} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={20} color={Colors.neon.coral} />
          </TouchableOpacity>
        </View>

        <View style={styles.headerInfo}>
          <View style={styles.deckIconTile}>
            <DeckIcon name={deck.icon} size={22} color={Colors.accent.indigoLight} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.deckName}>{deck.name}</Text>
            {deck.description ? (
              <Text style={styles.deckDesc} numberOfLines={1}>
                {deck.description}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      {/* Quick stats */}
      <View style={styles.statsRow}>
        <StatChip label="Cần ôn" value={dueCards.length} color={Colors.neon.coral} />
        <StatChip label="Mới" value={newCards.length} color={Colors.neon.purple} />
        <StatChip label="Đã học" value={learnedCards.length} color={Colors.neon.emerald} />
      </View>

      {/* Main Action Button */}
      <TouchableOpacity
        style={styles.studyBtn}
        onPress={() => {
          if (deckCards.length === 0) {
            triggerHaptic("medium");
            router.push(`/add?deckId=${id}` as any);
            return;
          }
          if (dueCards.length === 0) return;
          triggerHaptic("medium");
          router.push(`/study/${id}`);
        }}
        activeOpacity={0.8}
      >
        <Ionicons
          name={deckCards.length === 0 ? "add-circle" : dueCards.length > 0 ? "play" : "checkmark-circle"}
          size={18}
          color="#F0F3F6"
          style={{ marginRight: 6 }}
        />
        <Text style={styles.studyBtnText}>
          {deckCards.length === 0
            ? "Thêm từ vựng với AI"
            : dueCards.length > 0
            ? `Bắt đầu ôn tập (${dueCards.length} thẻ)`
            : "Đã hoàn thành ôn tập hôm nay ✓"}
        </Text>
      </TouchableOpacity>

      {deckCards.length > 0 && (
        <View style={styles.actionBtnsRow}>
          <TouchableOpacity
            style={[styles.actionSubBtn, resetting && styles.actionBtnDisabled]}
            onPress={handleResetProgress}
            disabled={resetting}
            activeOpacity={0.8}
          >
            {resetting ? (
              <ActivityIndicator size="small" color={Colors.accent.primaryLight} />
            ) : (
              <>
                <Ionicons name="refresh-outline" size={15} color={Colors.accent.primaryLight} style={{ marginRight: 4 }} />
                <Text style={styles.actionSubBtnText}>Reset tiến độ</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionSubBtn, clearing && styles.actionBtnDisabled]}
            onPress={handleClearAllCards}
            disabled={clearing}
            activeOpacity={0.8}
          >
            {clearing ? (
              <ActivityIndicator size="small" color={Colors.neon.coral} />
            ) : (
              <>
                <Ionicons name="trash-outline" size={15} color={Colors.neon.coral} style={{ marginRight: 4 }} />
                <Text style={[styles.actionSubBtnText, { color: Colors.neon.coral }]}>Xóa tất cả thẻ</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Card list */}
      <ScrollView
        contentContainerStyle={[
          styles.cardList,
          { paddingBottom: Math.max(insets.bottom + 20, 40) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <SectionTitle>DANH SÁCH {deckCards.length} THẺ TRONG BỘ</SectionTitle>

        {isLoading && (
          <ActivityIndicator color={Colors.accent.indigoLight} style={{ marginTop: 20 }} />
        )}

        {deckCards.length > 0 && (
          <InsetGroup>
            {deckCards.map((card, idx) => (
              <React.Fragment key={card.id}>
                {idx > 0 && <View style={styles.cellDividerIndented} />}
                <TouchableOpacity
                  style={styles.cardRow}
                  onPress={() => {
                    triggerHaptic("light");
                    router.push(`/card/${card.id}?deckId=${id}`);
                  }}
                  onLongPress={() => handleDeleteCard(card)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardLeft}>
                    <Text style={styles.cardChar}>{card.character}</Text>
                  </View>

                  <View style={styles.cardMid}>
                    <View style={styles.cardPinyinRow}>
                      <Text style={styles.cardPinyin}>{card.pinyin}</Text>
                      <Text style={styles.cardHanviet}>{card.hanviet}</Text>
                    </View>
                    <Text style={styles.cardTranslation} numberOfLines={1}>
                      {card.translation}
                    </Text>
                  </View>

                  <View style={styles.cardRight}>
                    <Text style={styles.intervalText}>{card.srs.interval}d</Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={Colors.accent.gray3}
                      style={{ marginLeft: 4 }}
                    />
                  </View>
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </InsetGroup>
        )}

        {deckCards.length === 0 && !isLoading && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Chưa có thẻ nào trong bộ này</Text>
            <Text style={styles.emptySub}>Dùng tab "Thêm từ" để tự động tạo từ vựng bằng AI.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function StatChip({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <View style={styles.chip}>
      <Text style={[styles.chipValue, color ? { color } : null]}>{value}</Text>
      <Text style={styles.chipLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.bg.primary,
  },

  header: { paddingHorizontal: Spacing.pageMargin, paddingBottom: Spacing.lg },
  topNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
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

  headerInfo: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  deckIconTile: {
    width: 44,
    height: 44,
    borderRadius: Radii.card,
    backgroundColor: Colors.bg.secondary,
    borderWidth: 1,
    borderColor: Colors.border.default,
    alignItems: "center",
    justifyContent: "center",
  },
  deckName: {
    fontSize: Typography.text.title2.fontSize,
    lineHeight: Typography.text.title2.lineHeight,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  deckDesc: {
    fontSize: Typography.text.caption1.fontSize,
    color: Colors.text.secondary,
    marginTop: 1,
  },

  statsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.pageMargin,
    marginBottom: Spacing.lg,
  },
  chip: {
    flex: 1,
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radii.card,
    padding: Spacing.cellHorizontal,
    alignItems: "center",
  },
  chipValue: {
    fontSize: Typography.text.title2.fontSize,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  chipLabel: {
    fontSize: Typography.text.caption1.fontSize,
    color: Colors.text.secondary,
    marginTop: 2,
    fontWeight: Typography.weight.semibold,
  },

  studyBtn: {
    backgroundColor: Colors.accent.primary,
    marginHorizontal: Spacing.pageMargin,
    borderRadius: Radii.card,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginBottom: Spacing.md,
  },
  studyBtnDisabled: {
    backgroundColor: Colors.bg.tertiary,
    opacity: 0.6,
  },
  studyBtnText: {
    color: "#F0F3F6",
    fontWeight: Typography.weight.semibold,
    fontSize: Typography.text.callout.fontSize,
    letterSpacing: -0.2,
    textAlign: "center",
    textAlignVertical: "center",
    includeFontPadding: false,
  },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: Spacing.pageMargin,
    borderRadius: Radii.card,
    height: 40,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.bg.secondary,
  },
  resetBtnDisabled: { opacity: 0.5 },
  resetBtnText: {
    color: Colors.neon.coral,
    fontWeight: Typography.weight.semibold,
    fontSize: Typography.text.footnote.fontSize,
    letterSpacing: 0.5,
    textAlign: "center",
    textAlignVertical: "center",
    includeFontPadding: false,
  },

  cardList: { paddingHorizontal: Spacing.pageMargin },

  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.cellHorizontal,
    paddingVertical: Spacing.cellVertical,
    minHeight: Spacing.cellMinHeight,
  },
  cellDividerIndented: {
    height: 1,
    backgroundColor: Colors.border.separator,
    marginLeft: 56,
  },
  cardLeft: { width: 40, alignItems: "center" },
  cardChar: {
    fontSize: Typography.hanzi.sm,
    color: Colors.text.primary,
    fontWeight: Typography.weight.bold,
  },
  cardMid: { flex: 1, paddingHorizontal: Spacing.md },
  cardPinyinRow: { flexDirection: "row", gap: 6, alignItems: "baseline" },
  cardPinyin: {
    fontSize: Typography.text.subhead.fontSize,
    color: Colors.neon.cyan,
    fontWeight: Typography.weight.semibold,
  },
  cardHanviet: {
    fontSize: Typography.text.caption1.fontSize,
    color: Colors.text.secondary,
    fontWeight: Typography.weight.medium,
  },
  cardTranslation: {
    fontSize: Typography.text.caption1.fontSize,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  cardRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  intervalText: { fontSize: Typography.text.caption2.fontSize, color: Colors.text.secondary },

  actionBtnsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginHorizontal: Spacing.pageMargin,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  actionSubBtn: {
    flex: 1,
    height: 40,
    borderRadius: Radii.card,
    backgroundColor: Colors.bg.secondary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnDisabled: { opacity: 0.5 },
  actionSubBtnText: {
    fontSize: Typography.text.footnote.fontSize,
    fontWeight: Typography.weight.semibold,
    color: Colors.accent.primaryLight,
  },
  emptyCard: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radii.card,
    padding: Spacing.xl,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: Typography.text.body.fontSize,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
  },
  emptySub: {
    fontSize: Typography.text.caption1.fontSize,
    color: Colors.text.secondary,
    marginTop: 4,
    textAlign: "center",
  },
});
