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

import { getReviewHistory } from '../../lib/reviewTracker';
import { computeDueCount, getDeckMasteryPct } from '../../lib/deckUtils';
import { isDue } from '../../lib/srs';

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
  const [reviewHistory, setReviewHistory] = useState<Record<string, number>>({});

  // Staggered entrance animations
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    async function loadAllData() {
      if (!userId) return;
      setLoadingCards(true);
      const history = await getReviewHistory();
      setReviewHistory(history);
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
    const countMastered = cardsList.filter((c) => c.srs && c.srs.repetitions > 0 && !isDue(c.srs)).length;
    const countLearning = cardsList.filter((c) => c.srs && c.srs.repetitions === 1).length;
    const countNew = cardsList.filter((c) => !c.srs || c.srs.repetitions === 0).length;

    const countDue = decks.reduce((s, d) => {
      const deckCards = cards[d.id];
      return s + (deckCards ? computeDueCount(deckCards) : (d.dueCount || 0));
    }, 0);

    const rate = countTotal > 0 ? Math.round((countMastered / countTotal) * 100) : 0;

    const days7 = getLast7Days();
    const mergedHistory: Record<string, number> = { ...reviewHistory };

    cardsList.forEach((c) => {
      const dateVal = c.lastReviewedAt || c.updatedAt;
      if (dateVal) {
        const datePart = dateVal.split("T")[0];
        mergedHistory[datePart] = (mergedHistory[datePart] || 0) + 1;
      }
    });

    days7.forEach((day) => {
      day.count = mergedHistory[day.dateStr] || 0;
    });

    let streak = 0;
    const todayStr = new Date().toISOString().split("T")[0];
    const hasReviewedToday = (mergedHistory[todayStr] || 0) > 0;

    const checkDate = new Date();
    if (!hasReviewedToday) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    for (let i = 0; i < 365; i++) {
      const dStr = checkDate.toISOString().split("T")[0];
      if (mergedHistory[dStr] && mergedHistory[dStr] > 0) {
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
  }, [cards, decks, reviewHistory]);

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
        <Text style={styles.headerSubhead}>THEO DÕI TIẾN TRÌNH HỌC TẬP</Text>
        <Text style={styles.headerTitle}>Thống kê</Text>
      </View>

      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY }] }}>
        {/* Hero Mastery Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroLeft}>
            <Text style={styles.heroSectionTitle}>TỶ LỆ THUỘC BÀI DÀI HẠN</Text>
            <Text style={styles.heroPercentage}>{totalCards > 0 ? `${masteryRate}%` : '—'}</Text>
            <Text style={styles.heroSub}>
              {totalCards > 0
                ? `${totalMastered} / ${totalCards} từ vựng đã thuộc vĩnh viễn`
                : 'Chưa có từ vựng để theo dõi tiến độ'}
            </Text>
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
              const count = deck.cardCount || deckCards.length;
              const due = deckCards.length > 0 ? computeDueCount(deckCards) : (deck.dueCount || 0);
              const deckMastery = getDeckMasteryPct(count, due, deckCards);

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
                        <Text style={styles.deckPctText}>{count > 0 ? `${deckMastery}%` : '—'}</Text>
                      </View>

                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${count > 0 ? deckMastery : 0}%` }]} />
                      </View>

                      <Text style={styles.deckSubText}>
                        {count > 0 ? `${count} thẻ  •  ${due} cần ôn hôm nay` : 'Chưa có thẻ vựng'}
                      </Text>
                    </View>
                  </View>
                </React.Fragment>
              );
            })}
          </InsetGroup>
        )}

        {/* SRS Detailed Science Card */}
        <SectionTitle>NGUYÊN LÝ HỌC TẬP THÔNG MINH</SectionTitle>
        <View style={styles.algoCard}>
          <View style={styles.algoHeader}>
            <View style={styles.algoBadge}>
              <Ionicons name="sparkles" size={14} color={Colors.accent.indigoLight} />
              <Text style={styles.algoBadgeText}>THUẬT TOÁN SM-2</Text>
            </View>
            <Text style={styles.algoTitle}>Cách Anki giúp bạn ghi nhớ từ vựng vĩnh viễn</Text>
          </View>

          <View style={styles.algoStepList}>
            <View style={styles.algoStepItem}>
              <View style={styles.algoStepNumberBox}><Text style={styles.algoStepNumber}>1</Text></View>
              <View style={styles.algoStepContent}>
                <Text style={styles.algoStepTitle}>Ôn tập đúng ngưỡng chuẩn bị quên (Spaced Intervals)</Text>
                <Text style={styles.algoStepDesc}>
                  Thay vì học lặp lại liên tục, hệ thống tính toán chính xác mốc thời gian bộ não bắt đầu suy giảm trí nhớ (1 ngày ➔ 6 ngày ➔ 2 tuần ➔ 1 tháng) để nhắc bạn ôn đúng thời điểm vàng.
                </Text>
              </View>
            </View>

            <View style={styles.algoStepItem}>
              <View style={styles.algoStepNumberBox}><Text style={styles.algoStepNumber}>2</Text></View>
              <View style={styles.algoStepContent}>
                <Text style={styles.algoStepTitle}>Hệ số ghi nhớ cá nhân hóa (Ease Factor)</Text>
                <Text style={styles.algoStepDesc}>
                  Mỗi từ vựng có độ khó riêng. Từ nào bạn đánh giá "QUÊN" hoặc "KHÓ" sẽ tự động lặp lại thường xuyên hơn. Từ bạn chọn "THUỘC" sẽ kéo dài mốc ôn tập tiếp theo.
                </Text>
              </View>
            </View>

            <View style={styles.algoStepItem}>
              <View style={styles.algoStepNumberBox}><Text style={styles.algoStepNumber}>3</Text></View>
              <View style={styles.algoStepContent}>
                <Text style={styles.algoStepTitle}>Tiết kiệm 80% thời gian học tập</Text>
                <Text style={styles.algoStepDesc}>
                  Bằng cách tập trung ôn đúng những thẻ cần ôn mỗi ngày, bạn chuyển từ vựng từ bộ nhớ ngắn hạn sang trí nhớ dài hạn vĩnh viễn với nỗ lực tối thiểu.
                </Text>
              </View>
            </View>
          </View>
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

  header: { marginBottom: Spacing.lg },
  headerSubhead: {
    fontSize: Typography.text.caption1.fontSize,
    lineHeight: Typography.text.caption1.lineHeight,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.secondary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    letterSpacing: -0.3,
  },

  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radii.card,
    padding: Spacing.cellHorizontal,
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
  },

  insetCard: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radii.card,
    padding: Spacing.cellHorizontal,
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
    backgroundColor: Colors.accent.indigoDim,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
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
    borderRadius: 8,
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

  algoCard: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radii.card,
    padding: Spacing.cellHorizontal,
    marginTop: 4,
  },
  algoHeader: { marginBottom: Spacing.md },
  algoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.accent.indigoDim,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  algoBadgeText: {
    fontSize: Typography.text.caption2.fontSize,
    fontWeight: Typography.weight.bold,
    color: Colors.accent.indigoLight,
    letterSpacing: 0.5,
  },
  algoTitle: {
    fontSize: Typography.text.headline.fontSize,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
  },
  algoStepList: { gap: 14 },
  algoStepItem: { flexDirection: 'row', gap: 12 },
  algoStepNumberBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.bg.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  algoStepNumber: {
    fontSize: 12,
    fontWeight: Typography.weight.bold,
    color: Colors.accent.indigoLight,
  },
  algoStepContent: { flex: 1 },
  algoStepTitle: {
    fontSize: Typography.text.subhead.fontSize,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
    marginBottom: 2,
  },
  algoStepDesc: {
    fontSize: Typography.text.caption1.fontSize,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
});
