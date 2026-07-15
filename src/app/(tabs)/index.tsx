import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useAppStore } from '@/services/store';
import ProgressCircle from '@/components/ProgressCircle';
import { useHaptics } from '@/hooks/useHaptics';
import { supabase } from '@/services/supabase';
import { Flame, Plus, Play, RefreshCw, LogOut, WifiOff, Settings } from 'lucide-react-native';
import { AppColors } from '@/constants/colors';

export default function DashboardScreen() {
  const {
    profile,
    queue,
    totalInQueue,
    completedCount,
    online,
    isLoading,
    loadQueue,
    syncProgress,
  } = useAppStore();

  const { lightHaptic, successHaptic } = useHaptics();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Load queue on component mount
  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const handleRefresh = useCallback(async () => {
    lightHaptic();
    setIsRefreshing(true);
    try {
      await syncProgress();
      await loadQueue();
    } catch (e) {
      console.log('Dashboard refresh failed:', e);
    }
    setIsRefreshing(false);
  }, [lightHaptic, loadQueue, syncProgress]);

  const handleStartReview = () => {
    lightHaptic();
    if (queue.length > 0) {
      router.push('/flashcard');
    }
  };

  const handleAddWord = () => {
    lightHaptic();
    router.push('/add-word');
  };

  const handleSignOut = () => {
    Alert.alert('Đăng xuất?', 'Bạn sẽ cần đăng nhập lại để tiếp tục học trên thiết bị này.', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          lightHaptic();
          setIsSigningOut(true);
          try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
          } catch (error) {
            Alert.alert(
              'Không thể đăng xuất',
              error instanceof Error ? error.message : 'Vui lòng thử lại.',
            );
          } finally {
            setIsSigningOut(false);
          }
        },
      },
    ]);
  };

  const handleManualSync = async () => {
    lightHaptic();
    await syncProgress();
    successHaptic();
  };

  const handleGoToSettings = () => {
    lightHaptic();
    router.push('/settings' as any);
  };

  // Calculate stats
  const remainingCount = Math.max(0, totalInQueue - completedCount);
  // Show 0 progress if no words at all (new user), show full if all completed
  const progressRatio = totalInQueue === 0 ? 0 : completedCount / totalInQueue;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header bar */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Chào mừng,</Text>
          <Text style={styles.userName}>{profile?.display_name || 'Học viên'}</Text>
        </View>
        <View style={styles.headerButtons}>
          {!online && (
            <View style={styles.offlineBadge}>
              <WifiOff size={14} color="#FF9500" />
              <Text style={styles.offlineText}>Offline</Text>
            </View>
          )}
          {online && (
            <TouchableOpacity style={styles.iconButton} onPress={handleManualSync}>
              <RefreshCw size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.iconButton} onPress={handleGoToSettings}>
            <Settings size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleSignOut}
            disabled={isSigningOut}
          >
            {isSigningOut ? (
              <ActivityIndicator size="small" color={AppColors.error} />
            ) : (
              <LogOut size={20} color={AppColors.error} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Main card panel with pull-to-refresh scroll view wrapper */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#FF2D55"
            colors={['#FF2D55']}
          />
        }
      >
        <View style={styles.content}>
          {/* Streak Indicator */}
          <View style={styles.streakContainer}>
            <Flame size={32} color="#FF9500" fill="#FF9500" />
            <View>
              <Text style={styles.streakNumber}>{profile?.streak || 0} ngày</Text>
              <Text style={styles.streakLabel}>Chuỗi học tập liên tục (Streak)</Text>
            </View>
          </View>

          {/* Circular Progress Area */}
          <View style={styles.progressSection}>
            {isLoading ? (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#FF2D55" />
                <Text style={styles.loadingText}>Đang bốc thuốc từ vựng hôm nay...</Text>
              </View>
            ) : (
              <ProgressCircle
                progress={progressRatio}
                size={220}
                strokeWidth={16}
                label={totalInQueue > 0 ? `${completedCount}/${totalInQueue}` : 'Xong'}
                subLabel={totalInQueue > 0 ? 'Từ đã học' : 'Hoàn thành'}
              />
            )}
          </View>

          {/* Study summary */}
          {!isLoading && (
            <View style={styles.summaryContainer}>
              {remainingCount > 0 ? (
                <Text style={styles.summaryText}>
                  Hôm nay bạn cần học <Text style={styles.boldText}>{remainingCount}</Text> từ mới
                  và đến hạn ôn tập.
                </Text>
              ) : (
                <Text style={styles.summaryText}>
                  Chúc mừng! Bạn đã hoàn thành tất cả mục tiêu học tập của ngày hôm nay 🎉
                </Text>
              )}
            </View>
          )}

          {/* Action Controls */}
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={[styles.primaryButton, remainingCount === 0 && styles.disabledButton]}
              onPress={handleStartReview}
              disabled={remainingCount === 0 || isLoading}
            >
              <Play size={22} color="#FFFFFF" fill="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Bắt đầu ôn tập</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={handleAddWord}>
              <Plus size={22} color="#FF2D55" />
              <Text style={styles.secondaryButtonText}>Thêm từ nhanh bằng AI</Text>
            </TouchableOpacity>
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
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  welcomeText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 149, 0, 0.3)',
  },
  offlineText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF9500',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-evenly',
    paddingBottom: 20,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  streakNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FF9500',
  },
  streakLabel: {
    fontSize: 12,
    color: '#AEAEB2',
    fontWeight: '500',
    marginTop: 2,
  },
  progressSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  loaderContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#AEAEB2',
  },
  summaryContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  summaryText: {
    fontSize: 15,
    color: '#E5E5EA',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },
  boldText: {
    fontWeight: '800',
    color: '#FF2D55',
  },
  actionSection: {
    gap: 12,
    width: '100%',
  },
  primaryButton: {
    backgroundColor: '#FF2D55',
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#FF2D55',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  disabledButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 45, 85, 0.05)',
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#FF2D55',
  },
  secondaryButtonText: {
    color: '#FF2D55',
    fontSize: 16,
    fontWeight: '700',
  },
});
