import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useStore, Card } from '../../store/useStore';
import { isDue } from '../../lib/srs';
import { Colors, Typography, Spacing, Radii } from '../../constants/theme';

export default function DeckDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { decks, cards, fetchCards, deleteCard, isLoading } = useStore();
  const deck = decks.find(d => d.id === id);
  const deckCards = cards[id] || [];

  useEffect(() => { if (id) fetchCards(id); }, [id]);

  const handleDeleteCard = (card: Card) => {
    Alert.alert('Xoá thẻ', `Xoá "${card.character}"?`, [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Xoá', style: 'destructive', onPress: () => deleteCard(card.id, id) },
    ]);
  };

  if (!deck) return (
    <View style={styles.center}>
      <ActivityIndicator color={Colors.accent.purple} />
    </View>
  );

  const dueCards = deckCards.filter(c => isDue(c.srs));
  const newCards = deckCards.filter(c => c.srs.repetitions === 0);
  const learnedCards = deckCards.filter(c => c.srs.repetitions > 0 && !isDue(c.srs));

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.deckIcon}>{deck.icon}</Text>
          <View>
            <Text style={styles.deckName}>{deck.name}</Text>
            {deck.description ? <Text style={styles.deckDesc}>{deck.description}</Text> : null}
          </View>
        </View>
      </View>

      {/* Quick stats */}
      <View style={styles.statsRow}>
        <StatChip label="Cần ôn" value={dueCards.length} color={Colors.accent.gold} />
        <StatChip label="Mới" value={newCards.length} color={Colors.accent.blue} />
        <StatChip label="Đã học" value={learnedCards.length} color={Colors.accent.green} />
      </View>

      {/* Study button */}
      <TouchableOpacity
        style={[styles.studyBtn, { backgroundColor: deck.color }]}
        onPress={() => router.push(`/study/${id}`)}
      >
        <Text style={styles.studyBtnText}>▶  Bắt đầu ôn tập ({dueCards.length} thẻ)</Text>
      </TouchableOpacity>

      {/* Card list */}
      <ScrollView contentContainerStyle={styles.cardList}>
        <Text style={styles.sectionTitle}>{deckCards.length} thẻ trong bộ</Text>
        {isLoading && <ActivityIndicator color={Colors.accent.purple} style={{ marginTop: 20 }} />}
        {deckCards.map(card => (
          <TouchableOpacity
            key={card.id}
            style={styles.cardRow}
            onPress={() => router.push(`/card/${card.id}?deckId=${id}`)}
            onLongPress={() => handleDeleteCard(card)}
            activeOpacity={0.85}
          >
            <View style={styles.cardLeft}>
              <Text style={styles.cardChar}>{card.character}</Text>
            </View>
            <View style={styles.cardMid}>
              <Text style={styles.cardPinyin}>{card.pinyin}</Text>
              <Text style={styles.cardHanviet}>{card.hanviet}</Text>
              <Text style={styles.cardTranslation} numberOfLines={1}>{card.translation}</Text>
            </View>
            <View style={styles.cardRight}>
              {isDue(card.srs)
                ? <View style={styles.dueDot} />
                : <View style={styles.doneDot} />}
              <Text style={styles.intervalText}>{card.srs.interval}d</Text>
            </View>
          </TouchableOpacity>
        ))}
        {deckCards.length === 0 && !isLoading && (
          <View style={styles.emptyCards}>
            <Text style={styles.emptyText}>Chưa có thẻ nào. Thêm từ trong tab "Thêm từ".</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function StatChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[styles.chip, { borderColor: color + '50' }]}>
      <Text style={[styles.chipValue, { color }]}>{value}</Text>
      <Text style={styles.chipLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg.primary },
  header: { flexDirection: 'row', alignItems: 'center', padding: Spacing.xl, paddingTop: 60 },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm },
  backBtnText: { color: Colors.text.primary, fontSize: 28 },
  headerInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  deckIcon: { fontSize: 36 },
  deckName: { fontSize: Typography.text.xl, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  deckDesc: { fontSize: Typography.text.sm, color: Colors.text.secondary, marginTop: 2 },

  statsRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  chip: { flex: 1, backgroundColor: Colors.bg.card, borderRadius: Radii.lg, padding: Spacing.md, alignItems: 'center', borderWidth: 1 },
  chipValue: { fontSize: Typography.text.xl, fontWeight: Typography.weight.bold },
  chipLabel: { fontSize: Typography.text.xs, color: Colors.text.muted },

  studyBtn: { marginHorizontal: Spacing.xl, borderRadius: Radii.lg, paddingVertical: Spacing.lg, alignItems: 'center', marginBottom: Spacing.lg },
  studyBtnText: { color: '#fff', fontWeight: Typography.weight.semibold, fontSize: Typography.text.md },

  cardList: { paddingHorizontal: Spacing.xl, paddingBottom: 40 },
  sectionTitle: { fontSize: Typography.text.sm, color: Colors.text.muted, marginBottom: Spacing.md },
  cardRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.bg.card, borderRadius: Radii.lg,
    padding: Spacing.md, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border.subtle,
  },
  cardLeft: { width: 56, alignItems: 'center' },
  cardChar: { fontSize: Typography.hanzi.sm, color: Colors.text.primary, fontWeight: Typography.weight.bold },
  cardMid: { flex: 1, paddingHorizontal: Spacing.md },
  cardPinyin: { fontSize: Typography.text.sm, color: Colors.accent.purpleLight },
  cardHanviet: { fontSize: Typography.text.sm, color: Colors.accent.gold },
  cardTranslation: { fontSize: Typography.text.sm, color: Colors.text.secondary, marginTop: 2 },
  cardRight: { alignItems: 'center', gap: 4 },
  dueDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.accent.gold },
  doneDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.accent.green },
  intervalText: { fontSize: Typography.text.xs, color: Colors.text.muted },
  emptyCards: { alignItems: 'center', paddingTop: 40 },
  emptyText: { color: Colors.text.secondary, textAlign: 'center', fontSize: Typography.text.sm },
});
