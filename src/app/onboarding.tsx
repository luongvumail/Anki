import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Sparkles, Brain, Notebook, ChevronRight } from 'lucide-react-native';
import { useHaptics } from '../hooks/useHaptics';

const ONBOARDING_COMPLETED_KEY = '@anki_onboarding_completed';

interface OnboardingSlide {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

export default function OnboardingScreen({ onComplete }: { onComplete?: () => void }) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const { lightHaptic, successHaptic } = useHaptics();

  const slides: OnboardingSlide[] = [
    {
      title: 'Sổ tay từ vựng của bạn',
      description:
        'Lưu trữ và theo dõi các từ tiếng Trung bạn tự thêm trong quá trình đọc sách, xem phim, hoặc học trên lớp.',
      icon: <Notebook size={80} color="#FFFFFF" />,
      color: '#FF2D55', // Cherry Pink
    },
    {
      title: 'Tự động tra cứu bằng AI',
      description:
        'Chỉ cần nhập chữ Hán, AI của ứng dụng sẽ tự tra cứu bộ thủ, phiên âm bính âm, Hán Việt, định nghĩa và đặt câu ví dụ.',
      icon: <Sparkles size={80} color="#FFFFFF" fill="#FFFFFF" />,
      color: '#FFD60A', // Gold
    },
    {
      title: 'Thuật toán SRS thông minh',
      description:
        'Hệ thống lặp lại ngắt quãng (SM-2) tự động tính toán lịch ôn tập tối ưu để bạn ghi nhớ từ vựng lâu nhất với ít nỗ lực nhất.',
      icon: <Brain size={80} color="#FFFFFF" />,
      color: '#0A84FF', // Electric Blue
    },
  ];

  const handleNext = async () => {
    lightHaptic();
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    } else {
      await finishOnboarding();
    }
  };

  const handleSkip = async () => {
    lightHaptic();
    await finishOnboarding();
  };

  const finishOnboarding = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
      successHaptic();
      if (onComplete) {
        onComplete();
      }
    } catch (e) {
      console.error('Failed to save onboarding completion state:', e);
    }
  };

  const activeSlide = slides[currentSlideIndex];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Skip Button */}
      <View style={styles.header}>
        {currentSlideIndex < slides.length - 1 ? (
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Bỏ qua</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.skipPlaceholder} />
        )}
      </View>

      {/* Slide Content */}
      <View style={styles.slideContainer}>
        <View style={[styles.iconWrapper, { backgroundColor: activeSlide.color }]}>
          {activeSlide.icon}
        </View>

        <Text style={styles.title}>{activeSlide.title}</Text>
        <Text style={styles.description}>{activeSlide.description}</Text>
      </View>

      {/* Navigation Footer */}
      <View style={styles.footer}>
        {/* Pagination Dots */}
        <View style={styles.dotsRow}>
          {slides.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.dot,
                idx === currentSlideIndex ? styles.activeDot : null,
                idx === currentSlideIndex && { backgroundColor: activeSlide.color },
              ]}
            />
          ))}
        </View>

        {/* Primary CTA Button */}
        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor: activeSlide.color }]}
          onPress={handleNext}
        >
          <Text style={styles.nextButtonText}>
            {currentSlideIndex === slides.length - 1 ? 'Bắt đầu ngay' : 'Tiếp tục'}
          </Text>
          <ChevronRight size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#120E2E',
    justifyContent: 'space-between',
  },
  header: {
    height: 50,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  skipButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  skipText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '600',
  },
  skipPlaceholder: {
    height: 1,
  },
  slideContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 28,
  },
  iconWrapper: {
    width: 150,
    height: 150,
    borderRadius: 75,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#AEAEB2',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 30,
    paddingBottom: 40,
    gap: 30,
    alignItems: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  activeDot: {
    width: 24,
  },
  nextButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    height: 52,
    width: '100%',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
