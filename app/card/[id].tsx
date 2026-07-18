import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { useStore } from '../../store/useStore';
import { isDue } from '../../lib/srs';
import { Colors, Typography, Spacing, Radii, triggerHaptic } from '../../constants/theme';

export default function CardDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id, deckId } = useLocalSearchParams<{ id: string; deckId: string }>();
  const { cards } = useStore();
  const [speaking, setSpeaking] = useState(false);

  const deckCards = cards[deckId] || [];
  const card = deckCards.find(c => c.id === id);

  const speak = () => {
    if (!card) return;
    triggerHaptic('selection');
    setSpeaking(true);
    Speech.speak(card.character, {
      language: 'zh-CN', rate: 0.8,
      onDone: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  };

  if (!card) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.accent.gray} size="small" />
      </View>
    );
  }

  const due = isDue(card.srs);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: Math.max(insets.top + 10, 48), paddingBottom: Math.max(insets.bottom + 20, 40) },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Back button */}
      <TouchableOpacity
        onPress={() => {
          triggerHaptic('light');
          router.back();
        }}
        style={styles.backBtn}
      >
        <Ionicons name="chevron-back" size={24} color={Colors.accent.blue} />
        <Text style={styles.backText}>Quay lại</Text>
      </TouchableOpacity>

      {/* Card Header */}
      <View style={styles.cardHeader}>
        <Text style={styles.characterBig}>{card.character}</Text>
        {card.traditional && card.traditional !== card.character && (
          <Text style={styles.traditional}>{card.traditional} (phồn thể)</Text>
        )}
        <TouchableOpacity style={styles.speakBtn} onPress={speak} activeOpacity={0.8}>
          <Ionicons name={speaking ? "volume-high" : "volume-medium"} size={18} color={Colors.accent.blue} />
          <Text style={styles.speakText}>{speaking ? 'Đang phát âm...' : 'Phát âm'}</Text>
        </TouchableOpacity>
      </View>

      {/* Info Group */}
      <Text style={styles.sectionHeaderTitle}>THÔNG TIN HÁN TỰ</Text>
      <View style={styles.insetGroup}>
        <InfoRow label="Pinyin" value={card.pinyin} valueColor={Colors.accent.blue} />
        <InfoRow label="Hán Việt" value={card.hanviet} isBorder />
        <InfoRow label="Nghĩa TV" value={card.translation} isBorder />
        {card.radical ? <InfoRow label="Bộ thủ" value={card.radical} isBorder /> : null}
        {card.strokeCount ? <InfoRow label="Số nét" value={`${card.strokeCount} nét`} isBorder /> : null}
        {card.hskLevel ? <InfoRow label="Cấp HSK" value={`HSK ${card.hskLevel}`} isBorder /> : null}
        {card.tags && card.tags.length > 0 && (
          <InfoRow label="Phân loại" value={card.tags.join(', ')} isBorder />
        )}
      </View>

      {/* SRS Memory Group */}
      <Text style={styles.sectionHeaderTitle}>TRẠNG THÁI TRÍ NHỚ (ANKI)</Text>
      <View style={styles.insetGroup}>
        <InfoRow label="Lần ôn" value={`${card.srs.repetitions} lần`} />
        <InfoRow label="Khoảng cách" value={`${card.srs.interval} ngày`} isBorder />
        <InfoRow label="Hệ số Ease" value={`${card.srs.easeFactor}`} isBorder />
        <InfoRow
          label="Trạng thái"
          value={due ? 'Cần ôn ngay' : 'Đã thuộc'}
          isBorder
        />
        <InfoRow
          label="Lần ôn tiếp"
          value={new Date(card.srs.dueDate).toLocaleDateString('vi-VN')}
          isBorder
        />
      </View>

      {/* Examples Group */}
      {card.examples && card.examples.length > 0 && (
        <>
          <Text style={styles.sectionHeaderTitle}>CÂU VÍ DỤ NGUYÊN CẢNH</Text>
          <View style={styles.examplesInsetGroup}>
            {card.examples.map((ex, i) => (
              <View key={i} style={[styles.exampleItem, i > 0 && styles.cellBorderTop]}>
                <Text style={styles.exCn}>{ex.chinese}</Text>
                <Text style={styles.exPy}>{ex.pinyin}</Text>
                <Text style={styles.exVi}>{ex.vietnamese}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

function InfoRow({ label, value, valueColor, isBorder }: { label: string; value: string; valueColor?: string; isBorder?: boolean }) {
  return (
    <View style={[styles.infoRow, isBorder && styles.cellBorderTop]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueColor ? { color: valueColor, fontWeight: Typography.weight.semibold } : {}]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  content: { paddingHorizontal: Spacing.pageMargin },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg.primary },

  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: Spacing.md },
  backText: { color: Colors.accent.blue, fontSize: Typography.text.body.fontSize, fontWeight: Typography.weight.medium },

  cardHeader: { alignItems: 'center', marginBottom: Spacing.xl },
  characterBig: {
    fontSize: Typography.hanzi.xl,
    color: Colors.text.primary,
    fontWeight: Typography.weight.bold,
  },
  traditional: { fontSize: Typography.text.body.fontSize, color: Colors.text.secondary, marginTop: 4 },
  speakBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.lg,
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radii.full,
    height: 38,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'center',
  },
  speakText: {
    color: Colors.accent.blue,
    fontSize: Typography.text.footnote.fontSize,
    fontWeight: Typography.weight.semibold,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },

  sectionHeaderTitle: {
    fontSize: Typography.text.caption1.fontSize,
    color: Colors.text.secondary,
    fontWeight: Typography.weight.semibold,
    letterSpacing: -0.08,
    marginBottom: Spacing.sectionBottom,
    marginTop: Spacing.sectionTop,
    marginLeft: 4,
  },

  insetGroup: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radii.card,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.cellHorizontal,
    paddingVertical: Spacing.cellVertical,
    minHeight: Spacing.cellMinHeight,
  },
  cellBorderTop: {
    borderTopWidth: 0.5,
    borderTopColor: Colors.border.separator,
  },
  infoLabel: { width: 100, fontSize: Typography.text.body.fontSize, color: Colors.text.secondary },
  infoValue: { flex: 1, fontSize: Typography.text.body.fontSize, color: Colors.text.primary },

  examplesInsetGroup: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radii.card,
    overflow: 'hidden',
  },
  exampleItem: {
    padding: Spacing.cellHorizontal,
  },
  exCn: { fontSize: Typography.text.body.fontSize, color: Colors.text.primary, fontWeight: Typography.weight.semibold },
  exPy: { fontSize: Typography.text.footnote.fontSize, color: Colors.accent.blue, marginTop: 2 },
  exVi: { fontSize: Typography.text.footnote.fontSize, color: Colors.text.secondary, marginTop: 2 },
});
