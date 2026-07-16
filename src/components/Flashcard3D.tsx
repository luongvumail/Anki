import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { Volume2, HelpCircle } from 'lucide-react-native';
import { useAudio } from '../hooks/useAudio';
import { useHaptics } from '../hooks/useHaptics';
import { getToneColor } from '../utils/srs';

export interface RadicalInfo {
  character: string;
  pinyin: string;
  vietnamese_name: string;
  stroke_count: number;
}

interface Flashcard3DProps {
  simplified: string;
  traditional?: string | null;
  pinyin: string;
  han_viet: string;
  definition_vi: string;
  audio_url?: string | null;
  radicals_json?: string | null; // Cached JSON list of radicals
  example_zh?: string | null;
  example_pinyin?: string | null;
  example_vi?: string | null;
  onSwipeComplete: (grade: 'easy' | 'hard' | 'forgot') => void;
}

export default function Flashcard3D({
  simplified,
  traditional,
  pinyin,
  han_viet,
  definition_vi,
  audio_url,
  radicals_json,
  example_zh,
  example_pinyin,
  example_vi,
  onSwipeComplete,
}: Flashcard3DProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const swipeThreshold = screenWidth * 0.35;

  const [isFlipped, setIsFlipped] = useState(false);
  const [showRadicals, setShowRadicals] = useState(false);

  const { playAudio } = useAudio();
  const { lightHaptic, warningHaptic, successHaptic } = useHaptics();

  // Animation values
  const rotateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // Parse radicals list from JSON string with error handling to avoid crashes
  let radicals: RadicalInfo[] = [];
  if (radicals_json) {
    try {
      radicals = JSON.parse(radicals_json);
    } catch (e) {
      console.error('Failed to parse radicals JSON:', e);
    }
  }

  // Reset card state when content changes
  useEffect(() => {
    setIsFlipped(false);
    setShowRadicals(false);
    rotateY.value = 0;
    translateX.value = 0;
    translateY.value = 0;
  }, [simplified, rotateY, translateX, translateY]);

  // Handle Flip action
  const flipCard = () => {
    lightHaptic();
    const toValue = isFlipped ? 0 : 180;
    rotateY.value = withTiming(toValue, { duration: 550 });
    setIsFlipped(!isFlipped);

    // Auto play audio on flip to back (always — TTS fallback if no audio_url)
    if (!isFlipped) {
      playAudio(audio_url ?? undefined, simplified);
    }
  };

  // Drag Gesture — swipe to submit grade immediately (no need to flip first)
  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .activeOffsetY([-10, 10])
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      if (event.translationX > swipeThreshold) {
        // Swipe Right: Easy
        runOnJS(successHaptic)();
        translateX.value = withTiming(screenWidth * 1.5, { duration: 420 }, () => {
          runOnJS(onSwipeComplete)('easy');
        });
      } else if (event.translationX < -swipeThreshold) {
        // Swipe Left: Forgot
        runOnJS(warningHaptic)();
        translateX.value = withTiming(-screenWidth * 1.5, { duration: 420 }, () => {
          runOnJS(onSwipeComplete)('forgot');
        });
      } else if (event.translationY < -swipeThreshold) {
        // Swipe Up: Hard
        runOnJS(lightHaptic)();
        translateY.value = withTiming(-screenHeight * 1.5, { duration: 420 }, () => {
          runOnJS(onSwipeComplete)('hard');
        });
      } else {
        // Reset card positioning
        translateX.value = withSpring(0, { damping: 20, stiffness: 120 });
        translateY.value = withSpring(0, { damping: 20, stiffness: 120 });
      }
    });

  // Tap Gesture to flip (Only triggers if not dragging)
  const audioTapGesture = Gesture.Tap().onEnd(() => {
    if (audio_url) {
      runOnJS(playAudio)(audio_url, simplified);
    }
  });

  const tapGesture = Gesture.Tap()
    .requireExternalGestureToFail(audioTapGesture)
    .onEnd(() => {
      runOnJS(flipCard)();
    });

  const composedGesture = Gesture.Exclusive(panGesture, tapGesture);

  // Card transform styles
  const cardAnimatedStyle = useAnimatedStyle(() => {
    const rotate = interpolate(translateX.value, [-screenWidth, screenWidth], [-6, 6]);
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  const frontStyle = useAnimatedStyle(() => {
    const rot = interpolate(rotateY.value, [0, 180], [0, 180]);
    return {
      transform: [{ perspective: 1000 }, { rotateY: `${rot}deg` }],
      opacity: rotateY.value > 90 ? 0 : 1,
      zIndex: rotateY.value > 90 ? 0 : 1,
    };
  });

  const backStyle = useAnimatedStyle(() => {
    const rot = interpolate(rotateY.value, [0, 180], [180, 360]);
    return {
      transform: [{ perspective: 1000 }, { rotateY: `${rot}deg` }],
      opacity: rotateY.value > 90 ? 1 : 0,
      zIndex: rotateY.value > 90 ? 1 : 0,
    };
  });

  // Swipe Action Label Overlays
  const easyOverlayStyle = useAnimatedStyle(() => {
    const opacity = interpolate(translateX.value, [0, swipeThreshold], [0, 1], 'clamp');
    return { opacity };
  });

  const forgotOverlayStyle = useAnimatedStyle(() => {
    const opacity = interpolate(translateX.value, [-swipeThreshold, 0], [1, 0], 'clamp');
    return { opacity };
  });

  const hardOverlayStyle = useAnimatedStyle(() => {
    const opacity = interpolate(translateY.value, [-swipeThreshold, 0], [1, 0], 'clamp');
    return { opacity };
  });

  // Parse and color-code Pinyin
  const renderPinyin = () => {
    return (
      <View style={styles.pinyinWrapper}>
        {pinyin.split(' ').map((syllable, idx) => {
          const color = getToneColor(syllable);
          return (
            <Text key={idx} style={[styles.pinyinWord, { color }]}>
              {syllable}
            </Text>
          );
        })}
      </View>
    );
  };

  return (
    <View style={[styles.container, { width: screenWidth * 0.9, height: screenHeight * 0.58 }]}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.cardContainer, cardAnimatedStyle]}>
          {/* FRONT SIDE */}
          <Animated.View style={[styles.card, styles.frontCard, frontStyle]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardInfoTag}>Hôm nay | Bài học</Text>
              {traditional && (
                <View style={styles.traditionalContainer}>
                  <Text style={styles.traditionalLabel}>Phồn thể</Text>
                  <Text style={styles.traditionalText}>{traditional}</Text>
                </View>
              )}
            </View>

            <View style={styles.centerSection}>
              <Text style={styles.simplifiedText}>{simplified}</Text>
            </View>

            {/* Radical Hint */}
            <View style={styles.bottomSection}>
              {radicals.length > 0 && (
                <View style={styles.radicalHintWrapper}>
                  {!showRadicals ? (
                    <TouchableOpacity
                      style={styles.hintButton}
                      activeOpacity={0.7}
                      onPress={() => {
                        lightHaptic();
                        setShowRadicals(true);
                      }}
                    >
                      <HelpCircle size={16} color="#AEAEB2" />
                      <Text style={styles.hintButtonText}>Gợi ý lý thuyết bộ thủ</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.radicalsBox}>
                      <Text style={styles.radicalsTitle}>Bộ thủ cấu thành:</Text>
                      <View style={styles.radicalsList}>
                        {radicals.map((rad, idx) => (
                          <View key={idx} style={styles.radicalItem}>
                            <Text style={styles.radicalChar}>{rad.character}</Text>
                            <Text style={styles.radicalText}>
                              {rad.pinyin} ({rad.vietnamese_name})
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              )}
              <Text style={styles.tapText}>Chạm để lật thẻ</Text>
            </View>
          </Animated.View>

          {/* BACK SIDE */}
          <Animated.View style={[styles.card, styles.backCard, backStyle]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardInfoTag}>Hôm nay | Giải nghĩa</Text>
            </View>

            <View style={styles.backCenterSection}>
              {/* Center Chinese Character */}
              <Text style={styles.backHanzi}>{simplified}</Text>

              {/* Pinyin syllable row + inline audio speaker icon */}
              <View style={styles.pinyinRow}>
                {renderPinyin()}
                {audio_url && (
                  <GestureDetector gesture={audioTapGesture}>
                    <Animated.View style={styles.soundButtonInline}>
                      <Volume2 size={22} color="#FFD60A" />
                    </Animated.View>
                  </GestureDetector>
                )}
              </View>

              {/* Purely Vietnamese meaning below it */}
              <Text style={styles.backDefinition}>{definition_vi}</Text>

              {/* Example sentences */}
              {example_zh && (
                <View style={styles.backExampleContainer}>
                  <Text style={styles.backExampleZh}>{example_zh}</Text>
                  {example_pinyin && <Text style={styles.backExamplePinyin}>{example_pinyin}</Text>}
                  {example_vi && <Text style={styles.backExampleVi}>{example_vi}</Text>}
                </View>
              )}
            </View>

            <Text style={styles.tapTextBack}>← Quên | Khó ↑ | Dễ →</Text>
          </Animated.View>

          {/* Swipe Indicator Overlays */}
          <Animated.View
            pointerEvents="none"
            style={[styles.overlay, styles.easyOverlay, easyOverlayStyle]}
          >
            <Text style={styles.overlayTextEasy}>DỄ</Text>
          </Animated.View>

          <Animated.View
            pointerEvents="none"
            style={[styles.overlay, styles.forgotOverlay, forgotOverlayStyle]}
          >
            <Text style={styles.overlayTextForgot}>QUÊN</Text>
          </Animated.View>

          <Animated.View
            pointerEvents="none"
            style={[styles.overlay, styles.hardOverlay, hardOverlayStyle]}
          >
            <Text style={styles.overlayTextHard}>KHÓ</Text>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  card: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    padding: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  frontCard: {
    alignItems: 'center',
  },
  backCard: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  cardHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardInfoTag: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  traditionalContainer: {
    alignItems: 'flex-end',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  traditionalLabel: {
    fontSize: 8,
    color: '#8E8E93',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  traditionalText: {
    fontSize: 16,
    color: '#AEAEB2',
    fontWeight: 'bold',
    marginTop: 1,
  },
  centerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  simplifiedText: {
    fontSize: 108,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  bottomSection: {
    width: '100%',
    alignItems: 'center',
    gap: 16,
  },
  radicalHintWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  hintButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  hintButtonText: {
    fontSize: 12,
    color: '#AEAEB2',
    fontWeight: '600',
  },
  radicalsBox: {
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  radicalsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8E8E93',
    marginBottom: 8,
  },
  radicalsList: {
    gap: 8,
  },
  radicalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  radicalChar: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF2D55',
    backgroundColor: 'rgba(255, 45, 85, 0.15)',
    width: 26,
    height: 26,
    textAlign: 'center',
    lineHeight: 26,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 45, 85, 0.25)',
  },
  radicalText: {
    fontSize: 13,
    color: '#E5E5EA',
    fontWeight: '500',
  },
  tapText: {
    fontSize: 12,
    color: '#6E6E73',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tapTextBack: {
    fontSize: 11,
    color: '#6E6E73',
    fontWeight: '700',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Backside styles
  backCenterSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
  },
  backHanzi: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  pinyinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  pinyinWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pinyinWord: {
    fontSize: 26,
    fontWeight: 'bold',
  },
  soundButtonInline: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 214, 10, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backDefinition: {
    fontSize: 18,
    color: '#AEAEB2',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  // Swipe indicators
  overlay: {
    position: 'absolute',
    top: 30,
    borderRadius: 14,
    borderWidth: 3.5,
    paddingHorizontal: 22,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  easyOverlay: {
    right: 25,
    borderColor: '#30D158', // iOS Green
    backgroundColor: 'rgba(48, 209, 88, 0.12)',
  },
  forgotOverlay: {
    left: 25,
    borderColor: '#FF453A', // iOS Red
    backgroundColor: 'rgba(255, 69, 58, 0.12)',
  },
  hardOverlay: {
    top: '40%',
    alignSelf: 'center',
    borderColor: '#0A84FF', // iOS Blue
    backgroundColor: 'rgba(10, 132, 255, 0.12)',
  },
  overlayTextEasy: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#30D158',
    letterSpacing: 1.5,
  },
  overlayTextForgot: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF453A',
    letterSpacing: 1.5,
  },
  overlayTextHard: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0A84FF',
    letterSpacing: 1.5,
  },
  backExampleContainer: {
    marginTop: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 4,
    width: '90%',
    alignSelf: 'center',
  },
  backExampleZh: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  backExamplePinyin: {
    fontSize: 13,
    color: '#FFD60A',
    fontWeight: '500',
    textAlign: 'center',
  },
  backExampleVi: {
    fontSize: 13,
    color: '#AEAEB2',
    fontWeight: '500',
    textAlign: 'center',
  },
});
