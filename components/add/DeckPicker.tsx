import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Typography, Radii, Spacing, Layout, BorderWidths } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import { Deck } from "../../store/slices/types";

interface DeckPickerProps {
  decks: Deck[];
  selectedDeckId: string;
  isOpen: boolean;
  onToggleOpen: () => void;
  onSelectDeck: (deckId: string) => void;
}

export const DeckPicker = React.memo(function DeckPicker({
  decks,
  selectedDeckId,
  isOpen,
  onToggleOpen,
  onSelectDeck,
}: DeckPickerProps) {
  const { theme } = useTheme();

  if (decks.length === 0) {
    return (
      <View style={[styles.warningBox, { backgroundColor: theme.cardBg }]}>
        <Text style={[styles.warningText, { color: theme.textMuted }]}>
          Chưa có bộ thẻ. Hãy tạo bộ thẻ trước trong tab "Từ vựng".
        </Text>
      </View>
    );
  }

  const currentDeck = decks.find((d) => d.id === selectedDeckId) || decks[0];

  return (
    <>
      {/* Trigger Card Component to Open Target Deck Picker */}
      <TouchableOpacity
        style={[styles.pickerTriggerCard, { backgroundColor: theme.bg, borderColor: theme.blue }]}
        onPress={onToggleOpen}
        activeOpacity={0.8}
      >
        <View style={styles.triggerLeftRow}>
          <View style={styles.triggerTextContainer}>
            <Text style={[styles.triggerDeckTitle, { color: theme.textPrimary }]} numberOfLines={1}>
              {currentDeck?.name || "Chọn bộ thẻ mục tiêu"}
            </Text>
            <Text style={[styles.triggerDeckSub, { color: theme.textMuted }]}>
              {currentDeck?.cardCount || 0} từ vựng trong bộ này
            </Text>
          </View>
        </View>

        <View style={[styles.triggerRightBadge, { backgroundColor: theme.blueDim }]}>
          <Text style={[styles.triggerChangeText, { color: theme.blue }]}>ĐỔI</Text>
        </View>
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        statusBarTranslucent
        animationType="slide"
        onRequestClose={onToggleOpen}
      >
        <TouchableWithoutFeedback onPress={onToggleOpen}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={[styles.sheetContainer, { backgroundColor: theme.bgSoft, borderTopColor: theme.cardBorder }]}>
                {/* SHEET HEADER */}
                <View style={[styles.sheetHeader, { borderBottomColor: theme.cardBorder }]}>
                  <View style={[styles.dragHandle, { backgroundColor: theme.cardBorder }]} />
                  <View style={styles.headerTitleRow}>
                    <Text style={[styles.sheetTitle, { color: theme.textPrimary }]}>CHỌN BỘ THẺ LƯU TỪ</Text>
                  </View>

                  <TouchableOpacity
                    onPress={onToggleOpen}
                    style={[styles.closeBtn, { backgroundColor: theme.cardBg }]}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="close" size={Layout.iconLg} color={theme.textMuted} />
                  </TouchableOpacity>
                </View>

                {/* DECK LIST */}
                <ScrollView
                  style={styles.sheetList}
                  contentContainerStyle={styles.sheetListContent}
                  showsVerticalScrollIndicator={false}
                >
                  {decks.map((deck) => {
                    const isSelected = selectedDeckId === deck.id;
                    return (
                      <TouchableOpacity
                        key={deck.id}
                        style={[
                          styles.deckCard3D,
                          {
                            backgroundColor: theme.cardBg,
                            borderBottomColor: theme.cardBottom,
                          },
                          isSelected && {
                            backgroundColor: theme.blueDim,
                            borderBottomColor: theme.blueDark,
                          },
                        ]}
                        onPress={() => onSelectDeck(deck.id)}
                        activeOpacity={0.85}
                      >
                        <View style={styles.deckCardLeft}>
                          <View style={styles.deckInfo}>
                            <Text
                              style={[
                                styles.deckNameText,
                                { color: theme.textPrimary },
                              ]}
                              numberOfLines={1}
                            >
                              {deck.name}
                            </Text>
                            <Text style={[styles.deckSubText, { color: theme.textMuted }]}>
                              {deck.cardCount || 0} từ vựng
                            </Text>
                          </View>
                        </View>

                        {isSelected ? (
                          <View style={[styles.selectedBadge, { backgroundColor: theme.blue }]}>
                            <Text style={styles.selectedBadgeText}>ĐÃ CHỌN</Text>
                          </View>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
});

const styles = StyleSheet.create({
  pickerTriggerCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: Radii.lg,
    padding: Spacing.cellPadding,
    borderWidth: BorderWidths.default,
  },
  triggerLeftRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.cellPadding,
    flex: 1,
  },
  triggerTextContainer: { flex: 1 },
  triggerDeckTitle: {
    fontSize: Typography.subhead.fontSize,
    fontWeight: Typography.weight.bold,
  },
  triggerDeckSub: {
    fontSize: Typography.caption2.fontSize,
    fontWeight: Typography.weight.semibold,
    marginTop: 1,
  },
  triggerRightBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.cellPadding,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.full,
  },
  triggerChangeText: {
    fontSize: Typography.caption2.fontSize,
    fontWeight: Typography.weight.bold,
  },

  warningBox: {
    borderRadius: Radii.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  warningText: {
    fontSize: Typography.caption.fontSize,
    fontWeight: Typography.weight.bold,
  },

  /* Modal Bottom Sheet Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(9, 14, 17, 0.75)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    maxHeight: "75%",
    paddingBottom: Spacing.xxl,
    borderTopWidth: BorderWidths.default,
  },
  sheetHeader: {
    alignItems: "center",
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.pageMargin,
    position: "relative",
    borderBottomWidth: BorderWidths.thin,
  },
  dragHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    marginBottom: Spacing.md,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  sheetTitle: {
    fontSize: Typography.caption.fontSize,
    fontWeight: Typography.weight.extraBold,
    letterSpacing: 0.8,
  },
  closeBtn: {
    position: "absolute",
    right: Spacing.pageMargin,
    top: Spacing.lg,
    width: Layout.avatarSm,
    height: Layout.avatarSm,
    borderRadius: Layout.avatarSm / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetList: {
    paddingHorizontal: Spacing.pageMargin,
  },
  sheetListContent: {
    paddingVertical: Spacing.md,
    gap: Spacing.cellPadding,
  },

  /* Linear Craft Deck Item Card */
  deckCard3D: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderWidth: BorderWidths.thin,
  },
  deckCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
  },
  deckInfo: {
    flex: 1,
  },
  deckNameText: {
    fontSize: Typography.bodyMD.fontSize,
    fontWeight: Typography.weight.extraBold,
  },
  deckSubText: {
    fontSize: Typography.caption1.fontSize,
    fontWeight: Typography.weight.bold,
    marginTop: 2,
  },

  selectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.cellPadding,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.full,
  },
  selectedBadgeText: {
    fontSize: Typography.caption2.fontSize,
    fontWeight: Typography.weight.extraBold,
    color: "#FFFFFF",
  },
});
