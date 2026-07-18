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
import { SectionTitle } from '../../components/ui/SectionTitle';
import { InsetGroup } from '../../components/ui/InsetGroup';
import { InsetRow } from '../../components/ui/InsetRow';

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
        <ActivityIndicator color={Colors.accent.indigoLight} size="small" />
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
        <Ionicons name="chevron-back" size={24} color={Colors.accent.indigoLight} />
        <Text style={styles.backText}>Quay lại</Text>
      </TouchableOpacity>

      {/* Card Header */}
      <View style={styles.cardHeader}>
        <Text style={styles.characterBig}>{card.character}</Text>
        {card.traditional && card.traditional !== card.character && (
          <Text style={styles.traditional}>{card.traditional} (phồn thể)</Text>
        )}
        <TouchableOpacity style={styles.speakBtn} onPress={speak} activeOpacity={0.8}>
          <Ionicons name={speaking ? "volume-high" : "volume-medium"} size={18} color={Colors.accent.indigoLight} />
          <Text style={styles.speakText}>{speaking ? 'Đang phát âm...' : 'Phát âm'}</Text>
        </TouchableOpacity>
      </View>

      {/* Info Group */}
      <SectionTitle>THÔNG TIN HÁN TỰ</SectionTitle>
      <InsetGroup>
        <InsetRow label="Pinyin" value={card.pinyin} valueColor={Colors.neon.cyan} labelStyle={{ width: 100 }} />
        <InsetRow label="Hán Việt" value={card.hanviet} isBorder labelStyle={{ width: 100 }} />
        <InsetRow label="Nghĩa TV" value={card.translation} isBorder labelStyle={{ width: 100 }} />
        {card.radical ? <InsetRow label="Bộ thủ" value={card.radical} isBorder labelStyle={{ width: 100 }} /> : null}
        {card.strokeCount ? <InsetRow label="Số nét" value={`${card.strokeCount} nét`} isBorder labelStyle={{ width: 100 }} /> : null}
        {card.hskLevel ? <InsetRow label="Cấp HSK" value={`HSK ${card.hskLevel}`} isBorder labelStyle={{ width: 100 }} /> : null}
        {card.tags && card.tags.length > 0 && (
          <InsetRow label="Phân loại" value={card.tags.join(', ')} isBorder labelStyle={{ width: 100 }} />
        )}
      </InsetGroup>

      {/* SRS Memory Group */}
      <SectionTitle>TRẠNG THÁI TRÍ NHỚ (ANKI)</SectionTitle>
      <InsetGroup>
        <InsetRow label="Lần ôn" value={`${card.srs.repetitions} lần`} labelStyle={{ width: 100 }} />
        <InsetRow label="Khoảng cách" value={`${card.srs.interval} ngày`} isBorder labelStyle={{ width: 100 }} />
        <InsetRow label="Hệ số Ease" value={`${card.srs.easeFactor}`} isBorder labelStyle={{ width: 100 }} />
        <InsetRow
          label="Trạng thái"
          value={due ? 'Cần ôn ngay' : 'Đã thuộc'}
          valueColor={due ? Colors.neon.coral : Colors.neon.emerald}
          isBorder
          labelStyle={{ width: 100 }}
        />
        <InsetRow
          label="Lần ôn tiếp"
          value={new Date(card.srs.dueDate).toLocaleDateString('vi-VN')}
          isBorder
          labelStyle={{ width: 100 }}
        />
      </InsetGroup>

      {/* Examples Group */}
      {card.examples && card.examples.length > 0 && (
        <>
          <SectionTitle>CÂU VÍ DỤ NGUYÊN CẢNH</SectionTitle>
          <InsetGroup>
            {card.examples.map((ex, i) => (
              <View key={i} style={[styles.exampleItem, i > 0 && styles.cellBorderTop]}>
                <Text style={styles.exCn}>{ex.chinese}</Text>
                <Text style={styles.exPy}>{ex.pinyin}</Text>
                <Text style={styles.exVi}>{ex.vietnamese}</Text>
              </View>
            ))}
          </InsetGroup>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  content: { paddingHorizontal: Spacing.pageMargin },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg.primary },

  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: Spacing.md },
  backText: { color: Colors.accent.indigoLight, fontSize: Typography.text.body.fontSize, fontWeight: Typography.weight.medium },

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
    height: 36,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  speakText: {
    color: Colors.accent.indigoLight,
    fontSize: Typography.text.footnote.fontSize,
    fontWeight: Typography.weight.semibold,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },

  cellBorderTop: {
    borderTopWidth: 1,
    borderTopColor: Colors.border.separator,
  },

  exampleItem: {
    padding: Spacing.cellHorizontal,
  },
  exCn: { fontSize: Typography.text.body.fontSize, color: Colors.text.primary, fontWeight: Typography.weight.semibold },
  exPy: { fontSize: Typography.text.footnote.fontSize, color: Colors.neon.cyan, marginTop: 2 },
  exVi: { fontSize: Typography.text.footnote.fontSize, color: Colors.text.secondary, marginTop: 2 },
});
