import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { useStore, Card } from '../../store/useStore';
import { isDue } from '../../lib/srs';
import { Colors, Typography, Spacing, Radii } from '../../constants/theme';

export default function CardDetailScreen() {
  const { id, deckId } = useLocalSearchParams<{ id: string; deckId: string }>();
  const { cards } = useStore();
  const [speaking, setSpeaking] = useState(false);

  const deckCards = cards[deckId] || [];
  const card = deckCards.find(c => c.id === id);

  const speak = () => {
    if (!card) return;
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
        <ActivityIndicator color={Colors.accent.purple} />
      </View>
    );
  }

  const due = isDue(card.srs);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Back button */}
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backText}>‹ Quay lại</Text>
      </TouchableOpacity>

      {/* Card header */}
      <View style={styles.cardHeader}>
        <Text style={styles.characterBig}>{card.character}</Text>
        {card.traditional && card.traditional !== card.character && (
          <Text style={styles.traditional}>{card.traditional}</Text>
        )}
        <TouchableOpacity style={styles.speakBtn} onPress={speak}>
          <Text style={styles.speakText}>{speaking ? '🔊 Đang phát...' : '🔉 Phát âm'}</Text>
        </TouchableOpacity>
      </View>

      {/* Info grid */}
      <View style={styles.infoCard}>
        <InfoRow label="Pinyin" value={card.pinyin} valueColor={Colors.accent.purpleLight} />
        <InfoRow label="Hán Việt" value={card.hanviet} valueColor={Colors.accent.gold} />
        <InfoRow label="Nghĩa" value={card.translation} />
        {card.radical && <InfoRow label="Bộ thủ" value={card.radical} />}
        {card.strokeCount ? <InfoRow label="Số nét" value={`${card.strokeCount} nét`} /> : null}
        {card.hskLevel ? <InfoRow label="HSK" value={`Cấp ${card.hskLevel}`} /> : null}
        {card.tags && card.tags.length > 0 && (
          <InfoRow label="Loại từ" value={card.tags.join(', ')} />
        )}
      </View>

      {/* SRS status */}
      <View style={styles.srsCard}>
        <Text style={styles.srsCardTitle}>Trạng thái ôn tập</Text>
        <View style={styles.srsGrid}>
          <SRSStat label="Lần ôn" value={`${card.srs.repetitions}`} />
          <SRSStat label="Khoảng" value={`${card.srs.interval} ngày`} />
          <SRSStat label="Hệ số" value={`${card.srs.easeFactor}`} />
          <SRSStat
            label="Trạng thái"
            value={due ? 'Cần ôn' : 'Đã thuộc'}
            color={due ? Colors.accent.gold : Colors.accent.green}
          />
        </View>
        <View style={[styles.dueDateRow, { borderColor: due ? Colors.accent.gold + '40' : Colors.accent.green + '40' }]}>
          <Text style={styles.dueDateLabel}>Ôn tiếp vào:</Text>
          <Text style={[styles.dueDateValue, { color: due ? Colors.accent.gold : Colors.accent.green }]}>
            {new Date(card.srs.dueDate).toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </Text>
        </View>
      </View>

      {/* Examples */}
      {card.examples && card.examples.length > 0 && (
        <View style={styles.examplesCard}>
          <Text style={styles.examplesTitle}>Câu ví dụ</Text>
          {card.examples.map((ex, i) => (
            <View key={i} style={styles.exampleItem}>
              <Text style={styles.exNum}>{i + 1}.</Text>
              <View style={styles.exContent}>
                <Text style={styles.exCn}>{ex.chinese}</Text>
                <Text style={styles.exPy}>{ex.pinyin}</Text>
                <Text style={styles.exVi}>{ex.vietnamese}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
    </View>
  );
}

function SRSStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.srsStat}>
      <Text style={[styles.srsStatValue, color ? { color } : {}]}>{value}</Text>
      <Text style={styles.srsStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  content: { padding: Spacing.xl, paddingTop: 60, paddingBottom: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg.primary },
  backBtn: { marginBottom: Spacing.xl },
  backText: { color: Colors.accent.purpleLight, fontSize: Typography.text.md },

  cardHeader: { alignItems: 'center', marginBottom: Spacing.xl },
  characterBig: {
    fontSize: Typography.hanzi.xl, color: Colors.text.primary, fontWeight: Typography.weight.bold,
    textShadowColor: Colors.accent.purple, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 24,
  },
  traditional: { fontSize: Typography.text.xl, color: Colors.text.secondary, marginTop: Spacing.sm },
  speakBtn: {
    marginTop: Spacing.lg, borderWidth: 1, borderColor: Colors.border.default,
    borderRadius: Radii.full, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm,
  },
  speakText: { color: Colors.text.secondary, fontSize: Typography.text.sm },

  infoCard: { backgroundColor: Colors.bg.card, borderRadius: Radii.xl, marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.border.subtle, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border.subtle },
  infoLabel: { width: 80, fontSize: Typography.text.sm, color: Colors.text.muted },
  infoValue: { flex: 1, fontSize: Typography.text.md, color: Colors.text.primary, fontWeight: Typography.weight.medium },

  srsCard: { backgroundColor: Colors.bg.card, borderRadius: Radii.xl, padding: Spacing.lg, marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.border.subtle },
  srsCardTitle: { fontSize: Typography.text.sm, color: Colors.text.secondary, marginBottom: Spacing.lg },
  srsGrid: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: Spacing.lg },
  srsStat: { alignItems: 'center' },
  srsStatValue: { fontSize: Typography.text.lg, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  srsStatLabel: { fontSize: Typography.text.xs, color: Colors.text.muted, marginTop: 2 },
  dueDateRow: { borderWidth: 1, borderRadius: Radii.md, padding: Spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dueDateLabel: { fontSize: Typography.text.sm, color: Colors.text.muted },
  dueDateValue: { fontSize: Typography.text.sm, fontWeight: Typography.weight.medium },

  examplesCard: { backgroundColor: Colors.bg.card, borderRadius: Radii.xl, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border.subtle },
  examplesTitle: { fontSize: Typography.text.sm, color: Colors.text.secondary, marginBottom: Spacing.lg },
  exampleItem: { flexDirection: 'row', marginBottom: Spacing.lg },
  exNum: { fontSize: Typography.text.md, color: Colors.text.muted, marginRight: Spacing.md, marginTop: 2 },
  exContent: { flex: 1 },
  exCn: { fontSize: Typography.text.lg, color: Colors.text.primary, fontWeight: Typography.weight.medium },
  exPy: { fontSize: Typography.text.sm, color: Colors.accent.purpleLight, marginTop: 4 },
  exVi: { fontSize: Typography.text.sm, color: Colors.text.secondary, marginTop: 2 },
});
