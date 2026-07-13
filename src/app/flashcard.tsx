import React, { useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { useAppStore } from '../services/store';
import Flashcard3D from '../components/Flashcard3D';
import { ChevronLeft } from 'lucide-react-native';
import { useHaptics } from '../hooks/useHaptics';

export default function FlashcardScreen() {
  const {
    queue,
    currentIndex,
    totalInQueue,
    completedCount,
    submitReview,
  } = useAppStore();

  const { lightHaptic } = useHaptics();

  // If the queue is loaded but has 0 words, or all cards are completed, auto-route back
  useEffect(() => {
    if (totalInQueue > 0 && completedCount === totalInQueue) {
      const timer = setTimeout(() => {
        router.replace('/');
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [completedCount, totalInQueue]);

  const handleBack = () => {
    lightHaptic();
    router.replace('/');
  };

  const handleSwipeComplete = (grade: 'easy' | 'hard' | 'forgot') => {
    submitReview(grade);
  };

  // Determine current active item
  const currentItem = queue[currentIndex];

  // Calculate session percentage
  const progressPercent = totalInQueue > 0 ? (completedCount / totalInQueue) * 100 : 0;

  // Session complete view
  if (totalInQueue > 0 && completedCount === totalInQueue) {
    return (
      <SafeAreaView style={[styles.container, styles.centerAlign]}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.successEmoji}>🎉</Text>
        <Text style={styles.successTitle}>HOÀN THÀNH BÀI HỌC!</Text>
        <Text style={styles.successSubtitle}>
          Học tập bền bỉ là chìa khóa của thành công. Hẹn gặp lại bạn vào ngày mai!
        </Text>
      </SafeAreaView>
    );
  }

  // Empty queue warning on launch
  if (!currentItem) {
    return (
      <SafeAreaView style={[styles.container, styles.centerAlign]}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.successEmoji}>📚</Text>
        <Text style={styles.successTitle}>KHÔNG CÓ TỪ NÀO CẦN HỌC</Text>
        <Text style={styles.successSubtitle}>
          Danh sách ôn tập hôm nay đang trống. Hãy thêm từ vựng mới bằng AI để bắt đầu!
        </Text>
        <TouchableOpacity style={styles.backButtonCenter} onPress={handleBack}>
          <Text style={styles.backButtonTextCenter}>Quay lại Dashboard</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header with Back button */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <ChevronLeft size={24} color="#FFFFFF" />
          <Text style={styles.backText}>Dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.progressCounter}>
          {completedCount + 1} / {totalInQueue}
        </Text>
      </View>

      {/* Session Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
      </View>

      {/* Main interactive Flashcard panel */}
      <View style={styles.cardArea}>
        <Flashcard3D
          simplified={currentItem.vocabulary.simplified}
          traditional={currentItem.vocabulary.traditional}
          pinyin={currentItem.vocabulary.pinyin}
          han_viet={currentItem.vocabulary.han_viet}
          definition_vi={currentItem.vocabulary.definition_vi}
          audio_url={currentItem.vocabulary.audio_url}
          radicals_json={currentItem.vocabulary.radicals_json}
          onSwipeComplete={handleSwipeComplete}
        />
      </View>

      {/* Glass-styled guide labels */}
      <View style={styles.guideContainer}>
        <View style={[styles.guideIndicator, styles.guideForgot]}>
          <Text style={[styles.guideText, { color: '#FF453A' }]}>Quên (Vuốt trái)</Text>
        </View>
        <View style={[styles.guideIndicator, styles.guideHard]}>
          <Text style={[styles.guideText, { color: '#0A84FF' }]}>Khó (Vuốt lên)</Text>
        </View>
        <View style={[styles.guideIndicator, styles.guideEasy]}>
          <Text style={[styles.guideText, { color: '#30D158' }]}>Dễ (Vuốt phải)</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#120E2E', // Deep ambient dark violet background
  },
  centerAlign: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  progressCounter: {
    fontSize: 15,
    fontWeight: '700',
    color: '#8E8E93',
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 18,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FF2D55',
    borderRadius: 2,
  },
  cardArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 10,
  },
  guideContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingBottom: 24,
    paddingHorizontal: 18,
    gap: 8,
  },
  guideIndicator: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 16,
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
  },
  guideForgot: {
    backgroundColor: 'rgba(255, 69, 58, 0.12)',
    borderColor: 'rgba(255, 69, 58, 0.25)',
  },
  guideHard: {
    backgroundColor: 'rgba(10, 132, 255, 0.12)',
    borderColor: 'rgba(10, 132, 255, 0.25)',
  },
  guideEasy: {
    backgroundColor: 'rgba(48, 209, 88, 0.12)',
    borderColor: 'rgba(48, 209, 88, 0.25)',
  },
  guideText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  successEmoji: {
    fontSize: 72,
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  backButtonCenter: {
    marginTop: 24,
    backgroundColor: '#FF2D55',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  backButtonTextCenter: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
