import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '../../constants/theme';
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
    <InsetGroup>
      <TouchableOpacity
        style={styles.pickerCell}
        onPress={onToggleOpen}
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
            name={isOpen ? 'chevron-up' : 'chevron-forward'}
            size={16}
            color={Colors.accent.gray3}
            style={{ marginLeft: 6 }}
          />
        </View>
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.pickerList}>
          {decks.map((deck, idx) => (
            <TouchableOpacity
              key={deck.id}
              style={[styles.pickerItem, idx > 0 && styles.cellBorderTop]}
              onPress={() => onSelectDeck(deck.id)}
            >
              <View style={styles.pickerSelectedRow}>
                <DeckIcon name={deck.icon} size={16} color={Colors.accent.indigoLight} style={{ marginRight: 6 }} />
                <Text style={styles.pickerItemText}>{deck.name}</Text>
              </View>
              {selectedDeckId === deck.id && (
                <Ionicons name="checkmark" size={18} color={Colors.accent.indigoLight} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </InsetGroup>
  );
}

const styles = StyleSheet.create({
  warningBox: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: 10,
    padding: Spacing.cellHorizontal,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border.default,
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
  pickerList: {
    borderTopWidth: 1,
    borderTopColor: Colors.border.separator,
    backgroundColor: Colors.bg.tertiary,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.cellHorizontal,
    paddingVertical: Spacing.cellVertical,
  },
  cellBorderTop: {
    borderTopWidth: 1,
    borderTopColor: Colors.border.separator,
  },
  pickerItemText: {
    fontSize: Typography.text.body.fontSize,
    color: Colors.text.primary,
  },
});
