import React, { useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Dimensions,
} from 'react-native';
import { useStore } from '../../store/useStore';
import { Colors, Typography, Spacing, Radii, Shadows } from '../../constants/theme';

const { width } = Dimensions.get('window');

// 7-day weekday labels
const DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export default function StatsScreen() {
  const { decks, fetchDecks, userId } = useStore();

  useEffect(() => {
    if (userId) {
      fetchDecks();
    }
  }, [userId]);

  const totalCards = decks.reduce((s, d) => s + (d.cardCount || 0), 0);
  const totalDue = decks.reduce((s, d) => s + (d.dueCount || 0), 0);
  const totalMastered = Math.max(0, totalCards - totalDue);
  const masteryRate = totalCards > 0 ? Math.round((totalMastered / totalCards) * 100) : 0;

  // Mock activity levels for 7-day heatmap (0 = none, 1 = low, 2 = medium, 3 = high)
  const heatmapData = [2, 3, 1, 3, 2, 1, 3];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Title Header */}
      <Text style={styles.title}>Thống Kê Học Tập</Text>

      {/* Hero Mastery Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroLeft}>
          <Text style={styles.heroBadge}>🎯 Tỷ lệ thuộc bài</Text>
          <Text style={styles.heroPercentage}>{masteryRate}%</Text>
          <Text style={styles.heroSub}>{totalMastered} / {totalCards} từ đã đi vào trí nhớ dài hạn</Text>
        </View>
        <View style={styles.heroGaugeCircle}>
          <Text style={styles.heroEmoji}>{masteryRate > 70 ? '🏆' : masteryRate > 40 ? '🔥' : '🌱'}</Text>
        </View>
      </View>

      {/* 7-Day Study Heatmap */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>🔥 Chuỗi Chăm Chỉ 7 Ngày</Text>
          <Text style={styles.streakCount}>7 ngày liên tục</Text>
        </View>

        <View style={styles.heatmapRow}>
          {DAYS.map((day, idx) => {
            const level = heatmapData[idx];
            const activeColor =
              level === 3 ? Colors.accent.green :
              level === 2 ? '#34d399' :
              level === 1 ? '#059669' : Colors.bg.elevated;
            return (
              <View key={day} style={styles.heatmapCol}>
                <View style={[styles.heatmapSquare, { backgroundColor: activeColor }]}>
                  {level > 0 && <Text style={styles.heatmapCheck}>✓</Text>}
                </View>
                <Text style={styles.heatmapDayText}>{day}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Key Metrics Grid */}
      <View style={styles.grid}>
        <MetricCard label="Tổng từ vựng" value={totalCards} icon="🃏" color={Colors.accent.purple} />
        <MetricCard label="Cần ôn hôm nay" value={totalDue} icon="⏰" color={Colors.accent.gold} />
        <MetricCard label="Bộ thẻ đã tạo" value={decks.length} icon="📚" color={Colors.accent.blue} />
        <MetricCard label="Đã thuộc bài" value={totalMastered} icon="✅" color={Colors.accent.green} />
      </View>

      {/* Per-deck progress breakdown */}
      <Text style={styles.sectionTitleHeader}>Phân Bổ Theo Bộ Thẻ</Text>
      {decks.map(deck => {
        const count = deck.cardCount || 0;
        const due = deck.dueCount || 0;
        const done = Math.max(0, count - due);
        const deckMastery = count > 0 ? Math.round((done / count) * 100) : 0;

        return (
          <View key={deck.id} style={styles.deckCard}>
            <View style={styles.deckHeader}>
              <Text style={styles.deckIcon}>{deck.icon}</Text>
              <View style={styles.deckMeta}>
                <Text style={styles.deckName}>{deck.name}</Text>
                <Text style={styles.deckSub}>{count} thẻ • {due} cần ôn</Text>
              </View>
              <Text style={[styles.deckPct, { color: deck.color }]}>{deckMastery}%</Text>
            </View>

            {/* Custom Multi-color Progress Bar */}
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${deckMastery}%`, backgroundColor: deck.color }]} />
            </View>

            <View style={styles.deckPillsRow}>
              <View style={styles.deckPill}>
                <View style={[styles.pillDot, { backgroundColor: Colors.accent.blue }]} />
                <Text style={styles.pillText}>Mới: {deck.newCount || 0}</Text>
              </View>
              <View style={styles.deckPill}>
                <View style={[styles.pillDot, { backgroundColor: Colors.accent.gold }]} />
                <Text style={styles.pillText}>Cần ôn: {due}</Text>
              </View>
              <View style={styles.deckPill}>
                <View style={[styles.pillDot, { backgroundColor: Colors.accent.green }]} />
                <Text style={styles.pillText}>Đã thuộc: {done}</Text>
              </View>
            </View>
          </View>
        );
      })}

      {decks.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={styles.emptyText}>Tạo bộ thẻ và bắt đầu học để xem thống kê chi tiết</Text>
        </View>
      )}

      {/* SRS Tip */}
      <View style={styles.tipCard}>
        <Text style={styles.tipTitle}>🧠 Nguyên lý trí nhớ ngắn hạn Anki</Text>
        <Text style={styles.tipBody}>
          Khi bạn vừa học từ mới, trí nhớ sẽ suy giảm 80% sau 24h nếu không được nhắc lại. 
          Bằng cách ôn đúng vào lúc sắp quên, thuật toán SRS giúp kéo dài khoảng cách lặp lại lên 3 ngày, 7 ngày, 30 ngày và đưa từ vựng vào trí nhớ vĩnh viễn!
        </Text>
      </View>
    </ScrollView>
  );
}

function MetricCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  return (
    <View style={[styles.metricCard, { borderColor: color + '30' }]}>
      <View style={styles.metricHeader}>
        <Text style={styles.metricIcon}>{icon}</Text>
        <Text style={[styles.metricValue, { color }]}>{value}</Text>
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  content: { padding: Spacing.xl, paddingTop: 56, paddingBottom: 80 },
  title: { fontSize: Typography.text.xxxl, fontWeight: Typography.weight.bold, color: Colors.text.primary, marginBottom: Spacing.xl },

  // Hero Card
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.accent.purpleDim,
    borderRadius: Radii.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.accent.purple + '50',
    ...Shadows.card,
  },
  heroLeft: { flex: 1 },
  heroBadge: { fontSize: Typography.text.xs, color: Colors.accent.purpleLight, textTransform: 'uppercase', fontWeight: Typography.weight.semibold, letterSpacing: 0.5 },
  heroPercentage: { fontSize: 42, fontWeight: Typography.weight.heavy, color: Colors.text.primary, marginVertical: 4 },
  heroSub: { fontSize: Typography.text.xs, color: Colors.text.secondary },
  heroGaugeCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.bg.card,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.accent.purple,
  },
  heroEmoji: { fontSize: 30 },

  // Heatmap Card
  sectionCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radii.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  sectionTitle: { fontSize: Typography.text.md, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  streakCount: { fontSize: Typography.text.xs, color: Colors.accent.green, fontWeight: Typography.weight.semibold },

  heatmapRow: { flexDirection: 'row', justifyContent: 'space-between' },
  heatmapCol: { alignItems: 'center' },
  heatmapSquare: {
    width: 36, height: 36, borderRadius: Radii.md,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
  },
  heatmapCheck: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  heatmapDayText: { fontSize: Typography.text.xs, color: Colors.text.muted },

  // Grid Metrics
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.xl },
  metricCard: {
    width: (width - Spacing.xl * 2 - Spacing.sm) / 2,
    backgroundColor: Colors.bg.card,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    borderWidth: 1,
  },
  metricHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricIcon: { fontSize: 24 },
  metricValue: { fontSize: Typography.text.xxl, fontWeight: Typography.weight.bold },
  metricLabel: { fontSize: Typography.text.xs, color: Colors.text.muted, marginTop: Spacing.sm },

  // Deck List Breakdown
  sectionTitleHeader: { fontSize: Typography.text.lg, fontWeight: Typography.weight.bold, color: Colors.text.primary, marginBottom: Spacing.md },
  deckCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radii.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  deckHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  deckIcon: { fontSize: 26, marginRight: Spacing.md },
  deckMeta: { flex: 1 },
  deckName: { fontSize: Typography.text.md, fontWeight: Typography.weight.semibold, color: Colors.text.primary },
  deckSub: { fontSize: Typography.text.xs, color: Colors.text.muted, marginTop: 2 },
  deckPct: { fontSize: Typography.text.lg, fontWeight: Typography.weight.bold },

  progressBarBg: { height: 8, backgroundColor: Colors.bg.elevated, borderRadius: 4, overflow: 'hidden', marginBottom: Spacing.md },
  progressBarFill: { height: '100%', borderRadius: 4 },

  deckPillsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: Spacing.xs },
  deckPill: { flexDirection: 'row', alignItems: 'center' },
  pillDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  pillText: { fontSize: Typography.text.xs, color: Colors.text.secondary },

  empty: { alignItems: 'center', paddingTop: 40, paddingBottom: 40 },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyText: { fontSize: Typography.text.md, color: Colors.text.secondary, textAlign: 'center' },

  // Tip Card
  tipCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radii.xl,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  tipTitle: { fontSize: Typography.text.sm, fontWeight: Typography.weight.bold, color: Colors.accent.purpleLight, marginBottom: Spacing.xs },
  tipBody: { fontSize: Typography.text.xs, color: Colors.text.secondary, lineHeight: 18 },
});
