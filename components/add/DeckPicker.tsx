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
import { Colors, Radii, Spacing, triggerHaptic } from "../../constants/theme";
import { Deck } from "../../store/slices/types";
import { DeckIcon } from "../ui/DeckIcon";

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
  if (decks.length === 0) {
    return (
      <View style={styles.warningBox}>
        <Text style={styles.warningText}>
          Chưa có bộ thẻ. Hãy tạo bộ thẻ trước trong tab "Từ vựng".
        </Text>
      </View>
    );
  }

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={onToggleOpen}
    >
      <TouchableWithoutFeedback onPress={onToggleOpen}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetContainer}>
              {/* SHEET HEADER */}
              <View style={styles.sheetHeader}>
                <View style={styles.dragHandle} />
                <View style={styles.headerTitleRow}>
                  <Ionicons name="folder-open" size={20} color={Colors.duolingo.blue} />
                  <Text style={styles.sheetTitle}>CHỌN BỘ THẺ LƯU TỪ</Text>
                </View>

                <TouchableOpacity
                  onPress={() => {
                    triggerHaptic("light");
                    onToggleOpen();
                  }}
                  style={styles.closeBtn}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close" size={22} color={Colors.duolingo.textMuted} />
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
                        isSelected && styles.deckCard3DSelected,
                      ]}
                      onPress={() => {
                        triggerHaptic("selection");
                        onSelectDeck(deck.id);
                      }}
                      activeOpacity={0.85}
                    >
                      <View style={styles.deckCardLeft}>
                        <View style={styles.deckIconTile}>
                          <DeckIcon
                            name={deck.icon}
                            size={20}
                            color={isSelected ? Colors.duolingo.blue : Colors.duolingo.textMuted}
                          />
                        </View>
                        <View style={styles.deckInfo}>
                          <Text
                            style={[
                              styles.deckNameText,
                              isSelected && styles.deckNameTextSelected,
                            ]}
                            numberOfLines={1}
                          >
                            {deck.name}
                          </Text>
                          <Text style={styles.deckSubText}>
                            {deck.cardCount || 0} từ vựng
                          </Text>
                        </View>
                      </View>

                      {isSelected ? (
                        <View style={styles.selectedBadge}>
                          <Ionicons name="checkmark-circle" size={18} color={Colors.duolingo.blue} />
                          <Text style={styles.selectedBadgeText}>ĐÃ CHỌN</Text>
                        </View>
                      ) : (
                        <Ionicons name="chevron-forward" size={18} color={Colors.duolingo.textMuted} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
});

const styles = StyleSheet.create({
  warningBox: {
    backgroundColor: Colors.duolingo.cardBg,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  warningText: {
    color: Colors.duolingo.textMuted,
    fontSize: 13,
    fontWeight: "700",
  },

  /* Modal Bottom Sheet Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(9, 14, 17, 0.75)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: Colors.duolingo.bgSoftDark,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "75%",
    paddingBottom: 34,
    borderTopWidth: 2,
    borderTopColor: Colors.duolingo.cardBorder,
  },
  sheetHeader: {
    alignItems: "center",
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.pageMargin,
    position: "relative",
    borderBottomWidth: 2,
    borderBottomColor: Colors.duolingo.cardBorder,
  },
  dragHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.duolingo.cardBorder,
    marginBottom: 12,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sheetTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.duolingo.blue,
    letterSpacing: 0.8,
  },
  closeBtn: {
    position: "absolute",
    right: Spacing.pageMargin,
    top: Spacing.sm + 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.duolingo.cardBg,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetList: {
    paddingHorizontal: Spacing.pageMargin,
  },
  sheetListContent: {
    paddingVertical: Spacing.md,
    gap: 10,
  },

  /* 3D Tactile Deck Item Card */
  deckCard3D: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.duolingo.cardBg,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderBottomWidth: 4,
    borderBottomColor: Colors.duolingo.cardBottom,
  },
  deckCard3DSelected: {
    backgroundColor: Colors.duolingo.blueDim,
    borderBottomColor: Colors.duolingo.blueDark,
  },
  deckCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  deckIconTile: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.duolingo.bgSoftDark,
    alignItems: "center",
    justifyContent: "center",
  },
  deckInfo: {
    flex: 1,
  },
  deckNameText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  deckNameTextSelected: {
    color: Colors.duolingo.blue,
  },
  deckSubText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.duolingo.textMuted,
    marginTop: 2,
  },

  selectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.duolingo.bgSoftDark,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.full,
  },
  selectedBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.duolingo.blue,
  },
});
