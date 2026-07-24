import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Speech from "expo-speech";
import { useStore, Card } from "../../store/useStore";
import { getPinyinToneColor } from "../../lib/pinyinColor";
import { Colors, Spacing, triggerHaptic } from "../../constants/theme";
import { DeckIcon } from "../../components/ui/DeckIcon";
import { SectionTitle } from "../../components/ui/SectionTitle";
import { DuolingoCard } from "../../components/ui/DuolingoCard";
import { DuolingoButton } from "../../components/ui/DuolingoButton";
import { ProgressBar } from "../../components/ui/ProgressBar";

import { FloatingAddButton } from "../../components/ui/FloatingAddButton";
import { AIAddCardModal } from "../../components/add/AIAddCardModal";

export default function DeckDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const decks = useStore((s) => s.decks);
  const cards = useStore((s) => s.cards);
  const fetchCards = useStore((s) => s.fetchCards);
  const deleteDeck = useStore((s) => s.deleteDeck);
  const resetDeckProgress = useStore((s) => s.resetDeckProgress);
  const isLoading = useStore((s) => s.isLoading);

  const [showAIAddModal, setShowAIAddModal] = useState(false);

  const deck = useMemo(() => decks.find((d) => d.id === id), [decks, id]);
  const deckCards = useMemo(() => cards[id] || [], [cards, id]);

  const learnedCardsCount = useMemo(() => {
    return deckCards.filter((c) => c.srs && c.srs.repetitions > 0).length;
  }, [deckCards]);

  const masteryPct = useMemo(() => {
    if (deckCards.length === 0) return 0;
    return Math.round((learnedCardsCount / deckCards.length) * 100);
  }, [deckCards.length, learnedCardsCount]);

  useEffect(() => {
    if (id) fetchCards(id);
    return () => {
      Speech.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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

  const handleResetProgress = () => {
    if (!deck) return;
    triggerHaptic("warning");
    Alert.alert(
      "Đặt lại tiến độ",
      `Tất cả từ vựng trong bộ "${deck.name}" sẽ được reset về chưa học.`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Reset ngay",
          style: "destructive",
          onPress: async () => {
            triggerHaptic("heavy");
            await resetDeckProgress(id);
            triggerHaptic("success");
          },
        },
      ],
    );
  };

  const speak = (character: string) => {
    triggerHaptic("selection");
    Speech.speak(character, {
      language: "zh-CN",
      rate: 0.8,
    });
  };

  const renderCardItem = useCallback(
    ({ item }: { item: Card }) => {
      const pinyinColor = getPinyinToneColor(item.pinyin);

      return (
        <DuolingoCard
          style={styles.cardItem}
          onPress={() => {
            triggerHaptic("light");
            router.push(`/card/${item.id}?deckId=${id}`);
          }}
        >
          <View style={styles.cardItemRow}>
            <View style={styles.cardMainInfo}>
              <View style={styles.charRow}>
                <Text style={styles.cardCharacter}>{item.character}</Text>
                <Text style={[styles.cardPinyin, { color: pinyinColor }]}>
                  {item.pinyin}
                </Text>
              </View>
              <Text style={styles.cardMeaning} numberOfLines={1}>
                {item.translation}
              </Text>
            </View>

            {/* Speaker Audio Btn */}
            <TouchableOpacity
              style={styles.speakSmallBtn}
              onPress={() => speak(item.character)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="volume-medium" size={20} color={Colors.duolingo.blue} />
            </TouchableOpacity>
          </View>
        </DuolingoCard>
      );
    },
    [id],
  );

  if (!deck) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={Colors.duolingo.blue} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
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

        <Text style={styles.headerTitle} numberOfLines={1}>
          {deck.name}
        </Text>

        <TouchableOpacity style={styles.deleteDeckBtn} onPress={handleDeleteDeck}>
          <Ionicons name="trash-outline" size={20} color={Colors.duolingo.red} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={deckCards}
        keyExtractor={(c) => c.id}
        renderItem={renderCardItem}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom + 40, 60) },
        ]}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            {/* Deck Summary Hero Card */}
            <DuolingoCard style={styles.summaryCard}>
              <View style={styles.summaryTopRow}>
                <View style={styles.iconBox}>
                  <DeckIcon name={deck.icon} size={28} color={Colors.duolingo.blue} />
                </View>
                <View style={styles.summaryTextMain}>
                  <Text style={styles.summaryTitle}>{deck.name}</Text>
                  <Text style={styles.summarySub}>{deckCards.length} thẻ từ vựng</Text>
                </View>
              </View>

              {deck.description ? (
                <Text style={styles.deckDescText}>{deck.description}</Text>
              ) : null}

              <ProgressBar
                progress={masteryPct / 100}
                height={12}
                fillColor={Colors.duolingo.green}
                style={{ marginTop: Spacing.sm }}
              />

              {/* Action Buttons */}
              <DuolingoButton
                title="BẮT ĐẦU ÔN BỘ NÀY ➜"
                variant="primary"
                size="lg"
                disabled={deckCards.length === 0}
                onPress={() => {
                  triggerHaptic("medium");
                  router.push(`/study/${deck.id}`);
                }}
                style={{ marginTop: Spacing.md }}
              />

              <DuolingoButton
                title="✨ THÊM TỪ VỰNG BẰNG AI ➜"
                variant="primary"
                size="lg"
                onPress={() => {
                  triggerHaptic("medium");
                  setShowAIAddModal(true);
                }}
                style={{ marginTop: 8 }}
              />

              <DuolingoButton
                title="ĐẶT LẠI TIẾN ĐỘ BỘ HỌC"
                variant="secondary"
                size="md"
                disabled={deckCards.length === 0}
                onPress={handleResetProgress}
                style={{ marginTop: 8 }}
              />
            </DuolingoCard>

            <SectionTitle>DANH SÁCH TỪ VỰNG ({deckCards.length})</SectionTitle>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="small" color={Colors.duolingo.blue} style={{ marginVertical: 30 }} />
          ) : (
            <DuolingoCard style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Chưa có từ vựng nào!</Text>
              <Text style={styles.emptySub}>Dùng chức năng "Thêm thẻ AI" để nạp từ vựng tự động.</Text>
            </DuolingoCard>
          )
        }
      />

      {/* Floating Action Button (FAB) to AI Add Cards */}
      <FloatingAddButton onPress={() => setShowAIAddModal(true)} bottomOffset={Math.max(insets.bottom + 20, 30)} />

      {/* AI Add Card Full Overlay Modal */}
      {showAIAddModal && (
        <AIAddCardModal
          visible={showAIAddModal}
          onClose={() => setShowAIAddModal(false)}
          initialDeckId={deck.id}
        />
      )}
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
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    marginHorizontal: Spacing.sm,
  },
  deleteDeckBtn: { padding: 4 },

  listContent: { paddingHorizontal: Spacing.pageMargin, paddingTop: Spacing.md },
  listHeader: { marginBottom: Spacing.xs },

  summaryCard: { padding: Spacing.lg, marginBottom: Spacing.lg },
  summaryTopRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: Spacing.xs },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.duolingo.blueDim,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryTextMain: { flex: 1 },
  summaryTitle: { fontSize: 22, fontWeight: "800", color: "#FFFFFF" },
  summarySub: { fontSize: 13, color: Colors.duolingo.textMuted, fontWeight: "600" },
  deckDescText: { fontSize: 14, color: Colors.duolingo.textMuted, marginTop: 4 },

  cardItem: { marginBottom: 10, padding: Spacing.md },
  cardItemRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardMainInfo: { flex: 1, paddingRight: 8 },
  charRow: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  cardCharacter: { fontSize: 24, fontWeight: "800", color: "#FFFFFF" },
  cardPinyin: { fontSize: 15, fontWeight: "700" },
  cardMeaning: { fontSize: 14, color: Colors.duolingo.textMuted, marginTop: 2 },
  speakSmallBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.duolingo.blueDim,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyCard: { alignItems: "center", justifyContent: "center", padding: Spacing.xl, marginTop: Spacing.md },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#FFFFFF" },
  emptySub: { fontSize: 13, color: Colors.duolingo.textMuted, marginTop: 4, textAlign: "center" },
});
