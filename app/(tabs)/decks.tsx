import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useStore } from "../../store/useStore";
import { getFirestoreErrorMessage } from "../../lib/errorHandler";
import { Colors, Spacing, VECTOR_DECK_ICONS, triggerHaptic } from "../../constants/theme";
import { DeckIcon } from "../../components/ui/DeckIcon";
import { SectionTitle } from "../../components/ui/SectionTitle";
import { FormField } from "../../components/ui/FormField";
import { DuolingoCard } from "../../components/ui/DuolingoCard";
import { DuolingoButton } from "../../components/ui/DuolingoButton";
import { DuolingoHeader } from "../../components/ui/DuolingoHeader";
import { ProgressBar } from "../../components/ui/ProgressBar";

import { FloatingAddButton } from "../../components/ui/FloatingAddButton";
import { AIAddCardModal } from "../../components/add/AIAddCardModal";

import {
  computeDueCount,
  computeNewCount,
  computeReviewDueCount,
  getDeckMasteryPct,
} from "../../lib/deckUtils";

export default function DecksScreen() {
  const insets = useSafeAreaInsets();
  const decks = useStore((s) => s.decks);
  const cardsState = useStore((s) => s.cards);
  const fetchDecks = useStore((s) => s.fetchDecks);
  const createDeck = useStore((s) => s.createDeck);
  const deleteDeck = useStore((s) => s.deleteDeck);
  const isLoading = useStore((s) => s.isLoading);
  const userId = useStore((s) => s.userId);

  const [showCreate, setShowCreate] = useState(false);
  const [showAIAddModal, setShowAIAddModal] = useState(false);
  const [deckName, setDeckName] = useState("");
  const [deckDesc, setDeckDesc] = useState("");
  const [selectedIcon, setSelectedIcon] = useState(VECTOR_DECK_ICONS[0]);
  const [creating, setCreating] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  const deckItemsStats = useMemo(() => {
    return decks.map((deck) => {
      const deckCards = cardsState[deck.id];
      const total = deckCards ? deckCards.length : deck.cardCount || 0;
      const due = deckCards ? computeDueCount(deckCards) : deck.dueCount || 0;
      const newCount = deckCards ? computeNewCount(deckCards) : deck.newCount || 0;
      const reviewCount = deckCards
        ? computeReviewDueCount(deckCards)
        : Math.max(0, due - newCount);
      const masteryPct = getDeckMasteryPct(total, due, deckCards);
      return { deck, total, due, newCount, reviewCount, masteryPct };
    });
  }, [decks, cardsState]);

  useEffect(() => {
    if (userId && decks.length === 0) fetchDecks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const onRefresh = async () => {
    triggerHaptic("light");
    setRefreshing(true);
    await fetchDecks();
    setRefreshing(false);
  };

  const handleCreate = async () => {
    if (!deckName.trim()) {
      triggerHaptic("warning");
      Alert.alert("Thông báo", "Vui lòng nhập tên bộ thẻ");
      return;
    }
    setCreating(true);
    triggerHaptic("medium");
    try {
      await createDeck({ name: deckName.trim(), description: deckDesc.trim(), color: Colors.duolingo.blue, icon: selectedIcon });
      triggerHaptic("success");
      setDeckName("");
      setDeckDesc("");
      setShowCreate(false);
    } catch (e: any) {
      triggerHaptic("error");
      Alert.alert("Tạo bộ thẻ thất bại", getFirestoreErrorMessage(e));
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = (deckId: string, name: string) => {
    triggerHaptic("warning");
    Alert.alert(
      "Xóa bộ thẻ",
      `Bạn có chắc chắn muốn xóa bộ thẻ "${name}" cùng toàn bộ thẻ từ vựng bên trong không?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa bộ thẻ",
          style: "destructive",
          onPress: async () => {
            triggerHaptic("heavy");
            try {
              await deleteDeck(deckId);
              triggerHaptic("success");
            } catch (e: any) {
              triggerHaptic("error");
              Alert.alert("Xóa thất bại", getFirestoreErrorMessage(e));
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <DuolingoHeader courseName="Anki" streakCount={1} gemsCount={150} heartsCount={5} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 90, 110) },
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.duolingo.blue} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Create Deck Banner Button */}
        <DuolingoCard style={styles.createCardBanner}>
          <View style={styles.bannerRow}>
            <View style={styles.bannerIconBox}>
              <Ionicons name="add-circle" size={32} color={Colors.duolingo.blue} />
            </View>
            <View style={styles.bannerText}>
              <Text style={styles.bannerTitle}>Tạo Bộ Thẻ Từ Vựng Mới</Text>
              <Text style={styles.bannerSub}>Tự do phân loại từ vựng theo chủ đề HSK hoặc sở thích</Text>
            </View>
          </View>
          <DuolingoButton
            title="➕ TẠO BỘ THẺ MỚI"
            variant="primary"
            size="lg"
            onPress={() => {
              triggerHaptic("light");
              setShowCreate(true);
            }}
            style={{ marginTop: Spacing.sm }}
          />
        </DuolingoCard>

        <SectionTitle>DANH SÁCH BỘ THẺ</SectionTitle>

        {isLoading && decks.length === 0 ? (
          <ActivityIndicator size="small" color={Colors.duolingo.blue} style={{ marginVertical: 30 }} />
        ) : decks.length === 0 ? (
          <DuolingoCard style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Chưa có bộ thẻ nào!</Text>
            <Text style={styles.emptySub}>Bấm nút "Tạo bộ thẻ mới" ở trên để bắt đầu nạp từ vựng.</Text>
          </DuolingoCard>
        ) : (
          <View style={styles.deckGrid}>
            {deckItemsStats.map(({ deck, total, due, newCount, reviewCount, masteryPct }) => (
              <DuolingoCard
                key={deck.id}
                style={styles.deckCardItem}
                onPress={() => {
                  triggerHaptic("light");
                  router.push(`/deck/${deck.id}`);
                }}
              >
                <View style={styles.deckCardTop}>
                  <View style={styles.deckIconBox}>
                    <DeckIcon name={deck.icon} size={24} color={Colors.duolingo.blue} />
                  </View>

                  <View style={styles.deckCardMain}>
                    <Text style={styles.deckTitle} numberOfLines={1}>{deck.name}</Text>
                    <Text style={styles.deckSubInfo}>
                      {total} từ {due > 0 ? `• ${due} thẻ cần ôn` : ""}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleDelete(deck.id, deck.name)}
                    style={styles.deleteBtn}
                  >
                    <Ionicons name="trash-outline" size={18} color={Colors.duolingo.red} />
                  </TouchableOpacity>
                </View>

                {deck.description ? (
                  <Text style={styles.deckDesc} numberOfLines={1}>{deck.description}</Text>
                ) : null}

                <ProgressBar
                  progress={masteryPct / 100}
                  height={10}
                  fillColor={Colors.duolingo.green}
                  style={{ marginTop: Spacing.xs }}
                />

                <DuolingoButton
                  title={due > 0 ? `ÔN NGAY (${due} THẺ)` : "XEM CHI TIẾT ➜"}
                  variant={due > 0 ? "primary" : "secondary"}
                  size="lg"
                  onPress={() => {
                    triggerHaptic("medium");
                    if (due > 0) {
                      router.push(`/study/${deck.id}`);
                    } else {
                      router.push(`/deck/${deck.id}`);
                    }
                  }}
                  style={{ marginTop: Spacing.sm }}
                />
              </DuolingoCard>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal Create Deck */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCreate(false)}>
        <View style={styles.modalContainer}>
          <View style={[styles.modalHeader, { paddingTop: Math.max(insets.top + 8, 20) }]}>
            <Text style={styles.modalTitle}>TẠO BỘ THẺ MỚI</Text>
            <TouchableOpacity onPress={() => setShowCreate(false)}>
              <Ionicons name="close-circle" size={28} color={Colors.duolingo.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalScroll}>
            <DuolingoCard style={{ marginBottom: Spacing.md }}>
              <FormField
                label="Tên bộ thẻ"
                value={deckName}
                onChangeText={setDeckName}
                placeholder="Ví dụ: Từ vựng HSK 1, Giao tiếp..."
              />
              <View style={{ height: 12 }} />
              <FormField
                label="Mô tả bộ thẻ"
                value={deckDesc}
                onChangeText={setDeckDesc}
                placeholder="Ví dụ: 150 từ vựng căn bản..."
              />
            </DuolingoCard>

            <SectionTitle>CHỌN BIỂU TƯỢNG BỘ THẺ</SectionTitle>
            <View style={styles.iconGrid}>
              {VECTOR_DECK_ICONS.map((iconName) => {
                const isSelected = selectedIcon === iconName;
                return (
                  <TouchableOpacity
                    key={iconName}
                    style={[styles.iconPickerItem, isSelected && styles.iconPickerSelected]}
                    onPress={() => {
                      triggerHaptic("selection");
                      setSelectedIcon(iconName);
                    }}
                  >
                    <DeckIcon name={iconName} size={24} color={isSelected ? Colors.duolingo.blue : Colors.duolingo.textMuted} />
                  </TouchableOpacity>
                );
              })}
            </View>

            <DuolingoButton
              title={creating ? "ĐANG TẠO..." : "TẠO BỘ THẺ ➜"}
              variant="primary"
              size="lg"
              disabled={creating || !deckName.trim()}
              onPress={handleCreate}
              style={{ marginTop: Spacing.lg }}
            />
          </ScrollView>
        </View>
      </Modal>

      {/* Floating Action Button (FAB) to AI Add Cards */}
      <FloatingAddButton onPress={() => setShowAIAddModal(true)} />

      {/* AI Add Card Full Overlay Modal */}
      {showAIAddModal && (
        <AIAddCardModal
          visible={showAIAddModal}
          onClose={() => setShowAIAddModal(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.duolingo.bg },
  scrollContent: { paddingHorizontal: Spacing.pageMargin, paddingTop: Spacing.md },

  createCardBanner: { padding: Spacing.md, marginBottom: Spacing.md },
  bannerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  bannerIconBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.duolingo.blueDim, alignItems: "center", justifyContent: "center" },
  bannerText: { flex: 1 },
  bannerTitle: { fontSize: 16, fontWeight: "800", color: "#FFFFFF" },
  bannerSub: { fontSize: 12, color: Colors.duolingo.textMuted, marginTop: 2 },

  emptyCard: { alignItems: "center", justifyContent: "center", padding: Spacing.xl, marginTop: Spacing.md },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#FFFFFF" },
  emptySub: { fontSize: 13, color: Colors.duolingo.textMuted, marginTop: 4, textAlign: "center" },

  deckGrid: { gap: 12 },
  deckCardItem: { padding: Spacing.md },
  deckCardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  deckIconBox: { width: 42, height: 42, borderRadius: 12, backgroundColor: Colors.duolingo.blueDim, alignItems: "center", justifyContent: "center" },
  deckCardMain: { flex: 1 },
  deckTitle: { fontSize: 18, fontWeight: "800", color: "#FFFFFF" },
  deckSubInfo: { fontSize: 12, color: Colors.duolingo.textMuted, marginTop: 2, fontWeight: "600" },
  deleteBtn: { padding: 4 },
  deckDesc: { fontSize: 13, color: Colors.duolingo.textMuted, marginTop: 6 },

  modalContainer: { flex: 1, backgroundColor: Colors.duolingo.bg },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: Spacing.pageMargin, paddingBottom: Spacing.md, borderBottomWidth: 2, borderBottomColor: Colors.duolingo.cardBorder },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#FFFFFF" },
  modalScroll: { paddingHorizontal: Spacing.pageMargin, paddingTop: Spacing.md, paddingBottom: 40 },

  iconGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: Spacing.md },
  iconPickerItem: { width: 52, height: 52, borderRadius: 14, backgroundColor: Colors.duolingo.bgSoftDark, alignItems: "center", justifyContent: "center", borderBottomWidth: 3, borderBottomColor: "#18242B" },
  iconPickerSelected: { backgroundColor: Colors.duolingo.blueDim, borderBottomColor: Colors.duolingo.blueDark },
});
