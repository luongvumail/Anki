import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { CardData } from '../../lib/gemini';
import { Colors, Typography, Spacing, Radii } from '../../constants/theme';
import { SectionTitle } from '../ui/SectionTitle';

interface CardPreviewProps {
  cardData: CardData;
  saving: boolean;
  onReGenerate: () => void;
  onSave: () => void;
}

export function CardPreview({
  cardData,
  saving,
  onReGenerate,
  onSave,
}: CardPreviewProps) {
  return (
    <>
      <View style={styles.previewHeaderRow}>
        <SectionTitle style={{ marginBottom: 0, marginTop: 0, marginLeft: 0 }}>XEM TRƯỚC THẺ BÀI</SectionTitle>
        <TouchableOpacity onPress={onReGenerate}>
          <Text style={styles.reGenLink}>Tạo lại ↻</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.previewCard}>
        {/* Hanzi Header */}
        <View style={styles.previewTop}>
          {cardData.hskLevel ? (
            <View style={styles.hskBadge}>
              <Text style={styles.hskText}>HSK {cardData.hskLevel}</Text>
            </View>
          ) : null}
          <Text style={styles.characterBig}>{cardData.character}</Text>
          {cardData.traditional && cardData.traditional !== cardData.character && (
            <Text style={styles.traditional}>{cardData.traditional} (phồn thể)</Text>
          )}
        </View>

        {/* Data Rows */}
        <View style={styles.previewRows}>
          <InfoRow label="Pinyin" value={cardData.pinyin} color={Colors.accent.blue} />
          <InfoRow label="Hán Việt" value={cardData.hanviet} />
          <InfoRow label="Nghĩa TV" value={cardData.translation} />
          {cardData.radical ? <InfoRow label="Bộ thủ" value={cardData.radical} /> : null}
          {cardData.strokeCount ? <InfoRow label="Số nét" value={`${cardData.strokeCount} nét`} /> : null}
        </View>

        {/* Examples */}
        {cardData.examples && cardData.examples.length > 0 && (
          <View style={styles.exampleSection}>
            <Text style={styles.exampleHeaderTitle}>CÂU VÍ DỤ</Text>
            {cardData.examples.map((ex, i) => (
              <View key={i} style={styles.exampleItem}>
                <Text style={styles.exCn}>{ex.chinese}</Text>
                <Text style={styles.exPy}>{ex.pinyin}</Text>
                <Text style={styles.exVi}>{ex.vietnamese}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={onSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Lưu vào bộ thẻ</Text>
          )}
        </TouchableOpacity>
      </View>
    </>
  );
}

function InfoRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, color ? { color, fontWeight: Typography.weight.semibold } : null]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  previewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sectionTop,
    marginBottom: Spacing.sectionBottom,
    paddingHorizontal: 4,
  },
  reGenLink: {
    fontSize: Typography.text.footnote.fontSize,
    color: Colors.accent.blue,
  },
  previewCard: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radii.card,
    padding: Spacing.cellHorizontal,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  previewTop: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.separator,
    marginBottom: Spacing.md,
  },
  hskBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: Colors.accent.gray5,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  hskText: {
    fontSize: Typography.text.caption2.fontSize,
    color: Colors.text.secondary,
    fontWeight: Typography.weight.medium,
  },
  characterBig: {
    fontSize: Typography.hanzi.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  traditional: {
    fontSize: Typography.text.footnote.fontSize,
    color: Colors.text.secondary,
    marginTop: 4,
  },
  previewRows: {
    gap: 8,
    marginBottom: Spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoLabel: {
    width: 80,
    fontSize: Typography.text.subhead.fontSize,
    color: Colors.text.secondary,
  },
  infoValue: {
    flex: 1,
    fontSize: Typography.text.subhead.fontSize,
    color: Colors.text.primary,
  },
  exampleSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.border.separator,
    paddingTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  exampleHeaderTitle: {
    fontSize: Typography.text.caption1.fontSize,
    color: Colors.text.secondary,
    fontWeight: Typography.weight.semibold,
    marginBottom: Spacing.xs,
  },
  exampleItem: {
    backgroundColor: Colors.bg.tertiary,
    borderRadius: 10,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
  },
  exCn: {
    fontSize: Typography.text.body.fontSize,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
  },
  exPy: {
    fontSize: Typography.text.footnote.fontSize,
    color: Colors.accent.blue,
    marginTop: 2,
  },
  exVi: {
    fontSize: Typography.text.footnote.fontSize,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  saveBtn: {
    backgroundColor: Colors.accent.blue,
    borderRadius: Radii.card,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: Typography.text.body.fontSize,
    fontWeight: Typography.weight.semibold,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
});
