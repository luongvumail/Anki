import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Dimensions, ActivityIndicator, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useStore, Card } from '../../store/useStore';
import { Colors, Typography, Spacing, Radii } from '../../constants/theme';
import { DeckIcon } from '../../components/ui/DeckIcon';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { InsetGroup } from '../../components/ui/InsetGroup';

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

  // Staggered entrance animations
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    async function loadAllData() {
      if (!userId) return;
      setLoadingCards(true);
      await fetchDecks();
      const currentDecks = useStore.getState().decks;
      await Promise.all(currentDecks.map(d => fetchCards(d.id)));
      setLoadingCards(false);

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
    loadAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const {
    totalCards,
    totalMastered,
    totalLearning,
    totalNew,
    totalDue,
    masteryRate,
    last7Days,
    streakDays,
  } = useMemo(() => {
    const cardsList: Card[] = Object.values(cards).flat();
    const countTotal = cardsList.length;
    const countMastered = cardsList.filter((c) => c.srs && c.srs.repetitions >= 2).length;
    const countLearning = cardsList.filter((c) => c.srs && c.srs.repetitions === 1).length;
    const countNew = cardsList.filter((c) => !c.srs || c.srs.repetitions === 0).length;
    const countDue = decks.reduce((s, d) => s + (d.dueCount || 0), 0);
    const rate = countTotal > 0 ? Math.round((countMastered / countTotal) * 100) : 0;

    const days7 = getLast7Days();
    const reviewCountsByDate: Record<string, number> = {};

    cardsList.forEach((c) => {
      if (c.updatedAt) {
        const datePart = c.updatedAt.split("T")[0];
        reviewCountsByDate[datePart] = (reviewCountsByDate[datePart] || 0) + 1;
      }
    });

    days7.forEach((day) => {
      day.count = reviewCountsByDate[day.dateStr] || 0;
    });

    let streak = 0;
    const todayStr = new Date().toISOString().split("T")[0];
    const hasReviewedToday = (reviewCountsByDate[todayStr] || 0) > 0;

    const checkDate = new Date();
    if (!hasReviewedToday) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    for (let i = 0; i < 365; i++) {
      const dStr = checkDate.toISOString().split("T")[0];
      if (reviewCountsByDate[dStr] && reviewCountsByDate[dStr] > 0) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return {
      totalCards: countTotal,
      totalMastered: countMastered,
      totalLearning: countLearning,
      totalNew: countNew,
      totalDue: countDue,
      masteryRate: rate,
      last7Days: days7,
      streakDays: streak,
    };
  }, [cards, decks]);

  if (loadingCards) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={Colors.accent.indigoLight} />
        <Text style={styles.loadingText}>Đang cập nhật thống kê trí nhớ...</Text>
      </View>
    );
  }

  const translateY = fadeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 0],
  });

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

      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY }] }}>
        {/* Hero Mastery Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroLeft}>
            <Text style={styles.heroSectionTitle}>TỶ LỆ THUỘC BÀI DÀI HẠN</Text>
            <Text style={styles.heroPercentage}>{masteryRate}%</Text>
            <Text style={styles.heroSub}>{totalMastered} / {totalCards} từ vựng đã thuộc vĩnh viễn</Text>
          </View>
          <View style={styles.heroIconBox}>
            <Ionicons name="checkmark-circle-outline" size={32} color={Colors.accent.indigoLight} />
          </View>
        </View>

        {/* 7-Day Activity Heatmap */}
        <SectionTitle>CHUỖI HỌC TẬP 7 NGÀY</SectionTitle>
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
            {last7Days.map((day, index) => {
              const level =
                day.count >= 8 ? 3 :
                day.count >= 4 ? 2 :
                day.count >= 1 ? 1 : 0;

              const activeColor =
                level > 0 ? Colors.accent.indigoLight : Colors.bg.tertiary;

              return (
                <View key={day.dateStr} style={styles.heatmapCol}>
                  <View style={[styles.heatmapSquare, { backgroundColor: activeColor }, day.isToday && styles.todaySquare]}>
                    {day.count > 0 ? <Ionicons name="checkmark" size={12} color="#08090C" /> : null}
                  </View>
                  <Text style={[styles.heatmapDayText, day.isToday && styles.todayText]}>{day.dayName}</Text>
                  <Text style={styles.heatmapCountText}>{day.count > 0 ? `${day.count}` : '-'}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* 2x2 Metric Grid Cards */}
        <SectionTitle>TỔNG QUAN THÔNG SỐ</SectionTitle>
        <View style={styles.grid}>
          <MetricCard label="Tổng từ vựng" value={totalCards} icon="library-outline" color={Colors.accent.indigoLight} />
          <MetricCard label="Cần ôn hôm nay" value={totalDue} icon="time-outline" color={Colors.neon.coral} />
          <MetricCard label="Thuộc dài hạn" value={totalMastered} icon="checkmark-circle-outline" color={Colors.neon.emerald} />
          <MetricCard label="Đang học mới" value={totalLearning + totalNew} icon="book-outline" color={Colors.accent.indigoLight} />
        </View>

        {/* Per-deck progress breakdown */}
        <SectionTitle>PHÂN BỔ THEO BỘ THẺ</SectionTitle>
        {decks.length === 0 ? (
          <View style={styles.insetCard}>
            <Text style={styles.emptyText}>Tạo bộ thẻ để theo dõi thống kê học tập.</Text>
          </View>
        ) : (
          <InsetGroup>
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
                      <DeckIcon name={deck.icon} size={18} color={Colors.accent.indigoLight} />
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
          </InsetGroup>
        )}

        {/* SRS Tip */}
        <View style={[styles.insetCard, { marginTop: Spacing.lg }]}>
          <View style={styles.tipHeader}>
            <Ionicons name="information-circle-outline" size={18} color={Colors.accent.indigoLight} />
            <Text style={styles.tipTitle}>Thuật toán Spaced Repetition (SM-2)</Text>
          </View>
          <Text style={styles.tipBody}>
            Hệ thống tự động tính toán khoảng thời gian xem lại dựa trên mức độ ghi nhớ của bạn, giúp duy trì trí nhớ dài hạn vĩnh viễn.
          </Text>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

function MetricCard({ label, value, icon, color }: { label: string; value: number; icon: any; color?: string }) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricTop}>
        <Ionicons name={icon} size={18} color={color || Colors.accent.indigoLight} />
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

  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radii.card,
    padding: Spacing.cellHorizontal,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  heroLeft: { flex: 1 },
  heroSectionTitle: {
    fontSize: Typography.text.caption1.fontSize,
    color: Colors.text.secondary,
    fontWeight: Typography.weight.semibold,
    letterSpacing: 1.1,
  },
  heroPercentage: {
    fontSize: 36,
    lineHeight: 42,
    fontWeight: Typography.weight.bold,
    color: Colors.accent.indigoLight,
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
    borderWidth: 1,
    borderColor: Colors.border.default,
  },

  insetCard: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radii.card,
    padding: Spacing.cellHorizontal,
    borderWidth: 1,
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
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  streakBadgeText: {
    fontSize: Typography.text.caption1.fontSize,
    color: Colors.accent.indigoLight,
    fontWeight: Typography.weight.bold,
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
  todaySquare: { borderWidth: 2, borderColor: Colors.accent.indigoLight },
  heatmapDayText: { fontSize: Typography.text.caption2.fontSize, color: Colors.text.secondary },
  todayText: { color: Colors.accent.indigoLight, fontWeight: Typography.weight.bold },
  heatmapCountText: { fontSize: 10, color: Colors.text.tertiary, marginTop: 2 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metricCard: {
    width: (width - Spacing.pageMargin * 2 - 12) / 2,
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radii.card,
    padding: Spacing.cellHorizontal,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  metricTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricValue: { fontSize: Typography.text.title2.fontSize, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  metricLabel: { fontSize: Typography.text.caption1.fontSize, color: Colors.text.secondary, marginTop: Spacing.sm },

  deckCell: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.cellHorizontal,
    paddingVertical: Spacing.cellVertical,
    minHeight: Spacing.cellMinHeight,
  },
  cellDividerIndented: {
    height: 1,
    backgroundColor: Colors.border.separator,
    marginLeft: 56,
  },
  deckIconTile: {
    width: 32,
    height: 32,
    borderRadius: Radii.icon,
    backgroundColor: Colors.bg.tertiary,
    borderWidth: 1,
    borderColor: Colors.border.default,
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
    color: Colors.accent.indigoLight,
  },
  progressTrack: {
    height: 4,
    backgroundColor: Colors.bg.tertiary,
    borderRadius: 2,
    marginTop: 4,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: Colors.accent.indigoLight, borderRadius: 2 },
  deckSubText: {
    fontSize: Typography.text.caption1.fontSize,
    color: Colors.text.secondary,
    marginTop: 4,
  },

  emptyText: { color: Colors.text.secondary, fontSize: Typography.text.subhead.fontSize },

  tipHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  tipTitle: { fontSize: Typography.text.footnote.fontSize, fontWeight: Typography.weight.semibold, color: Colors.text.primary },
  tipBody: { fontSize: Typography.text.caption1.fontSize, color: Colors.text.secondary, lineHeight: 18 },
});
