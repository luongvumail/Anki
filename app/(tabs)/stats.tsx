import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Dimensions, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useStore, Card } from '../../store/useStore';
import { Colors, Typography, Spacing, Radii, VECTOR_DECK_ICONS } from '../../constants/theme';

const { width } = Dimensions.get('window');

interface DayActivity {
  dateStr: string;
  dayName: string;
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
  const insets = useSafeAreaInsets();
  const { decks, cards, fetchDecks, fetchCards, userId } = useStore();
  const [loadingCards, setLoadingCards] = useState(true);

  useEffect(() => {
    async function loadAllData() {
      if (!userId) return;
      setLoadingCards(true);
      await fetchDecks();
      const currentDecks = useStore.getState().decks;
      for (const d of currentDecks) {
        await fetchCards(d.id);
      }
      setLoadingCards(false);
    }
    loadAllData();
  }, [userId]);

  const allCards: Card[] = Object.values(cards).flat();

  const totalCards = allCards.length;
  const totalMastered = allCards.filter(c => c.srs && c.srs.repetitions >= 2).length;
  const totalLearning = allCards.filter(c => c.srs && c.srs.repetitions === 1).length;
  const totalNew = allCards.filter(c => !c.srs || c.srs.repetitions === 0).length;
  const totalDue = decks.reduce((s, d) => s + (d.dueCount || 0), 0);

  const masteryRate = totalCards > 0 ? Math.round((totalMastered / totalCards) * 100) : 0;

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

  let streakDays = 0;
  const todayStr = new Date().toISOString().split('T')[0];
  const hasReviewedToday = (reviewCountsByDate[todayStr] || 0) > 0;

