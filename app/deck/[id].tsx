import React, { useCallback } from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Card } from "../../store/useStore";
import { Spacing, Radii, Typography, Layout, BorderWidths } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import { SectionTitle } from "../../components/ui/SectionTitle";
import { AppCard } from "../../components/ui/AppCard";
import { AppButton } from "../../components/ui/AppButton";
import { AudioButton } from "../../components/ui/AudioButton";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { FloatingAddButton } from "../../components/ui/FloatingAddButton";
import { AIAddCardModal } from "../../components/add/AIAddCardModal";
import { LoadingIndicator } from "../../components/ui/LoadingIndicator";
import { useDeckDetail } from "../../hooks/useDeckDetail";

export default function DeckDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();

  const {
    deck,
    deckCards,
    filteredCards,
    dueCount,
    weakCards,
    masteryPct,
    isLoading,
    showAIAddModal,
    setShowAIAddModal,
    searchQuery,
    setSearchQuery,
    handleDeleteDeck,
    handleResetProgress,
    speak,
  } = useDeckDetail(id);

  const renderCardItem = useCallback(
    ({ item }: { item: Card }) => {
      return (
        <AppCard
          style={styles.cardItem}
          onPress={() => {
            router.push(`/card/${item.id}?deckId=${id}`);
          }}
        >
          <View style={styles.cardItemRow}>
            <View style={styles.cardMainInfo}>
              <View style={styles.charRow}>
                <Text style={[styles.cardCharacter, { color: theme.textPrimary }]}>
                  {item.character}
                </Text>
                <Text style={[styles.cardPinyin, { color: theme.blue }]}>{item.pinyin}</Text>
              </View>
              <Text style={[styles.cardMeaning, { color: theme.textMuted }]} numberOfLines={1}>
                {item.translation}
              </Text>

              {item.radical ? (
                <View style={styles.cardRadicalTag}>
                  <Ionicons name="layers-outline" size={Layout.iconSm} color={theme.purple} />
                  <Text style={[styles.cardRadicalText, { color: theme.purple }]} numberOfLines={1}>
                    {item.radical}
                  </Text>
                </View>
              ) : null}
            </View>

            <AudioButton onPress={() => speak(item.character)} size="sm" />
          </View>
        </AppCard>
      );
    },
    [id, speak, theme],
  );

  if (!deck) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <View
          style={[
            styles.headerBar,
            {
              paddingTop: Math.max(insets.top + Spacing.sm, Spacing.cellMinHeight),
              backgroundColor: theme.bg,
              borderBottomColor: theme.cardBorder,
            },
          ]}
        >
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={Layout.iconLg} color={theme.textPrimary} />
          </TouchableOpacity>
        </View>
        <LoadingIndicator message="Đang nạp chi tiết bộ thẻ..." />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Top Header Bar */}
      <View
        style={[
          styles.headerBar,
          {
            paddingTop: Math.max(insets.top + Spacing.sm, Spacing.cellMinHeight),
            backgroundColor: theme.bg,
            borderBottomColor: theme.cardBorder,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            router.back();
          }}
        >
          <Ionicons name="chevron-back" size={Layout.iconLg} color={theme.textPrimary} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: theme.textPrimary }]} numberOfLines={1}>
          {deck.name}
        </Text>

        <TouchableOpacity style={styles.deleteDeckBtn} onPress={handleDeleteDeck}>
          <Ionicons name="trash-outline" size={Layout.iconMd} color={theme.red} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredCards}
        keyExtractor={(item) => item.id}
        renderItem={renderCardItem}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 80, 100) },
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Hero Progress Banner */}
            <AppCard style={styles.heroBannerCard}>
              <View style={styles.heroHeaderRow}>
                <View style={styles.heroTitleCol}>
                  <Text style={[styles.deckTitleText, { color: theme.textPrimary }]}>
                    {deck.name}
                  </Text>
                  {deck.description ? (
                    <Text style={[styles.deckDescText, { color: theme.textMuted }]}>
                      {deck.description}
                    </Text>
                  ) : null}
                </View>
                <View style={[styles.masteryBadge, { backgroundColor: theme.greenDim }]}>
                  <Text style={[styles.masteryText, { color: theme.green }]}>
                    {masteryPct}% Thuộc
                  </Text>
                </View>
              </View>

              <ProgressBar
                progress={masteryPct / 100}
                height={Spacing.sm}
                fillColor={theme.green}
                style={{ marginVertical: Spacing.md }}
              />

              <View style={styles.statsRow}>
                <View style={styles.statColItem}>
                  <Text style={[styles.statNumVal, { color: theme.textPrimary }]}>
                    {deckCards.length > 0 ? deckCards.length : deck.cardCount || 0}
                  </Text>
                  <Text style={[styles.statLabelText, { color: theme.textMuted }]}>Tổng số từ</Text>
                </View>
                <View style={[styles.statColDivider, { backgroundColor: theme.cardBorder }]} />
                <View style={styles.statColItem}>
                  <Text style={[styles.statNumVal, { color: theme.yellow }]}>{dueCount}</Text>
                  <Text style={[styles.statLabelText, { color: theme.textMuted }]}>Cần ôn tập</Text>
                </View>
                <View style={[styles.statColDivider, { backgroundColor: theme.cardBorder }]} />
                <View style={styles.statColItem}>
                  <Text style={[styles.statNumVal, { color: theme.red }]}>{weakCards.length}</Text>
                  <Text style={[styles.statLabelText, { color: theme.textMuted }]}>Cực yếu</Text>
                </View>
              </View>
            </AppCard>

            {/* Action Buttons Row */}
            <View style={styles.heroActionRow}>
              <AppButton
                title={dueCount > 0 ? `ÔN TẬP (${dueCount})` : "HỌC BÀI NGAY"}
                variant="primary"
                size="lg"
                onPress={() => router.push(`/study/${id}`)}
                style={{ flex: 1 }}
                icon={<Ionicons name="play" size={Layout.iconMd} color="#FFFFFF" />}
              />

              {deckCards.length > 0 && (
                <TouchableOpacity
                  style={[
                    styles.resetBtn,
                    { backgroundColor: theme.cardBg, borderColor: theme.cardBorder },
                  ]}
                  onPress={handleResetProgress}
                >
                  <Ionicons name="refresh" size={Layout.iconMd} color={theme.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Weak Cards Banner Warning */}
            {weakCards.length > 0 && (
              <AppCard
                style={StyleSheet.flatten([
                  styles.weakWarningCard,
                  { backgroundColor: theme.redDim, borderColor: theme.red },
                ])}
              >
                <View style={styles.weakWarningHeader}>
                  <Ionicons name="alert-circle" size={Layout.iconMd} color={theme.red} />
                  <Text style={[styles.weakWarningTitle, { color: theme.red }]}>
                    CẢNH BÁO: CÓ {weakCards.length} TỪ VỰNG CỰC YẾU!
                  </Text>
                </View>
                <Text style={[styles.weakWarningSub, { color: theme.textPrimary }]}>
                  Thuật toán FSRS ghi nhận các từ vựng này có thời gian suy nghĩ &gt;4 giây hoặc bị
                  trả lời sai nhiều lần. Hãy bấm "ÔN TẬP" để luyện lại ngay!
                </Text>
              </AppCard>
            )}

            {/* Vocab List Section Title & Search Input */}
            <SectionTitle>
              DANH SÁCH TỪ VỰNG ({filteredCards.length}/{deckCards.length})
            </SectionTitle>

            <View
              style={[
                styles.searchBarBox,
                { backgroundColor: theme.bgSoft, borderColor: theme.cardBorder },
              ]}
            >
              <Ionicons
                name="search"
                size={Layout.iconMd}
                color={theme.textMuted}
                style={{ marginRight: Spacing.xs }}
              />
              <TextInput
                style={[styles.searchInput, { color: theme.textPrimary }]}
                placeholder="Tìm kiếm theo Chữ Hán, Pinyin hoặc Nghĩa..."
                placeholderTextColor={theme.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.clearSearchBtn}>
                  <Ionicons name="close-circle" size={Layout.iconMd} color={theme.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>
          </>
        }
        ListEmptyComponent={
          isLoading ? (
            <LoadingIndicator message="Đang nạp từ vựng..." />
          ) : deckCards.length === 0 ? (
            <AppCard style={styles.emptyCard}>
              <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
                Bộ thẻ chưa có từ vựng nào
              </Text>
              <Text style={[styles.emptySub, { color: theme.textMuted }]}>
                Bấm nút "+" màu xanh phía góc dưới để nạp từ vựng bằng AI tự động!
              </Text>
            </AppCard>
          ) : (
            <AppCard style={styles.emptyCard}>
              <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
                Không tìm thấy từ vựng
              </Text>
              <Text style={[styles.emptySub, { color: theme.textMuted }]}>
                Không có từ nào khớp với từ khóa "{searchQuery}"
              </Text>
              <TouchableOpacity
                style={[styles.resetSearchBtn, { backgroundColor: theme.blueDim }]}
                onPress={() => setSearchQuery("")}
              >
                <Text style={[styles.resetSearchText, { color: theme.blue }]}>
                  Xóa bộ lọc tìm kiếm
                </Text>
              </TouchableOpacity>
            </AppCard>
          )
        }
      />

      {/* Floating Action Button (FAB) */}
      <FloatingAddButton onPress={() => setShowAIAddModal(true)} />

      {/* AI Add Card Modal */}
      {showAIAddModal && (
        <AIAddCardModal
          visible={showAIAddModal}
          onClose={() => setShowAIAddModal(false)}
          initialDeckId={id}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.pageMargin,
    paddingBottom: Spacing.md,
    borderBottomWidth: BorderWidths.thin,
  },
  backBtn: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: Typography.callout.fontSize,
    fontWeight: Typography.weight.extraBold,
    flex: 1,
    textAlign: "center",
    marginHorizontal: Spacing.sm,
  },
  deleteDeckBtn: {
    padding: Spacing.xs,
  },
  scrollContent: {
    paddingHorizontal: Spacing.pageMargin,
    paddingTop: Spacing.md,
  },
  heroBannerCard: {
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  heroHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroTitleCol: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  deckTitleText: {
    fontSize: Typography.titleMD.fontSize,
    fontWeight: Typography.weight.extraBold,
  },
  deckDescText: {
    fontSize: Typography.caption.fontSize,
    marginTop: 2,
    fontWeight: Typography.weight.medium,
  },
  masteryBadge: {
    paddingHorizontal: Spacing.cellPadding,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.full,
  },
  masteryText: {
    fontSize: Typography.caption1.fontSize,
    fontWeight: Typography.weight.extraBold,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  statColItem: {
    alignItems: "center",
    flex: 1,
  },
  statNumVal: {
    fontSize: Typography.titleMD.fontSize,
    fontWeight: Typography.weight.extraBold,
  },
  statLabelText: {
    fontSize: Typography.caption1.fontSize,
    marginTop: 2,
    fontWeight: Typography.weight.semibold,
  },
  statColDivider: {
    width: BorderWidths.thin,
    height: Layout.avatarSm,
  },
  heroActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.cellPadding,
    marginBottom: Spacing.md,
  },
  resetBtn: {
    width: Layout.btnHeightXl,
    height: Layout.btnHeightXl,
    borderRadius: Radii.lg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: BorderWidths.default,
  },
  weakWarningCard: {
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  weakWarningHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  weakWarningTitle: {
    fontSize: Typography.caption.fontSize,
    fontWeight: Typography.weight.extraBold,
  },
  weakWarningSub: {
    fontSize: Typography.caption1.fontSize,
    marginTop: Spacing.xs,
    lineHeight: 16,
  },
  searchBarBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: BorderWidths.default,
    borderRadius: Radii.lg,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    height: Layout.btnHeightLg,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.caption1.fontSize,
    fontWeight: Typography.weight.semibold,
  },
  clearSearchBtn: {
    padding: Spacing.xs,
  },
  cardItem: {
    padding: Spacing.md,
    marginBottom: Spacing.cellPadding,
  },
  cardItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardMainInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  charRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: Spacing.sm,
  },
  cardCharacter: {
    fontSize: Typography.titleMD.fontSize,
    fontWeight: Typography.weight.extraBold,
  },
  cardPinyin: {
    fontSize: Typography.caption1.fontSize,
    fontWeight: Typography.weight.bold,
  },
  cardMeaning: {
    fontSize: Typography.caption.fontSize,
    marginTop: 2,
    fontWeight: Typography.weight.medium,
  },
  cardRadicalTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  cardRadicalText: {
    fontSize: Typography.caption2.fontSize,
    fontWeight: Typography.weight.semibold,
  },
  emptyCard: {
    padding: Spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.md,
  },
  emptyTitle: {
    fontSize: Typography.callout.fontSize,
    fontWeight: Typography.weight.extraBold,
  },
  emptySub: {
    fontSize: Typography.caption.fontSize,
    textAlign: "center",
    marginTop: Spacing.xs,
  },
  resetSearchBtn: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
  },
  resetSearchText: {
    fontSize: Typography.caption1.fontSize,
    fontWeight: Typography.weight.bold,
  },
});
