import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Dimensions,
} from 'react-native';
import { useStore } from '../../store/useStore';
import { Colors, Typography, Spacing, Radii } from '../../constants/theme';

const { width } = Dimensions.get('window');

export default function StatsScreen() {
  const { decks, fetchDecks } = useStore();

  useEffect(() => { fetchDecks(); }, []);

  const totalCards = decks.reduce((s, d) => s + (d.cardCount || 0), 0);
  const totalDue = decks.reduce((s, d) => s + (d.dueCount || 0), 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Thống kê</Text>

      {/* Overview */}
      <View style={styles.grid}>
        <StatCard label="Tổng thẻ" value={totalCards} icon="🃏" color={Colors.accent.purple} />
        <StatCard label="Cần ôn" value={totalDue} icon="⏰" color={Colors.accent.gold} />
        <StatCard label="Bộ thẻ" value={decks.length} icon="📚" color={Colors.accent.blue} />
        <StatCard label="Hoàn thành" value={totalCards - totalDue} icon="✅" color={Colors.accent.green} />
      </View>

      {/* Per-deck breakdown */}
      <Text style={styles.sectionTitle}>Theo bộ thẻ</Text>
      {decks.map(deck => (
        <View key={deck.id} style={styles.deckStat}>
          <View style={styles.deckStatHeader}>
            <Text style={styles.deckIcon}>{deck.icon}</Text>
            <Text style={styles.deckName}>{deck.name}</Text>
            <Text style={styles.deckTotal}>{deck.cardCount} thẻ</Text>
          </View>
          <ProgressBar
            value={deck.dueCount || 0}
            max={Math.max(deck.cardCount || 1, 1)}
            color={deck.color}
          />
          <View style={styles.deckBreakdown}>
            <MiniStat label="Mới" value={deck.newCount || 0} color={Colors.accent.blue} />
            <MiniStat label="Cần ôn" value={deck.dueCount || 0} color={Colors.accent.gold} />
            <MiniStat label="Hoàn thành" value={(deck.cardCount || 0) - (deck.dueCount || 0)} color={Colors.accent.green} />
          </View>
        </View>
      ))}

      {decks.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={styles.emptyText}>Tạo bộ thẻ và học để xem thống kê</Text>
        </View>
      )}

      {/* Tip */}
      <View style={styles.tip}>
        <Text style={styles.tipText}>
          💡 <Text style={{ fontWeight: '600' }}>Mẹo: </Text>
          Ôn tập đều đặn mỗi ngày giúp nhớ từ lâu dài hơn gấp 5 lần so với học nhồi nhét.
        </Text>
      </View>
    </ScrollView>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  return (
    <View style={[styles.statCard, { borderColor: color + '30' }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(value / max, 1);
  return (
    <View style={styles.progressBg}>
      <View style={[styles.progressFill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
    </View>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.miniStat}>
      <Text style={[styles.miniValue, { color }]}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  content: { padding: Spacing.xl, paddingTop: 60, paddingBottom: 60 },
  title: { fontSize: Typography.text.xxxl, fontWeight: Typography.weight.bold, color: Colors.text.primary, marginBottom: Spacing.xxl },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.xxl },
  statCard: {
    width: (width - Spacing.xl * 2 - Spacing.sm) / 2,
    backgroundColor: Colors.bg.card, borderRadius: Radii.xl,
    padding: Spacing.lg, alignItems: 'center',
    borderWidth: 1,
  },
  statIcon: { fontSize: 28, marginBottom: Spacing.sm },
  statValue: { fontSize: Typography.text.xxxl, fontWeight: Typography.weight.bold },
  statLabel: { fontSize: Typography.text.xs, color: Colors.text.muted, marginTop: 4 },

  sectionTitle: { fontSize: Typography.text.lg, fontWeight: Typography.weight.semibold, color: Colors.text.primary, marginBottom: Spacing.md },
  deckStat: {
    backgroundColor: Colors.bg.card, borderRadius: Radii.xl,
    padding: Spacing.lg, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.border.subtle,
  },
  deckStatHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  deckIcon: { fontSize: 24, marginRight: Spacing.sm },
  deckName: { flex: 1, fontSize: Typography.text.md, fontWeight: Typography.weight.semibold, color: Colors.text.primary },
  deckTotal: { fontSize: Typography.text.sm, color: Colors.text.muted },
  progressBg: { height: 8, backgroundColor: Colors.bg.elevated, borderRadius: 4, overflow: 'hidden', marginBottom: Spacing.md },
  progressFill: { height: '100%', borderRadius: 4 },
  deckBreakdown: { flexDirection: 'row', justifyContent: 'space-around' },
  miniStat: { alignItems: 'center' },
  miniValue: { fontSize: Typography.text.xl, fontWeight: Typography.weight.bold },
  miniLabel: { fontSize: Typography.text.xs, color: Colors.text.muted },

  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyText: { fontSize: Typography.text.md, color: Colors.text.secondary, textAlign: 'center' },

  tip: { backgroundColor: Colors.accent.purpleDim, borderRadius: Radii.lg, padding: Spacing.lg, marginTop: Spacing.xl, borderWidth: 1, borderColor: Colors.accent.purple + '40' },
  tipText: { fontSize: Typography.text.sm, color: Colors.text.secondary, lineHeight: 20 },
});