  let checkDate = new Date();
  if (!hasReviewedToday) {
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

  const renderVectorIcon = (iconName: string, size = 18, color = Colors.neon.cyan) => {
    const validIcons = VECTOR_DECK_ICONS;
    const icon = validIcons.includes(iconName) ? (iconName as any) : 'book-outline';
    return <Ionicons name={icon} size={size} color={color} />;
  };

  if (loadingCards) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={Colors.accent.gray} />
        <Text style={styles.loadingText}>Đang cập nhật thống kê trí nhớ...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: Math.max(insets.top + 16, 54), paddingBottom: Math.max(insets.bottom + 90, 110) },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.largeTitle}>Thống kê</Text>
      </View>

      {/* Hero Mastery Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroLeft}>
          <Text style={styles.heroSectionTitle}>TỶ LỆ THUỘC BÀI DÀI HẠN</Text>
          <Text style={styles.heroPercentage}>{masteryRate}%</Text>
          <Text style={styles.heroSub}>{totalMastered} / {totalCards} từ vựng đã thuộc vĩnh viễn</Text>
        </View>
        <View style={styles.heroIconBox}>
          <Ionicons name="checkmark-circle-outline" size={32} color={Colors.neon.cyan} />
        </View>
      </View>

      {/* 7-Day Activity Heatmap */}
      <Text style={styles.sectionHeaderTitle}>CHUỖI HỌC TẬP 7 NGÀY</Text>
      <View style={styles.insetCard}>
        <View style={styles.streakHeaderRow}>
          <Text style={styles.streakLabel}>Hoạt động gần đây</Text>
          <View style={styles.streakBadge}>
            <Text style={styles.streakBadgeText}>
              {streakDays > 0 ? `${streakDays} ngày liên tục` : 'Chưa có chuỗi'}
            </Text>
          </View>
        </View>

        <View style={styles.heatmapRow}>
          {last7Days.map((day) => {
            const level =
              day.count >= 8 ? 3 :
              day.count >= 4 ? 2 :
              day.count >= 1 ? 1 : 0;

            const activeColor =
              level > 0 ? Colors.neon.emerald : Colors.bg.tertiary;

            return (
              <View key={day.dateStr} style={styles.heatmapCol}>
                <View style={[styles.heatmapSquare, { backgroundColor: activeColor }, day.isToday && styles.todaySquare]}>
                  {day.count > 0 ? <Ionicons name="checkmark" size={12} color="#0D0E12" /> : null}
                </View>
                <Text style={[styles.heatmapDayText, day.isToday && styles.todayText]}>{day.dayName}</Text>
                <Text style={styles.heatmapCountText}>{day.count > 0 ? `${day.count}` : '-'}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* 2x2 Metric Grid Cards */}
      <Text style={styles.sectionHeaderTitle}>TỔNG QUAN THÔNG SỐ</Text>
      <View style={styles.grid}>
        <MetricCard label="Tổng từ vựng" value={totalCards} icon="library-outline" color={Colors.neon.cyan} />
        <MetricCard label="Cần ôn hôm nay" value={totalDue} icon="time-outline" color={Colors.neon.coral} />
        <MetricCard label="Thuộc dài hạn" value={totalMastered} icon="checkmark-circle-outline" color={Colors.neon.emerald} />
        <MetricCard label="Đang học mới" value={totalLearning + totalNew} icon="book-outline" color={Colors.neon.purple} />
      </View>

      {/* Per-deck progress breakdown */}
      <Text style={styles.sectionHeaderTitle}>PHÂN BỔ THEO BỘ THẺ</Text>
      {decks.length === 0 ? (
        <View style={styles.insetCard}>
          <Text style={styles.emptyText}>Tạo bộ thẻ để theo dõi thống kê học tập.</Text>
        </View>
      ) : (
        <View style={styles.decksInsetGroup}>
          {decks.map((deck, idx) => {
            const deckCards = cards[deck.id] || [];
            const count = deckCards.length;
            const due = deck.dueCount || 0;
            const done = deckCards.filter(c => c.srs && c.srs.repetitions >= 2).length;
            const deckMastery = count > 0 ? Math.round((done / count) * 100) : 0;

            return (
              <React.Fragment key={deck.id}>
                {idx > 0 && <View style={styles.cellDividerIndented} />}
                <View style={styles.deckCell}>
                  <View style={styles.deckIconTile}>
                    {renderVectorIcon(deck.icon, 18, Colors.neon.cyan)}
                  </View>

                  <View style={styles.deckMeta}>
                    <View style={styles.deckNameRow}>
                      <Text style={styles.deckName}>{deck.name}</Text>
                      <Text style={styles.deckPctText}>{deckMastery}%</Text>
                    </View>

                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${deckMastery}%` }]} />
                    </View>

                    <Text style={styles.deckSubText}>
                      {count} thẻ  •  {due} cần ôn hôm nay
                    </Text>
                  </View>
                </View>
              </React.Fragment>
            );
          })}
        </View>
      )}

      {/* SRS Tip */}
      <View style={[styles.insetCard, { marginTop: Spacing.lg }]}>
        <View style={styles.tipHeader}>
          <Ionicons name="information-circle-outline" size={18} color={Colors.neon.cyan} />
          <Text style={styles.tipTitle}>Thuật toán Spaced Repetition (SM-2)</Text>
        </View>
        <Text style={styles.tipBody}>
          Hệ thống tự động tính toán khoảng thời gian xem lại dựa trên mức độ ghi nhớ của bạn, giúp duy trì trí nhớ dài hạn vĩnh viễn.
        </Text>
      </View>
    </ScrollView>
  );
}

function MetricCard({ label, value, icon, color }: { label: string; value: number; icon: any; color?: string }) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricTop}>
        <Ionicons name={icon} size={18} color={color || Colors.text.secondary} />
        <Text style={[styles.metricValue, color ? { color } : {}]}>{value}</Text>
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg.primary },
  loadingText: { color: Colors.text.secondary, marginTop: Spacing.md, fontSize: Typography.text.footnote.fontSize },
  content: { paddingHorizontal: Spacing.pageMargin },

  header: { marginBottom: Spacing.md },
  largeTitle: {
    fontSize: Typography.text.largeTitle.fontSize,
    lineHeight: Typography.text.largeTitle.lineHeight,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    letterSpacing: 0.37,
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

  // Hero Card
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radii.card,
    padding: Spacing.cellHorizontal,
    borderWidth: 0.5,
    borderColor: Colors.border.default,
  },
  heroLeft: { flex: 1 },
  heroSectionTitle: {
    fontSize: Typography.text.caption1.fontSize,
    color: Colors.text.secondary,
    fontWeight: Typography.weight.semibold,
    letterSpacing: -0.08,
  },
  heroPercentage: {
    fontSize: 36,
    lineHeight: 42,
    fontWeight: Typography.weight.bold,
    color: Colors.neon.cyan,
    marginVertical: 2,
  },
  heroSub: { fontSize: Typography.text.caption1.fontSize, color: Colors.text.secondary },
  heroIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.bg.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: Colors.border.default,
  },

  // Heatmap Inset Card
  insetCard: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radii.card,
    padding: Spacing.cellHorizontal,
    borderWidth: 0.5,
    borderColor: Colors.border.default,
  },
  streakHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  streakLabel: {
    fontSize: Typography.text.body.fontSize,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
  },
  streakBadge: {
    backgroundColor: Colors.bg.tertiary,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 0.5,
    borderColor: Colors.border.default,
  },
  streakBadgeText: {
    fontSize: Typography.text.caption1.fontSize,
    color: Colors.neon.cyan,
    fontWeight: Typography.weight.medium,
  },

  heatmapRow: { flexDirection: 'row', justifyContent: 'space-between' },
  heatmapCol: { alignItems: 'center' },
  heatmapSquare: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  todaySquare: { borderWidth: 2, borderColor: Colors.neon.cyan },
  heatmapDayText: { fontSize: Typography.text.caption2.fontSize, color: Colors.text.secondary },
  todayText: { color: Colors.neon.cyan, fontWeight: Typography.weight.bold },
  heatmapCountText: { fontSize: 10, color: Colors.text.tertiary, marginTop: 2 },

  // Grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metricCard: {
    width: (width - Spacing.pageMargin * 2 - 12) / 2,
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radii.card,
    padding: Spacing.cellHorizontal,
    borderWidth: 0.5,
    borderColor: Colors.border.default,
  },
  metricTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricValue: { fontSize: Typography.text.title2.fontSize, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  metricLabel: { fontSize: Typography.text.caption1.fontSize, color: Colors.text.secondary, marginTop: Spacing.sm },

  // Decks Inset Group
  decksInsetGroup: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radii.card,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: Colors.border.default,
  },
  deckCell: {
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
  deckIconTile: {
    width: 32,
    height: 32,
    borderRadius: Radii.icon,
    backgroundColor: Colors.bg.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  deckMeta: { flex: 1 },
  deckNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deckName: {
    fontSize: Typography.text.body.fontSize,
    lineHeight: Typography.text.body.lineHeight,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
  },
  deckPctText: {
    fontSize: Typography.text.footnote.fontSize,
    fontWeight: Typography.weight.bold,
    color: Colors.neon.cyan,
  },
  progressTrack: {
    height: 4,
    backgroundColor: Colors.bg.tertiary,
    borderRadius: 2,
    marginTop: 4,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: Colors.neon.cyan, borderRadius: 2 },
  deckSubText: {
    fontSize: Typography.text.caption1.fontSize,
    color: Colors.text.secondary,
    marginTop: 4,
  },

  emptyText: { color: Colors.text.secondary, fontSize: Typography.text.subhead.fontSize },

  // Tip
  tipHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  tipTitle: { fontSize: Typography.text.footnote.fontSize, fontWeight: Typography.weight.semibold, color: Colors.text.primary },
  tipBody: { fontSize: Typography.text.caption1.fontSize, color: Colors.text.secondary, lineHeight: 18 },
});
