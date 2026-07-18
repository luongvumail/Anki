import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
  Dimensions, ActivityIndicator, ScrollView, PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { useStore } from '../../store/useStore';
import { SRS_GRADES, getIntervalLabel } from '../../lib/srs';
import { Colors, Typography, Spacing, Radii, triggerHaptic } from '../../constants/theme';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width - Spacing.pageMargin * 2;
const CARD_HEIGHT = height * 0.52;
const SWIPE_THRESHOLD = 90;

export default function StudyScreen() {
  const insets = useSafeAreaInsets();
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  const { session, startSession, endSession, gradeCard, decks } = useStore();

  const [flipped, setFlipped] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [activeSwipeDirection, setActiveSwipeDirection] = useState<'left' | 'right' | 'up' | 'down' | null>(null);

  const flipAnim = useRef(new Animated.Value(0)).current;
  const pan = useRef(new Animated.ValueXY()).current;

  const deck = decks.find(d => d.id === deckId);
  const currentCard = session?.queue[session.currentIndex ?? 0];
  const isSessionDone = session && session.currentIndex >= session.queue.length;
  const progress = session ? session.currentIndex / Math.max(session.queue.length, 1) : 0;

  useEffect(() => {
    if (deckId) startSession(deckId);
    return () => { Speech.stop(); };
  }, [deckId]);

  const flipCard = () => {
    if (flipped) return;
    triggerHaptic('light');
    Animated.spring(flipAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
    setFlipped(true);
  };

  const resetCardPosition = () => {
    flipAnim.setValue(0);
    pan.setValue({ x: 0, y: 0 });
    setFlipped(false);
    setActiveSwipeDirection(null);
  };

  const handleGrade = async (grade: number, direction: 'left' | 'right' | 'up' | 'down') => {
    if (!currentCard || !session) return;

    if (grade === SRS_GRADES.AGAIN) triggerHaptic('error');
    else if (grade === SRS_GRADES.HARD) triggerHaptic('warning');
    else triggerHaptic('success');

    await gradeCard(currentCard, grade as any);

    const targetX = direction === 'left' ? -width * 1.3 : direction === 'right' ? width * 1.3 : 0;
    const targetY = direction === 'up' ? -height * 1.3 : direction === 'down' ? height * 1.3 : 0;

    Animated.timing(pan, {
      toValue: { x: targetX, y: targetY },
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      resetCardPosition();
      useStore.setState(s => {
        if (!s.session) return { session: null };
        const updatedQueue = [...s.session.queue];
        if (grade === SRS_GRADES.AGAIN) {
          updatedQueue.push(currentCard);
        }
        return {
          session: {
            ...s.session,
            queue: updatedQueue,
            currentIndex: s.session.currentIndex + 1,
            reviewedCount: s.session.reviewedCount + 1,
            correctCount: grade >= 3 ? s.session.correctCount + 1 : s.session.correctCount,
          },
        };
      });
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        pan.setValue({ x: gestureState.dx, y: gestureState.dy });

        const { dx, dy } = gestureState;
        if (Math.abs(dx) > Math.abs(dy)) {
          if (dx < -40) setActiveSwipeDirection('left');
          else if (dx > 40) setActiveSwipeDirection('right');
          else setActiveSwipeDirection(null);
        } else {
          if (dy < -40) setActiveSwipeDirection('up');
          else if (dy > 40) setActiveSwipeDirection('down');
          else setActiveSwipeDirection(null);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const { dx, dy } = gestureState;
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);

        if (absX < 12 && absY < 12) {
          flipCard();
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
          return;
        }

        if (absX > absY && absX > SWIPE_THRESHOLD) {
          if (dx < 0) handleGrade(SRS_GRADES.AGAIN, 'left');
          else handleGrade(SRS_GRADES.GOOD, 'right');
        } else if (absY > absX && absY > SWIPE_THRESHOLD) {
          if (dy < 0) handleGrade(SRS_GRADES.HARD, 'up');
          else {
            setActiveSwipeDirection(null);
            Animated.spring(pan, { toValue: { x: 0, y: 0 }, friction: 5, useNativeDriver: true }).start();
          }
        } else {
          setActiveSwipeDirection(null);
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            friction: 5,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const speakWord = () => {
    if (!currentCard) return;
    triggerHaptic('selection');
    setSpeaking(true);
    Speech.speak(currentCard.character, {
      language: 'zh-CN',
      rate: 0.8,
      onDone: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  };

  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });
  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });

  const cardRotateStyle = {
    transform: [
      { translateX: pan.x },
      { translateY: pan.y },
      {
        rotate: pan.x.interpolate({
          inputRange: [-width, 0, width],
          outputRange: ['-12deg', '0deg', '12deg'],
        }),
      },
    ],
  };

  if (!session) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="small" color={Colors.accent.gray} />
        <Text style={styles.loadingText}>Đang chuẩn bị bộ thẻ ôn tập...</Text>
      </View>
    );
  }

  if (isSessionDone) {
    const accuracy = session.reviewedCount > 0
      ? Math.round((session.correctCount / session.reviewedCount) * 100)
      : 0;

    return (
      <View style={[styles.doneScreen, { paddingTop: Math.max(insets.top + 20, 50), paddingBottom: Math.max(insets.bottom + 20, 30) }]}>
        <View style={styles.doneIconBox}>
          <Ionicons name="checkmark-circle-outline" size={64} color={Colors.accent.blue} />
        </View>
        <Text style={styles.doneTitle}>Hoàn thành ôn tập</Text>
        <Text style={styles.doneSub}>Bạn đã ôn hết tất cả các thẻ trong bộ hôm nay</Text>

        <View style={styles.doneInsetGroup}>
          <View style={styles.doneRow}>
            <Text style={styles.doneRowLabel}>Thẻ đã ôn</Text>
            <Text style={styles.doneRowValue}>{session.reviewedCount} thẻ</Text>
          </View>
          <View style={[styles.doneRow, styles.cellBorderTop]}>
            <Text style={styles.doneRowLabel}>Tỷ lệ chính xác</Text>
            <Text style={styles.doneRowValue}>{accuracy}%</Text>
          </View>
          <View style={[styles.doneRow, styles.cellBorderTop]}>
            <Text style={styles.doneRowLabel}>Thẻ cần học lại</Text>
            <Text style={styles.doneRowValue}>{session.reviewedCount - session.correctCount}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.doneBtn}
          onPress={() => {
            triggerHaptic('medium');
            endSession();
            router.back();
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.doneBtnText}>Xong</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!currentCard) return null;

  return (
    <View style={styles.container}>
      {/* iOS Header Bar */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 10, 48) }]}>
        <TouchableOpacity
          onPress={() => {
            triggerHaptic('light');
            endSession();
            router.back();
          }}
          style={styles.headerLeftBtn}
        >
          <Text style={styles.doneTextBtn}>Xong</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{deck?.name || 'Ôn tập'}</Text>
          <Text style={styles.headerSub}>{session.currentIndex + 1} / {session.queue.length}</Text>
        </View>
        <TouchableOpacity onPress={speakWord} style={styles.headerRightBtn}>
          <Ionicons name={speaking ? "volume-high" : "volume-medium-outline"} size={22} color={Colors.accent.blue} />
        </TouchableOpacity>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      {/* Gesture hints */}
      <View style={styles.gestureHintRow}>
        <Text style={styles.gestureHintText}>
          👈 Quên • 👆 Khó • 👉 Đã nhớ
        </Text>
      </View>

      {/* Flashcard Area */}
      <View style={styles.cardArea}>
        <Animated.View
          style={[styles.cardWrapper, cardRotateStyle]}
          {...panResponder.panHandlers}
        >
          {/* Swipe indicator overlay badges */}
          {activeSwipeDirection === 'left' && (
            <View style={[styles.swipeBadge, { backgroundColor: Colors.accent.gray4, left: 20, top: 20 }]}>
              <Text style={styles.swipeBadgeText}>QUÊN</Text>
            </View>
          )}
          {activeSwipeDirection === 'right' && (
            <View style={[styles.swipeBadge, { backgroundColor: Colors.accent.blue, right: 20, top: 20 }]}>
              <Text style={styles.swipeBadgeText}>ĐÃ NHỚ</Text>
            </View>
          )}
          {activeSwipeDirection === 'up' && (
            <View style={[styles.swipeBadge, { backgroundColor: Colors.accent.gray4, top: 20, alignSelf: 'center' }]}>
              <Text style={styles.swipeBadgeText}>KHÓ</Text>
            </View>
          )}

          {/* Card Front */}
          <Animated.View
            pointerEvents={flipped ? 'none' : 'auto'}
            style={[
              styles.cardFace,
              styles.cardFront,
              { transform: [{ rotateY: frontInterpolate }] },
            ]}
          >
            <View style={styles.cardFrontContent}>
              {currentCard.hskLevel ? (
                <View style={styles.hskBadge}>
                  <Text style={styles.hskText}>HSK {currentCard.hskLevel}</Text>
                </View>
              ) : null}

              <Text style={styles.characterBig}>{currentCard.character}</Text>

              {currentCard.traditional && currentCard.traditional !== currentCard.character && (
                <Text style={styles.traditional}>{currentCard.traditional}</Text>
              )}

              <TouchableOpacity style={styles.speakBtn} onPress={speakWord} activeOpacity={0.8}>
                <Ionicons name={speaking ? "volume-high" : "volume-medium"} size={18} color={Colors.accent.blue} />
                <Text style={styles.speakBtnText}>{speaking ? 'Đang phát âm...' : 'Phát âm'}</Text>
              </TouchableOpacity>

              <Text style={styles.tapHint}>Chạm vào thẻ để lật đáp án</Text>
            </View>
          </Animated.View>

          {/* Card Back */}
          <Animated.View
            pointerEvents={flipped ? 'auto' : 'none'}
            style={[
              styles.cardFace,
              styles.cardBack,
              { transform: [{ rotateY: backInterpolate }] },
            ]}
          >
            <ScrollView contentContainerStyle={styles.cardBackContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.characterSmall}>{currentCard.character}</Text>
              <Text style={styles.pinyin}>{currentCard.pinyin}</Text>
              <Text style={styles.hanviet}>{currentCard.hanviet}</Text>
              <View style={styles.divider} />
              <Text style={styles.translation}>{currentCard.translation}</Text>

              {currentCard.examples && currentCard.examples.length > 0 && (
                <View style={styles.exampleBox}>
                  <Text style={styles.exampleCn}>{currentCard.examples[0].chinese}</Text>
                  <Text style={styles.examplePy}>{currentCard.examples[0].pinyin}</Text>
                  <Text style={styles.exampleVi}>{currentCard.examples[0].vietnamese}</Text>
                </View>
              )}

              <TouchableOpacity style={styles.speakBtnSmall} onPress={speakWord} activeOpacity={0.8}>
                <Ionicons name={speaking ? "volume-high" : "volume-medium-outline"} size={16} color={Colors.text.secondary} />
                <Text style={styles.speakBtnSmallText}>Nghe lại</Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </View>

      {/* SRS Action Buttons */}
      {flipped ? (
        <View style={[styles.srsArea, { paddingBottom: Math.max(insets.bottom + 16, 24) }]}>
          <Text style={styles.srsLabel}>Chọn mức độ ghi nhớ:</Text>
          <View style={styles.srsRow}>
            <SRSButton
              label="Quên (👈)"
              sub={getIntervalLabel(SRS_GRADES.AGAIN, currentCard.srs)}
              color={Colors.srs.again}
              onPress={() => handleGrade(SRS_GRADES.AGAIN, 'left')}
            />
            <SRSButton
              label="Khó (👆)"
              sub={getIntervalLabel(SRS_GRADES.HARD, currentCard.srs)}
              color={Colors.srs.hard}
              onPress={() => handleGrade(SRS_GRADES.HARD, 'up')}
            />
            <SRSButton
              label="Đã nhớ (👉)"
              sub={getIntervalLabel(SRS_GRADES.GOOD, currentCard.srs)}
              color={Colors.srs.good}
              onPress={() => handleGrade(SRS_GRADES.GOOD, 'right')}
            />
          </View>
        </View>
      ) : (
        <View style={[styles.tapArea, { paddingBottom: Math.max(insets.bottom + 16, 24) }]}>
          <TouchableOpacity style={styles.revealBtn} onPress={flipCard} activeOpacity={0.8}>
            <Text style={styles.revealBtnText}>Hiện đáp án (hoặc Chạm thẻ)</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function SRSButton({ label, sub, color, onPress }: { label: string; sub: string; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.srsBtn, { borderColor: color + '50', backgroundColor: Colors.bg.secondary }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.srsBtnLabel, { color }]}>{label}</Text>
      <Text style={styles.srsBtnSub}>{sub}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg.primary },
  loadingText: { color: Colors.text.secondary, marginTop: Spacing.md, fontSize: Typography.text.footnote.fontSize },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.pageMargin,
    paddingBottom: Spacing.xs,
  },
  headerLeftBtn: { padding: Spacing.xs },
  doneTextBtn: { fontSize: Typography.text.body.fontSize, color: Colors.accent.blue, fontWeight: Typography.weight.semibold },
  headerRightBtn: { padding: Spacing.xs },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: Typography.text.headline.fontSize, fontWeight: Typography.weight.semibold, color: Colors.text.primary },
  headerSub: { fontSize: Typography.text.caption2.fontSize, color: Colors.text.secondary, marginTop: 1 },

  progressTrack: { height: 3, backgroundColor: Colors.bg.secondary, marginHorizontal: Spacing.pageMargin, borderRadius: 1.5, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.accent.blue, borderRadius: 1.5 },

  gestureHintRow: { alignItems: 'center', marginTop: Spacing.sm },
  gestureHintText: { fontSize: Typography.text.caption1.fontSize, color: Colors.text.secondary },

  cardArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cardWrapper: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardFace: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: Radii.xl,
    backfaceVisibility: 'hidden',
  },
  cardFront: {
    backgroundColor: Colors.bg.secondary,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  cardBack: {
    backgroundColor: Colors.bg.tertiary,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },

  swipeBadge: {
    position: 'absolute',
    zIndex: 100,
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  swipeBadgeText: { color: '#FFFFFF', fontSize: Typography.text.footnote.fontSize, fontWeight: Typography.weight.bold },

  cardFrontContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  hskBadge: {
    position: 'absolute',
    top: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: Colors.accent.gray5,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  hskText: { fontSize: Typography.text.caption2.fontSize, color: Colors.text.secondary, fontWeight: Typography.weight.medium },
  characterBig: {
    fontSize: Typography.hanzi.xl,
    color: Colors.text.primary,
    fontWeight: Typography.weight.bold,
  },
  traditional: { fontSize: Typography.text.title3.fontSize, color: Colors.text.secondary, marginTop: Spacing.sm },
  speakBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.xl,
    backgroundColor: Colors.bg.tertiary,
    borderRadius: Radii.full,
    height: 38,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
  },
  speakBtnText: {
    color: Colors.accent.blue,
    fontSize: Typography.text.footnote.fontSize,
    fontWeight: Typography.weight.semibold,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  tapHint: { position: 'absolute', bottom: Spacing.lg, fontSize: Typography.text.caption1.fontSize, color: Colors.text.secondary },

  cardBackContent: { padding: Spacing.xl, alignItems: 'center' },
  characterSmall: { fontSize: Typography.hanzi.md, color: Colors.text.primary, fontWeight: Typography.weight.bold },
  pinyin: { fontSize: Typography.text.title2.fontSize, color: Colors.accent.blue, fontWeight: Typography.weight.bold, marginTop: Spacing.xs },
  hanviet: { fontSize: Typography.text.title3.fontSize, color: Colors.text.primary, marginTop: 2, fontWeight: Typography.weight.semibold },
  divider: { height: 0.5, width: '100%', backgroundColor: Colors.border.separator, marginVertical: Spacing.lg },
  translation: { fontSize: Typography.text.title3.fontSize, color: Colors.text.primary, textAlign: 'center', fontWeight: Typography.weight.semibold },
  exampleBox: { backgroundColor: Colors.bg.secondary, borderRadius: 12, padding: Spacing.md, marginTop: Spacing.lg, width: '100%' },
  exampleCn: { fontSize: Typography.text.body.fontSize, color: Colors.text.primary, fontWeight: Typography.weight.semibold },
  examplePy: { fontSize: Typography.text.caption1.fontSize, color: Colors.accent.blue, marginTop: 2 },
  exampleVi: { fontSize: Typography.text.caption1.fontSize, color: Colors.text.secondary, marginTop: 2 },

  speakBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radii.full,
    height: 32,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.lg,
    justifyContent: 'center',
  },
  speakBtnSmallText: {
    color: Colors.text.secondary,
    fontSize: Typography.text.caption1.fontSize,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },

  tapArea: { paddingHorizontal: Spacing.pageMargin, paddingTop: Spacing.sm },
  revealBtn: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radii.card,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  revealBtnText: {
    color: Colors.text.primary,
    fontSize: Typography.text.body.fontSize,
    fontWeight: Typography.weight.semibold,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },

  srsArea: { paddingHorizontal: Spacing.pageMargin, paddingTop: Spacing.xs },
  srsLabel: { fontSize: Typography.text.caption1.fontSize, color: Colors.text.secondary, textAlign: 'center', marginBottom: Spacing.xs },
  srsRow: { flexDirection: 'row', gap: Spacing.xs },
  srsBtn: {
    flex: 1,
    borderRadius: Radii.card,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  srsBtnLabel: {
    fontSize: Typography.text.caption1.fontSize,
    fontWeight: Typography.weight.bold,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  srsBtnSub: { fontSize: 10, color: Colors.text.secondary, marginTop: 2 },

  // Done screen
  doneScreen: { flex: 1, backgroundColor: Colors.bg.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.pageMargin },
  doneIconBox: { marginBottom: Spacing.lg },
  doneTitle: { fontSize: Typography.text.largeTitle.fontSize, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  doneSub: { fontSize: Typography.text.body.fontSize, color: Colors.text.secondary, marginTop: Spacing.xs, textAlign: 'center' },
  doneInsetGroup: {
    width: '100%',
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radii.card,
    overflow: 'hidden',
    marginTop: Spacing.xxl,
    marginBottom: Spacing.xxl,
  },
  doneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.cellHorizontal,
    paddingVertical: Spacing.cellVertical,
  },
  cellBorderTop: {
    borderTopWidth: 0.5,
    borderTopColor: Colors.border.separator,
  },
  doneRowLabel: { fontSize: Typography.text.body.fontSize, color: Colors.text.primary },
  doneRowValue: { fontSize: Typography.text.body.fontSize, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  doneBtn: {
    width: '100%',
    backgroundColor: Colors.accent.blue,
    borderRadius: Radii.card,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: Typography.text.body.fontSize,
    fontWeight: Typography.weight.semibold,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
});
