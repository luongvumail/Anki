import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radii, triggerHaptic } from '../../constants/theme';
import { Deck } from '../../store/slices/types';
import { DeckIcon } from '../ui/DeckIcon';
import { InsetGroup } from '../ui/InsetGroup';

interface DeckPickerProps {
  decks: Deck[];
  selectedDeckId: string;
  isOpen: boolean;
  onToggleOpen: () => void;
  onSelectDeck: (deckId: string) => void;
}

export function DeckPicker({
  decks,
  selectedDeckId,
  isOpen,
  onToggleOpen,
  onSelectDeck,
}: DeckPickerProps) {
  const selectedDeck = decks.find(d => d.id === selectedDeckId);

  if (decks.length === 0) {
    return (
      <View style={styles.warningBox}>
        <Text style={styles.warningText}>
          Chưa có bộ thẻ. Hãy tạo bộ thẻ trước trong tab "Bộ thẻ".
        </Text>
      </View>
    );
  }

  return (
    <>
      <InsetGroup>
        <TouchableOpacity
          style={styles.pickerCell}
          onPress={() => {
            triggerHaptic('light');
            onToggleOpen();
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.cellLabel}>Bộ thẻ</Text>
          <View style={styles.pickerRight}>
            {selectedDeck ? (
              <View style={styles.pickerSelectedRow}>
                <DeckIcon name={selectedDeck.icon} size={16} color={Colors.accent.indigoLight} style={{ marginRight: 6 }} />
                <Text style={styles.pickerValue}>{selectedDeck.name}</Text>
              </View>
            ) : (
              <Text style={styles.pickerPlaceholder}>Chọn bộ thẻ...</Text>
            )}
            <Ionicons
              name="chevron-down"
              size={16}
              color={Colors.accent.gray3}
              style={{ marginLeft: 6 }}
            />
          </View>
        </TouchableOpacity>
      </InsetGroup>

      {/* Non-disruptive iOS Bottom Sheet Modal */}
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
                <View style={styles.sheetHeader}>
                  <View style={styles.dragHandle} />
                  <Text style={styles.sheetTitle}>Chọn bộ thẻ</Text>
                  <TouchableOpacity
                    onPress={() => {
                      triggerHaptic('light');
                      onToggleOpen();
                    }}
                    style={styles.closeBtn}
                  >
                    <Ionicons name="close" size={20} color={Colors.text.secondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.sheetList} showsVerticalScrollIndicator={false}>
                  {decks.map((deck, idx) => {
                    const isSelected = selectedDeckId === deck.id;
                    return (
                      <React.Fragment key={deck.id}>
                        {idx > 0 && <View style={styles.cellDivider} />}
                        <TouchableOpacity
                          style={[styles.sheetItem, isSelected && styles.sheetItemSelected]}
                          onPress={() => {
                            triggerHaptic('selection');
                            onSelectDeck(deck.id);
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={styles.pickerSelectedRow}>
                            <View style={styles.deckIconTile}>
                              <DeckIcon name={deck.icon} size={16} color={Colors.accent.indigoLight} />
                            </View>
                            <View>
                              <Text style={[styles.sheetItemText, isSelected && styles.sheetItemTextSelected]}>
                                {deck.name}
                              </Text>
                              <Text style={styles.sheetItemSub}>
                                {deck.cardCount || 0} từ vựng
                              </Text>
                            </View>
                          </View>
                          {isSelected && (
                            <Ionicons name="checkmark-circle" size={20} color={Colors.accent.indigoLight} />
                          )}
                        </TouchableOpacity>
                      </React.Fragment>
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
}

const styles = StyleSheet.create({
  warningBox: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radii.card,
    padding: Spacing.cellHorizontal,
    marginBottom: Spacing.lg,
  },
  warningText: {
    color: Colors.text.secondary,
    fontSize: Typography.text.footnote.fontSize,
  },
  pickerCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.cellHorizontal,
    paddingVertical: Spacing.cellVertical,
    minHeight: Spacing.cellMinHeight,
  },
  cellLabel: {
    fontSize: Typography.text.body.fontSize,
    color: Colors.text.primary,
    fontWeight: Typography.weight.medium,
  },
  pickerRight: { flexDirection: 'row', alignItems: 'center' },
  pickerSelectedRow: { flexDirection: 'row', alignItems: 'center' },
  pickerValue: {
    fontSize: Typography.text.body.fontSize,
    color: Colors.text.primary,
    fontWeight: Typography.weight.medium,
  },
  pickerPlaceholder: {
    fontSize: Typography.text.body.fontSize,
    color: Colors.text.secondary,
  },

  /* Modal Bottom Sheet Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.bg.overlay,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: Colors.bg.secondary,
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    maxHeight: '65%',
    paddingBottom: 30,
  },
  sheetHeader: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.pageMargin,
    position: 'relative',
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.bg.tertiary,
    marginBottom: 10,
  },
  sheetTitle: {
    fontSize: Typography.text.headline.fontSize,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
  },
  closeBtn: {
    position: 'absolute',
    right: Spacing.pageMargin,
    top: Spacing.sm + 8,
  },
  sheetList: {
    paddingHorizontal: Spacing.pageMargin,
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderRadius: Radii.card,
    paddingHorizontal: 8,
  },
  sheetItemSelected: {
    backgroundColor: Colors.bg.tertiary,
  },
  cellDivider: {
    height: 1,
    backgroundColor: Colors.border.separator,
    marginHorizontal: 8,
  },
  deckIconTile: {
    width: 32,
    height: 32,
    borderRadius: Radii.icon,
    backgroundColor: Colors.bg.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sheetItemText: {
    fontSize: Typography.text.body.fontSize,
    color: Colors.text.primary,
    fontWeight: Typography.weight.medium,
  },
  sheetItemTextSelected: {
    color: Colors.accent.indigoLight,
    fontWeight: Typography.weight.bold,
  },
  sheetItemSub: {
    fontSize: Typography.text.caption1.fontSize,
    color: Colors.text.secondary,
    marginTop: 2,
  },
});
