import React, { useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useStore, Card } from '../../store/useStore';
import { isDue } from '../../lib/srs';
import { Colors, Typography, Spacing, Radii, VECTOR_DECK_ICONS, triggerHaptic } from '../../constants/theme';

export default function DeckDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { decks, cards, fetchCards, deleteCard, isLoading } = useStore();
  const deck = decks.find(d => d.id === id);
  const deckCards = cards[id] || [];

  useEffect(() => { if (id) fetchCards(id); }, [id]);

  const handleDeleteCard = (card: Card) => {
    triggerHaptic('warning');
    Alert.alert('Xoá thẻ', `Bạn có chắc muốn xoá thẻ "${card.character}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xoá thẻ',
        style: 'destructive',
        onPress: () => {
          triggerHaptic('error');
          deleteCard(card.id, id);
        },
      },
    ]);
  };

  const renderVectorIcon = (iconName: string, size = 22, color = Colors.accent.blue) => {
    const validIcons = VECTOR_DECK_ICONS;
    const icon = validIcons.includes(iconName) ? (iconName as any) : 'book-outline';
    return <Ionicons name={icon} size={size} color={color} />;
  };

  if (!deck) return (
    <View style={styles.center}>
      <ActivityIndicator color={Colors.accent.gray} size="small" />
    </View>
  );

  const dueCards = deckCards.filter(c => isDue(c.srs));
  const newCards = deckCards.filter(c => c.srs.repetitions === 0);
  const learnedCards = deckCards.filter(c => c.srs.repetitions > 0 && !isDue(c.srs));

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 10, 48) }]}>
        <TouchableOpacity
          onPress={() => {
            triggerHaptic('light');
            router.back();
          }}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.accent.blue} />
          <Text style={styles.backText}>Bộ thẻ</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={styles.deckIconTile}>
            {renderVectorIcon(deck.icon, 22, Colors.accent.blue)}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.deckName}>{deck.name}</Text>
            {deck.description ? <Text style={styles.deckDesc} numberOfLines={1}>{deck.description}</Text> : null}
          </View>
        </View>
      </View>

      {/* Quick stats */}
      <View style={styles.statsRow}>
        <StatChip label="Cần ôn" value={dueCards.length} />
        <StatChip label="Mới" value={newCards.length} />
        <StatChip label="Đã học" value={learnedCards.length} />
      </View>

      {/* Centered Study button */}
      <TouchableOpacity
        style={styles.studyBtn}
        onPress={() => {
          triggerHaptic('medium');
          router.push(`/study/${id}`);
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="play" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
        <Text style={styles.studyBtnText}>Bắt đầu ôn tập ({dueCards.length} thẻ)</Text>
      </TouchableOpacity>

      {/* Card list */}
      <ScrollView
        contentContainerStyle={[
          styles.cardList,
          { paddingBottom: Math.max(insets.bottom + 20, 40) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>DANH SÁCH {deckCards.length} THẺ TRONG BỘ</Text>

        {isLoading && <ActivityIndicator color={Colors.accent.gray} style={{ marginTop: 20 }} />}

        {deckCards.length > 0 && (
          <View style={styles.insetGroup}>
            {deckCards.map((card, idx) => (
              <React.Fragment key={card.id}>
                {idx > 0 && <View style={styles.cellDividerIndented} />}
                <TouchableOpacity
                  style={styles.cardRow}
                  onPress={() => {
                    triggerHaptic('light');
                    router.push(`/card/${card.id}?deckId=${id}`);
                  }}
                  onLongPress={() => handleDeleteCard(card)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardLeft}>
                    <Text style={styles.cardChar}>{card.character}</Text>
                  </View>

                  <View style={styles.cardMid}>
                    <View style={styles.cardPinyinRow}>
                      <Text style={styles.cardPinyin}>{card.pinyin}</Text>
                      <Text style={styles.cardHanviet}>{card.hanviet}</Text>
                    </View>
                    <Text style={styles.cardTranslation} numberOfLines={1}>{card.translation}</Text>
                  </View>

                  <View style={styles.cardRight}>
                    <Text style={styles.intervalText}>{card.srs.interval}d</Text>
                    <Ionicons name="chevron-forward" size={16} color={Colors.accent.gray3} style={{ marginLeft: 4 }} />
                  </View>
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </View>
        )}

        {deckCards.length === 0 && !isLoading && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Chưa có thẻ nào trong bộ này</Text>
            <Text style={styles.emptySub}>Dùng tab "Thêm từ" để tự động tạo từ vựng bằng AI.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipValue}>{value}</Text>
      <Text style={styles.chipLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg.primary },

  header: { paddingHorizontal: Spacing.pageMargin, paddingBottom: Spacing.md },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: Spacing.md },
  backText: { color: Colors.accent.blue, fontSize: Typography.text.body.fontSize, fontWeight: Typography.weight.medium },

  headerInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  deckIconTile: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.bg.secondary, alignItems: 'center', justifyContent: 'center' },
  deckName: { fontSize: Typography.text.title2.fontSize, lineHeight: Typography.text.title2.lineHeight, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  deckDesc: { fontSize: Typography.text.caption1.fontSize, color: Colors.text.secondary, marginTop: 1 },

  statsRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.pageMargin, marginBottom: Spacing.lg },
  chip: { flex: 1, backgroundColor: Colors.bg.secondary, borderRadius: Radii.card, padding: Spacing.cellHorizontal, alignItems: 'center' },
  chipValue: { fontSize: Typography.text.title2.fontSize, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  chipLabel: { fontSize: Typography.text.caption1.fontSize, color: Colors.text.secondary, marginTop: 2 },

  studyBtn: {
    backgroundColor: Colors.accent.blue,
    marginHorizontal: Spacing.pageMargin,
    borderRadius: Radii.card,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: Spacing.lg,
  },
  studyBtnText: {
    color: '#FFFFFF',
    fontWeight: Typography.weight.semibold,
    fontSize: Typography.text.body.fontSize,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },

  cardList: { paddingHorizontal: Spacing.pageMargin },
  sectionTitle: {
    fontSize: Typography.text.caption1.fontSize,
    color: Colors.text.secondary,
    fontWeight: Typography.weight.semibold,
    letterSpacing: -0.08,
    marginBottom: Spacing.sectionBottom,
    marginLeft: 4,
  },

  insetGroup: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radii.card,
    overflow: 'hidden',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.cellHorizontal,
    paddingVertical: Spacing.cellVertical,
    minHeight: Spacing.cellMinHeight,
  },
  cellDividerIndented: {
    height: 0.5,
    backgroundColor: Colors.border.separator,
    marginLeft: 56,
  },
  cardLeft: { width: 40, alignItems: 'center' },
  cardChar: { fontSize: Typography.hanzi.sm, color: Colors.text.primary, fontWeight: Typography.weight.bold },
  cardMid: { flex: 1, paddingHorizontal: Spacing.md },
  cardPinyinRow: { flexDirection: 'row', gap: 6, alignItems: 'baseline' },
  cardPinyin: { fontSize: Typography.text.subhead.fontSize, color: Colors.accent.blue, fontWeight: Typography.weight.semibold },
  cardHanviet: { fontSize: Typography.text.caption1.fontSize, color: Colors.text.secondary, fontWeight: Typography.weight.medium },
  cardTranslation: { fontSize: Typography.text.caption1.fontSize, color: Colors.text.secondary, marginTop: 2 },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  intervalText: { fontSize: Typography.text.caption2.fontSize, color: Colors.text.secondary },

  emptyCard: { backgroundColor: Colors.bg.secondary, borderRadius: Radii.card, padding: Spacing.xl, alignItems: 'center' },
  emptyTitle: { fontSize: Typography.text.body.fontSize, fontWeight: Typography.weight.semibold, color: Colors.text.primary },
  emptySub: { fontSize: Typography.text.caption1.fontSize, color: Colors.text.secondary, marginTop: 4, textAlign: 'center' },
});
