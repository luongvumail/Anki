import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { ChevronLeft, Flame, Award, Calendar } from 'lucide-react-native';
import { useHaptics } from '@/hooks/useHaptics';
import { useAppStore } from '@/services/store';
import { localProgress } from '@/services/sqlite';

interface StatsData {
  totalVocab: number;
  totalProgress: number;
  learningCount: number;
  reviewingCount: number;
  masteredCount: number;
  history: { study_date: string; count: number }[];
}

export default function StatisticsScreen() {
  const { profile } = useAppStore();
  const { lightHaptic } = useHaptics();
  const [stats, setStats] = useState<StatsData>({
    totalVocab: 0,
    totalProgress: 0,
    learningCount: 0,
    reviewingCount: 0,
    masteredCount: 0,
    history: [],
  });

  const loadStats = () => {
    try {
      const data = localProgress.getStats();

      let learning = 0;
      let reviewing = 0;
      let mastered = 0;

      data.statusCounts.forEach((c) => {
        if (c.status === 'learning') learning = c.count;
        if (c.status === 'reviewing') reviewing = c.count;
        if (c.status === 'mastered') mastered = c.count;
      });

      setStats({
        totalVocab: data.totalVocab,
        totalProgress: data.totalProgress,
        learningCount: learning,
        reviewingCount: reviewing,
        masteredCount: mastered,
        history: data.history || [],
      });
    } catch (e) {
      console.error('Failed to load stats:', e);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleBack = () => {
    lightHaptic();
    router.back();
  };

  const getRecentDays = () => {
    const days = [];
    const msInDay = 24 * 60 * 60 * 1000;
    const now = Date.now();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now - i * msInDay);
      const isoDate = date.toISOString().split('T')[0];
      const historyItem = stats.history.find((h) => h.study_date === isoDate);

      days.push({
        label: date.toLocaleDateString('vi-VN', { weekday: 'short' }),
        dateString: isoDate,
        count: historyItem ? historyItem.count : 0,
      });
    }
    return days;
  };

  const maxHistoryCount = Math.max(...stats.history.map((h) => h.count), 1);
  const recentDays = getRecentDays();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <ChevronLeft size={22} color="#FFFFFF" />
          <Text style={styles.backText}>Dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Thống kê học tập
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        {/* Streak & Rank Banner */}
        <View style={styles.bannerCard}>
          <View style={styles.bannerItem}>
            <Flame size={32} color="#FF9500" fill="#FF9500" />
            <Text style={styles.bannerVal}>{profile?.streak || 0} ngày</Text>
            <Text style={styles.bannerLabel}>Streak hiện tại</Text>
          </View>
          <View style={styles.bannerDivider} />
          <View style={styles.bannerItem}>
            <Award size={32} color="#FFD60A" fill="#FFD60A" />
            <Text style={styles.bannerVal}>
              {stats.masteredCount >= 50
                ? 'Thượng Thừa'
                : stats.masteredCount >= 20
                  ? 'Thành Thạo'
                  : 'Sơ Cấp'}
            </Text>
            <Text style={styles.bannerLabel}>Danh hiệu học tập</Text>
          </View>
        </View>

        {/* Breakdown Stats */}
        <Text style={styles.sectionTitle}>Trạng thái học tập</Text>

        <View style={styles.grid}>
          <View style={[styles.gridCard, { borderColor: 'rgba(255, 255, 255, 0.1)' }]}>
            <Text style={styles.gridVal}>{stats.totalVocab}</Text>
            <Text style={styles.gridLabel}>Tổng số từ vựng</Text>
          </View>

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
        </View>

        {/* Progress Progress Bars */}
        <View style={styles.progressBarsCard}>
          <Text style={styles.progressBarTitle}>Tiến độ ôn tập học tập</Text>

          <View style={styles.barWrapper}>
            <View style={styles.barLabelRow}>
              <Text style={styles.barLabel}>Đã thuộc bài học (Mastered)</Text>
              <Text style={styles.barVal}>
                {stats.totalVocab > 0
                  ? Math.round((stats.masteredCount / stats.totalVocab) * 100)
                  : 0}
                %
              </Text>
            </View>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    backgroundColor: '#30D158',
                    width: `${stats.totalVocab > 0 ? (stats.masteredCount / stats.totalVocab) * 100 : 0}%`,
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.barWrapper}>
            <View style={styles.barLabelRow}>
              <Text style={styles.barLabel}>Đang ôn tập (Reviewing)</Text>
              <Text style={styles.barVal}>
                {stats.totalVocab > 0
                  ? Math.round((stats.reviewingCount / stats.totalVocab) * 100)
                  : 0}
                %
              </Text>
            </View>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    backgroundColor: '#0A84FF',
                    width: `${stats.totalVocab > 0 ? (stats.reviewingCount / stats.totalVocab) * 100 : 0}%`,
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Activity Chart */}
        <Text style={styles.sectionTitle}>Lịch sử học tập (7 ngày qua)</Text>

        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Calendar size={18} color="#AEAEB2" />
            <Text style={styles.chartTitle}>Số lượng từ cập nhật/học tập</Text>
          </View>

          <View style={styles.chartBody}>
            {recentDays.map((d, index) => {
              // Calculate bar height ratio
              const barHeightRatio = d.count / maxHistoryCount;
              const barPercent = Math.max(barHeightRatio * 100, 5); // Minimum height to make it visible

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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#120E2E',
  },
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
  backButton: {
    width: 88,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSpacer: {
    width: 88,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 20,
  },
  bannerCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 18,
  },
  bannerItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  bannerVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  bannerLabel: {
    fontSize: 11,
    color: '#AEAEB2',
    fontWeight: '600',
  },
  bannerDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: -8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridCard: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    gap: 6,
  },
  gridVal: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  gridLabel: {
    fontSize: 12,
    color: '#AEAEB2',
    fontWeight: '600',
  },
  progressBarsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 18,
    gap: 14,
  },
  progressBarTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  barWrapper: {
    gap: 6,
  },
  barLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  barLabel: {
    fontSize: 12,
    color: '#AEAEB2',
    fontWeight: '600',
  },
  barVal: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  barTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  chartCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 18,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 18,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  chartBody: {
    flexDirection: 'row',
    height: 140,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  chartCol: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    height: '100%',
    justifyContent: 'flex-end',
  },
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
  chartBar: {
    width: '100%',
    borderRadius: 6,
  },
  chartColLabel: {
    fontSize: 10,
    color: '#AEAEB2',
    fontWeight: '600',
  },
});
