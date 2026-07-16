import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TextInput,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { ChevronLeft, Flame, Calendar, Search } from 'lucide-react-native';
import { useHaptics } from '@/hooks/useHaptics';
import { useAppStore } from '@/services/store';
import { localProgress, localVocab } from '@/services/sqlite';
import ProgressCircle from '@/components/ProgressCircle';

interface StatsData {
  totalVocab: number;
  learningCount: number;
  reviewingCount: number;
  masteredCount: number;
  dueToday: number;
  overdue: number;
  reviewedToday: number;
  history7: { study_date: string; count: number }[];
  history30: { study_date: string; count: number }[];
}

interface VocabWithProgress {
  id: string;
  simplified: string;
  pinyin: string;
  han_viet: string;
  definition_vi: string;
  status: string | null;
  repetitions: number | null;
  next_review_at: string | null;
}

type StatusFilter = 'all' | 'learning' | 'reviewing' | 'mastered';
type ChartRange = 7 | 30;

export default function StatisticsScreen() {
  const { profile } = useAppStore();
  const { lightHaptic } = useHaptics();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [chartRange, setChartRange] = useState<ChartRange>(7);
  const [allVocab, setAllVocab] = useState<VocabWithProgress[]>([]);
  const [stats, setStats] = useState<StatsData>({
    totalVocab: 0,
    learningCount: 0,
    reviewingCount: 0,
    masteredCount: 0,
    dueToday: 0,
    overdue: 0,
    reviewedToday: 0,
    history7: [],
    history30: [],
  });

  const loadStats = useCallback(() => {
    try {
      const data = localProgress.getStats();
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const endOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999,
      ).toISOString();
      const todayDate = now.toISOString().split('T')[0];

      let learning = 0;
      let reviewing = 0;
      let mastered = 0;
      data.statusCounts.forEach((c) => {
        if (c.status === 'learning') learning = c.count;
        if (c.status === 'reviewing') reviewing = c.count;
        if (c.status === 'mastered') mastered = c.count;
      });

      const dueToday = localProgress.getDueTodayCount(endOfToday);
      const overdue = localProgress.getOverdueCount(startOfToday);
      const reviewedToday = localProgress.getTodayReviewCount(todayDate);
      const history30 = localProgress.getHistory30Days();
      const history7 = history30.slice(0, 7);

      setStats({
        totalVocab: data.totalVocab,
        learningCount: learning,
        reviewingCount: reviewing,
        masteredCount: mastered,
        dueToday,
        overdue,
        reviewedToday,
        history7,
        history30,
      });

      // Load vocab list for SRS history section
      const vocabList = localVocab.getAllWithProgress() as VocabWithProgress[];
      setAllVocab(vocabList);
    } catch (e) {
      console.error('Failed to load stats:', e);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadStats();
    setRefreshing(false);
  }, [loadStats]);

  const handleBack = () => {
    lightHaptic();
    router.back();
  };

  // Filtered vocab list
  const filteredVocab = allVocab.filter((v) => {
    // Status filter
    if (statusFilter !== 'all' && v.status !== statusFilter) return false;
    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      return (
        v.simplified.toLowerCase().includes(q) ||
        v.pinyin.toLowerCase().includes(q) ||
        v.han_viet.toLowerCase().includes(q) ||
        v.definition_vi.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Chart helpers
  const historyData = chartRange === 7 ? stats.history7 : stats.history30;
  const maxCount = Math.max(...historyData.map((h) => h.count), 1);

  const getRecentDays = (range: ChartRange) => {
    const days: { label: string; dateString: string; count: number }[] = [];
    const msInDay = 24 * 60 * 60 * 1000;
    const now = Date.now();
    for (let i = range - 1; i >= 0; i--) {
      const date = new Date(now - i * msInDay);
      const isoDate = date.toISOString().split('T')[0];
      const historyItem = historyData.find((h) => h.study_date === isoDate);
      days.push({
        label: date.toLocaleDateString('vi-VN', { weekday: 'short' }),
        dateString: isoDate,
        count: historyItem ? historyItem.count : 0,
      });
    }
    return days;
  };

  const chartDays = getRecentDays(chartRange);
  const completionPct =
    stats.dueToday > 0
      ? Math.min(100, Math.round((stats.reviewedToday / stats.dueToday) * 100))
      : stats.reviewedToday > 0
        ? 100
        : 0;

  // Format date for display
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case 'learning':
        return 'Đang học';
      case 'reviewing':
        return 'Ôn tập';
      case 'mastered':
        return 'Đã thuộc';
      default:
        return 'Chưa học';
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'learning':
        return '#FFD60A';
      case 'reviewing':
        return '#0A84FF';
      case 'mastered':
        return '#30D158';
      default:
        return '#8E8E93';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <ChevronLeft size={22} color="#FFFFFF" />
          <Text style={styles.backText}>Dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thống kê học tập</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF2D55" />
        }
      >
        {/* Section 1: Streak + Tổng quan */}
        <View style={styles.streakCard}>
          <View style={styles.streakRow}>
            <Flame size={28} color="#FF9500" fill="#FF9500" />
            <Text style={styles.streakValue}>{profile?.streak || 0}</Text>
            <Text style={styles.streakLabel}>ngày liên tiếp</Text>
          </View>
        </View>

        <View style={styles.grid}>
          <View style={[styles.gridCard, { borderColor: 'rgba(255, 214, 10, 0.25)' }]}>
            <Text style={[styles.gridVal, { color: '#FFD60A' }]}>{stats.learningCount}</Text>
            <Text style={styles.gridLabel}>Đang học</Text>
          </View>
          <View style={[styles.gridCard, { borderColor: 'rgba(10, 132, 255, 0.25)' }]}>
            <Text style={[styles.gridVal, { color: '#0A84FF' }]}>{stats.reviewingCount}</Text>
            <Text style={styles.gridLabel}>Ôn tập</Text>
          </View>
          <View style={[styles.gridCard, { borderColor: 'rgba(48, 209, 88, 0.25)' }]}>
            <Text style={[styles.gridVal, { color: '#30D158' }]}>{stats.masteredCount}</Text>
            <Text style={styles.gridLabel}>Đã thuộc</Text>
          </View>
          <View style={[styles.gridCard, { borderColor: 'rgba(255, 255, 255, 0.1)' }]}>
            <Text style={styles.gridVal}>{stats.totalVocab}</Text>
            <Text style={styles.gridLabel}>Tổng số từ</Text>
          </View>
        </View>

        {/* Section 2: Mục tiêu hôm nay */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Mục tiêu hôm nay</Text>

          <View style={styles.goalRow}>
            <View style={styles.goalCircleContainer}>
              <ProgressCircle
                progress={completionPct / 100}
                size={100}
                strokeWidth={8}
                color="#FF2D55"
                trackColor="rgba(255, 255, 255, 0.08)"
              />
              <View style={styles.goalCircleCenter}>
                <Text style={styles.goalCirclePct}>{completionPct}%</Text>
              </View>
            </View>

            <View style={styles.goalDetails}>
              <View style={styles.goalDetailRow}>
                <View style={[styles.goalDot, { backgroundColor: '#FF2D55' }]} />
                <Text style={styles.goalDetailText}>
                  Cần ôn: <Text style={styles.goalDetailBold}>{stats.dueToday} từ</Text>
                </Text>
              </View>
              <View style={styles.goalDetailRow}>
                <View style={[styles.goalDot, { backgroundColor: '#30D158' }]} />
                <Text style={styles.goalDetailText}>
                  Đã ôn: <Text style={styles.goalDetailBold}>{stats.reviewedToday} từ</Text>
                </Text>
              </View>
              {stats.overdue > 0 && (
                <View style={styles.goalDetailRow}>
                  <View style={[styles.goalDot, { backgroundColor: '#FF453A' }]} />
                  <Text style={styles.goalDetailText}>
                    Quá hạn:{' '}
                    <Text style={[styles.goalDetailBold, { color: '#FF453A' }]}>
                      {stats.overdue} từ
                    </Text>
                  </Text>
                </View>
              )}
            </View>
          </View>

          {stats.dueToday === 0 && stats.reviewedToday === 0 && (
            <Text style={styles.goalEmptyText}>Hôm nay không có từ cần ôn 🎉</Text>
          )}
          {stats.dueToday === 0 && stats.reviewedToday > 0 && (
            <Text style={styles.goalEmptyText}>Đã ôn tập xong tất cả từ vựng hôm nay! 🎉</Text>
          )}
        </View>

        {/* Section 3: Biểu đồ ôn tập */}
        <View style={styles.sectionCard}>
          <View style={styles.chartHeaderRow}>
            <View style={styles.chartTitleRow}>
              <Calendar size={18} color="#AEAEB2" />
              <Text style={styles.sectionTitle}>Lịch sử ôn tập</Text>
            </View>
            <View style={styles.chartToggle}>
              <TouchableOpacity
                style={[styles.chartToggleBtn, chartRange === 7 && styles.chartToggleActive]}
                onPress={() => {
                  lightHaptic();
                  setChartRange(7);
                }}
              >
                <Text
                  style={[styles.chartToggleText, chartRange === 7 && styles.chartToggleTextActive]}
                >
                  7 ngày
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chartToggleBtn, chartRange === 30 && styles.chartToggleActive]}
                onPress={() => {
                  lightHaptic();
                  setChartRange(30);
                }}
              >
                <Text
                  style={[
                    styles.chartToggleText,
                    chartRange === 30 && styles.chartToggleTextActive,
                  ]}
                >
                  30 ngày
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.chartBody}>
            {chartDays.map((d, index) => {
              const barHeightRatio = maxCount > 0 ? d.count / maxCount : 0;
              const barPercent = Math.max(barHeightRatio * 100, 4);
              return (
                <View key={index} style={styles.chartCol}>
                  <View style={styles.barContainer}>
                    {d.count > 0 && <Text style={styles.barCountLabel}>{d.count}</Text>}
                    <View
                      style={[
                        styles.chartBar,
                        {
                          height: `${barPercent}%`,
                          backgroundColor: d.count > 0 ? '#FF2D55' : 'rgba(255, 255, 255, 0.08)',
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.chartColLabel}>{d.label}</Text>
                </View>
              );
            })}
          </View>
          {chartDays.every((d) => d.count === 0) && (
            <Text style={styles.chartEmptyText}>Chưa có dữ liệu ôn tập</Text>
          )}
        </View>

        {/* Section 4: Lịch sử SRS chi tiết */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Lịch sử SRS chi tiết</Text>

          {/* Search */}
          <View style={styles.searchContainer}>
            <Search size={16} color="#8E8E93" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm từ..."
              placeholderTextColor="#6E6E73"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Filter chips */}
          <View style={styles.filterRow}>
            {(['all', 'learning', 'reviewing', 'mastered'] as StatusFilter[]).map((f) => {
              const labels: Record<StatusFilter, string> = {
                all: 'Tất cả',
                learning: 'Đang học',
                reviewing: 'Ôn tập',
                mastered: 'Đã thuộc',
              };
              return (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterChip, statusFilter === f && styles.filterChipActive]}
                  onPress={() => {
                    lightHaptic();
                    setStatusFilter(f);
                  }}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      statusFilter === f && styles.filterChipTextActive,
                    ]}
                  >
                    {labels[f]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* List */}
          {filteredVocab.length === 0 ? (
            <Text style={styles.emptyText}>
              {searchQuery.trim() ? 'Không tìm thấy từ phù hợp' : 'Chưa có từ vựng nào'}
            </Text>
          ) : (
            <View style={styles.srsList}>
              <View style={styles.srsListHeader}>
                <Text style={[styles.srsHeaderCell, { flex: 2 }]}>Từ</Text>
                <Text style={[styles.srsHeaderCell, { flex: 1 }]}>Trạng thái</Text>
                <Text style={[styles.srsHeaderCell, { flex: 1 }]}>Lần nhắc</Text>
                <Text style={[styles.srsHeaderCell, { flex: 1.2 }]}>Ôn tiếp</Text>
              </View>
              {filteredVocab.map((v) => (
                <View key={v.id} style={styles.srsRow}>
                  <View style={{ flex: 2 }}>
                    <Text style={styles.srsWord}>{v.simplified}</Text>
                    <Text style={styles.srsPinyin}>{v.pinyin}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.srsStatus, { color: getStatusColor(v.status) }]}>
                      {getStatusLabel(v.status)}
                    </Text>
                  </View>
                  <Text style={[styles.srsCell, { flex: 1 }]}>{v.repetitions ?? 0}</Text>
                  <Text style={[styles.srsCell, { flex: 1.2 }]}>
                    {formatDate(v.next_review_at)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#120E2E' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: '#120E2E',
  },
  backButton: { width: 88, flexDirection: 'row', alignItems: 'center' },
  backText: { fontSize: 13, color: '#FFFFFF', fontWeight: '600' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  headerSpacer: { width: 88 },
  scrollContainer: { flex: 1 },
  scrollContent: { padding: 16, gap: 16, paddingBottom: 40 },
  // Streak
  streakCard: {
    backgroundColor: 'rgba(255, 149, 0, 0.08)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 149, 0, 0.2)',
    padding: 18,
    alignItems: 'center',
  },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  streakValue: { fontSize: 32, fontWeight: '900', color: '#FF9500' },
  streakLabel: { fontSize: 15, fontWeight: '600', color: '#FF9500' },
  // Grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridCard: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    gap: 6,
  },
  gridVal: { fontSize: 26, fontWeight: '800', color: '#FFFFFF' },
  gridLabel: { fontSize: 12, color: '#AEAEB2', fontWeight: '600' },
  // Section card
  sectionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 18,
    gap: 14,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  // Goal section
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  goalCircleContainer: { width: 100, height: 100, justifyContent: 'center', alignItems: 'center' },
  goalCircleCenter: { position: 'absolute', justifyContent: 'center', alignItems: 'center' },
  goalCirclePct: { fontSize: 22, fontWeight: '900', color: '#FFFFFF' },
  goalDetails: { flex: 1, gap: 12 },
  goalDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  goalDot: { width: 10, height: 10, borderRadius: 5 },
  goalDetailText: { fontSize: 14, color: '#AEAEB2', fontWeight: '500' },
  goalDetailBold: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  goalEmptyText: {
    fontSize: 14,
    color: '#AEAEB2',
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 8,
  },
  // Chart
  chartHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chartTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chartToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 8,
    padding: 2,
  },
  chartToggleBtn: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6 },
  chartToggleActive: { backgroundColor: '#FF2D55' },
  chartToggleText: { fontSize: 12, fontWeight: '600', color: '#8E8E93' },
  chartToggleTextActive: { color: '#FFFFFF' },
  chartBody: {
    flexDirection: 'row',
    height: 140,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  chartCol: { flex: 1, alignItems: 'center', gap: 8, height: '100%', justifyContent: 'flex-end' },
  barContainer: {
    width: 22,
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    position: 'relative',
  },
  barCountLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    position: 'absolute',
    top: -16,
  },
  chartBar: { width: '100%', borderRadius: 6 },
  chartColLabel: { fontSize: 10, color: '#AEAEB2', fontWeight: '600' },
  chartEmptyText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 8,
  },
  // Search + filter
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
  },
  searchIcon: { marginRight: 6 },
  searchInput: { flex: 1, fontSize: 13, color: '#FFFFFF' },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  filterChipActive: { backgroundColor: '#FF2D55' },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#8E8E93' },
  filterChipTextActive: { color: '#FFFFFF' },
  emptyText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 20,
  },
  // SRS list
  srsList: { gap: 0 },
  srsListHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  srsHeaderCell: { fontSize: 11, fontWeight: '700', color: '#8E8E93', textTransform: 'uppercase' },
  srsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  srsWord: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  srsPinyin: { fontSize: 11, color: '#FFD60A', fontWeight: '500', marginTop: 1 },
  srsStatus: { fontSize: 12, fontWeight: '700' },
  srsCell: { fontSize: 13, fontWeight: '600', color: '#AEAEB2' },
});
