import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Dimensions, ActivityIndicator,
} from 'react-native';
import { useStore, Card } from '../../store/useStore';
import { Colors, Typography, Spacing, Radii, Shadows } from '../../constants/theme';

const { width } = Dimensions.get('window');

interface DayActivity {
  dateStr: string; // YYYY-MM-DD
  dayName: string; // T2, T3...
  count: number;
  isToday: boolean;
}

function getLast7Days(): DayActivity[] {
  const result: DayActivity[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][d.getDay()];
    result.push({
      dateStr,
      dayName,
      count: 0,
      isToday: i === 0,
    });
  }
  return result;
}

export default function StatsScreen() {
  const { decks, cards, fetchDecks, fetchCards, userId } = useStore();
  const [loadingCards, setLoadingCards] = useState(true);

  useEffect(() => {
    async function loadAllData() {
      if (!userId) return;
      setLoadingCards(true);
      await fetchDecks();
      // Fetch cards for all decks to compute accurate real-time stats
      const currentDecks = useStore.getState().decks;
      for (const d of currentDecks) {
        await fetchCards(d.id);
      }
      setLoadingCards(false);
    }
    loadAllData();
  }, [userId]);

  // Flatten all cards across all decks
  const allCards: Card[] = Object.values(cards).flat();

  const totalCards = allCards.length;
  // Mastered = Cards reviewed 2+ times with interval > 1 day
  const totalMastered = allCards.filter(c => c.srs && c.srs.repetitions >= 2).length;
  const totalLearning = allCards.filter(c => c.srs && c.srs.repetitions === 1).length;
  const totalNew = allCards.filter(c => !c.srs || c.srs.repetitions === 0).length;
  const totalDue = decks.reduce((s, d) => s + (d.dueCount || 0), 0);

  const masteryRate = totalCards > 0 ? Math.round((totalMastered / totalCards) * 100) : 0;

  // Compute 7-day activity map
  const last7Days = getLast7Days();
  const reviewCountsByDate: Record<string, number> = {};

  allCards.forEach(c => {
    if (c.updatedAt) {
      const datePart = c.updatedAt.split('T')[0];
      reviewCountsByDate[datePart] = (reviewCountsByDate[datePart] || 0) + 1;
    }
  });

  last7Days.forEach(day => {
    day.count = reviewCountsByDate[day.dateStr] || 0;
  });

  // Calculate real consecutive streak days
  let streakDays = 0;
  const todayStr = new Date().toISOString().split('T')[0];
  const hasReviewedToday = (reviewCountsByDate[todayStr] || 0) > 0;

  let checkDate = new Date();
  if (!hasReviewedToday) {
    // If not reviewed today yet, start checking from yesterday to see current streak
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (true) {
    const dStr = checkDate.toISOString().split('T')[0];
    if (reviewCountsByDate[dStr] && reviewCountsByDate[dStr] > 0) {
      streakDays++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  if (loadingCards) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.accent.purple} />
        <Text style={styles.loadingText}>Đang tính toán thống kê thực tế...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Title Header */}
      <Text style={styles.title}>Thống Kê Học Tập</Text>

      {/* Hero Mastery Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroLeft}>
          <Text style={styles.heroBadge}>🎯 Tỷ lệ thuộc bài thực tế</Text>
          <Text style={styles.heroPercentage}>{masteryRate}%</Text>
          <Text style={styles.heroSub}>{totalMastered} / {totalCards} từ vựng đã thuộc dài hạn</Text>
        </View>
        <View style={styles.heroGaugeCircle}>
          <Text style={styles.heroEmoji}>{masteryRate > 70 ? '🏆' : masteryRate > 30 ? '🔥' : '🌱'}</Text>
        </View>
      </View>

      {/* 7-Day Real Study Heatmap */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>🔥 Chuỗi Chăm Chỉ 7 Ngày</Text>
          <Text style={styles.streakCount}>
            {streakDays > 0 ? `${streakDays} ngày liên tục` : 'Chưa có chuỗi (Học ngay)'}
          </Text>
        </View>

        <View style={styles.heatmapRow}>
          {last7Days.map((day) => {
            const level =
              day.count >= 8 ? 3 :
              day.count >= 4 ? 2 :
              day.count >= 1 ? 1 : 0;

            const activeColor =
              level === 3 ? Colors.accent.green :
              level === 2 ? '#34d399' :
              level === 1 ? '#059669' : Colors.bg.elevated;

            return (
              <View key={day.dateStr} style={styles.heatmapCol}>
                <View style={[styles.heatmapSquare, { backgroundColor: activeColor }, day.isToday && styles.todaySquare]}>
                  {day.count > 0 && <Text style={styles.heatmapCheck}>✓</Text>}
                </View>
                <Text style={[styles.heatmapDayText, day.isToday && styles.todayText]}>{day.dayName}</Text>
                <Text style={styles.heatmapCountText}>{day.count > 0 ? `${day.count}t` : '-'}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Real Metrics Grid */}
      <View style={styles.grid}>
        <MetricCard label="Tổng từ vựng" value={totalCards} icon="🃏" color={Colors.accent.purple} />
        <MetricCard label="Cần ôn hôm nay" value={totalDue} icon="⏰" color={Colors.accent.gold} />
        <MetricCard label="Đã thuộc" value={totalMastered} icon="✅" color={Colors.accent.green} />
        <MetricCard label="Đang học" value={totalLearning + totalNew} icon="📖" color={Colors.accent.blue} />
      </View>

      {/* Per-deck real progress breakdown */}
      <Text style={styles.sectionTitleHeader}>Phân Bổ Theo Bộ Thẻ</Text>
      {decks.map(deck => {
        const deckCards = cards[deck.id] || [];
        const count = deckCards.length;
        const due = deck.dueCount || 0;
        const done = deckCards.filter(c => c.srs && c.srs.repetitions >= 2).length;
        const deckMastery = count > 0 ? Math.round((done / count) * 100) : 0;

        return (
          <View key={deck.id} style={styles.deckCard}>
            <View style={styles.deckHeader}>
              <Text style={styles.deckIcon}>{deck.icon}</Text>
              <View style={styles.deckMeta}>
                <Text style={styles.deckName}>{deck.name}</Text>
                <Text style={styles.deckSub}>{count} thẻ • {due} cần ôn hôm nay</Text>
              </View>
              <Text style={[styles.deckPct, { color: deck.color }]}>{deckMastery}%</Text>
            </View>

            {/* Custom Progress Bar */}
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${deckMastery}%`, backgroundColor: deck.color }]} />
            </View>

            <View style={styles.deckPillsRow}>
              <View style={styles.deckPill}>
                <View style={[styles.pillDot, { backgroundColor: Colors.accent.blue }]} />
                <Text style={styles.pillText}>Mới: {deckCards.filter(c => !c.srs || c.srs.repetitions === 0).length}</Text>
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
          Thuật toán Anki SM-2 ghi nhận lịch sử học thực tế của bạn. Ôn tập đúng hẹn giúp từ vựng được tự động chuyển từ trí nhớ ngắn hạn sang trí nhớ dài hạn vĩnh viễn!
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg.primary },
  loadingText: { color: Colors.text.secondary, marginTop: Spacing.md },
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
    marginBottom: 4,
  },
  todaySquare: { borderWidth: 2, borderColor: Colors.accent.purple },
  heatmapCheck: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  heatmapDayText: { fontSize: Typography.text.xs, color: Colors.text.muted },
  todayText: { color: Colors.accent.purpleLight, fontWeight: Typography.weight.bold },
  heatmapCountText: { fontSize: 10, color: Colors.text.muted, marginTop: 2 },

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
