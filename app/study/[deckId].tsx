import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
  Dimensions, ActivityIndicator, ScrollView, PanResponder,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { useStore } from '../../store/useStore';
import { SRS_GRADES, getIntervalLabel } from '../../lib/srs';
import { Colors, Typography, Spacing, Radii, Shadows } from '../../constants/theme';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width - Spacing.xl * 2;
const CARD_HEIGHT = height * 0.52;
const SWIPE_THRESHOLD = 90;

export default function StudyScreen() {
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

  // Flip card 3D rotation
  const flipCard = () => {
    if (flipped) return;
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
    await gradeCard(currentCard, grade as any);

    // Animate card off screen in swipe direction
    const targetX = direction === 'left' ? -width * 1.2 : direction === 'right' ? width * 1.2 : 0;
    const targetY = direction === 'up' ? -height * 1.2 : direction === 'down' ? height * 1.2 : 0;

    Animated.timing(pan, {
      toValue: { x: targetX, y: targetY },
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      // Advance to next card in session queue
      resetCardPosition();
      useStore.setState(s => ({
        session: s.session ? {
          ...s.session,
          currentIndex: s.session.currentIndex + 1,
          reviewedCount: s.session.reviewedCount + 1,
          correctCount: grade >= 3 ? s.session.correctCount + 1 : s.session.correctCount,
        } : null,
      }));
    });
  };

  // PanResponder for 4-directional drag & drop gesture
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

        // Tap detected (minimal movement) -> flip card
        if (absX < 12 && absY < 12) {
          flipCard();
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
          return;
        }

        // Swipe gestures (mapped to SM-2 Anki SRS grades)
        if (absX > absY && absX > SWIPE_THRESHOLD) {
          if (dx < 0) handleGrade(SRS_GRADES.AGAIN, 'left');   // 👈 Left = Again (Quên)
          else handleGrade(SRS_GRADES.GOOD, 'right');          // 👉 Right = Good (Tốt)
        } else if (absY > absX && absY > SWIPE_THRESHOLD) {
          if (dy < 0) handleGrade(SRS_GRADES.HARD, 'up');       // 👆 Up = Hard (Khó)
          else handleGrade(SRS_GRADES.EASY, 'down');           // 👇 Down = Easy (Dễ)
        } else {
          // Spring back to center
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
    setSpeaking(true);
    Speech.speak(currentCard.character, {
      language: 'zh-CN',
      rate: 0.8,
      onDone: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  };

  // Interpolations for smooth 3D flip transform
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
          outputRange: ['-15deg', '0deg', '15deg'],
        }),
      },
    ],
  };

  if (!session) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.accent.purple} />
        <Text style={styles.loadingText}>Đang tải bài ôn...</Text>
      </View>
    );
  }

  if (isSessionDone) {
    const accuracy = session.reviewedCount > 0
      ? Math.round((session.correctCount / session.reviewedCount) * 100)
      : 0;
    return (
      <View style={styles.doneScreen}>
        <Text style={styles.doneEmoji}>🎉</Text>
        <Text style={styles.doneTitle}>Hoàn thành!</Text>
        <Text style={styles.doneSub}>Bạn đã ôn xong tất cả thẻ hôm nay</Text>
        <View style={styles.doneStats}>
          <DoneStat label="Đã ôn" value={`${session.reviewedCount}`} color={Colors.accent.purple} />
          <DoneStat label="Chính xác" value={`${accuracy}%`} color={Colors.accent.green} />
          <DoneStat label="Cần học lại" value={`${session.reviewedCount - session.correctCount}`} color={Colors.accent.red} />
        </View>
        <TouchableOpacity style={styles.doneBtn} onPress={() => { endSession(); router.back(); }}>
          <Text style={styles.doneBtnText}>Quay về</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!currentCard) return null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { endSession(); router.back(); }} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{deck?.name || 'Ôn tập'}</Text>
          <Text style={styles.headerSub}>{session.currentIndex + 1} / {session.queue.length}</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      {/* Progress bar */}
      <View style={styles.progressBg}>
        <Animated.View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      {/* Gesture hints guide */}
      <Text style={styles.gestureHintText}>
        👈 Trái: Quên • 👆 Trên: Khó • 👉 Phải: Tốt • 👇 Dưới: Dễ
      </Text>

      {/* Flashcard Area */}
      <View style={styles.cardArea}>
        <Animated.View
          style={[styles.cardWrapper, cardRotateStyle]}
          {...panResponder.panHandlers}
        >
          {/* Swipe indicator overlay badges */}
          {activeSwipeDirection === 'left' && (
            <View style={[styles.swipeBadge, { backgroundColor: Colors.srs.again, left: 20, top: 20 }]}>
              <Text style={styles.swipeBadgeText}>👈 QUÊN</Text>
            </View>
          )}
          {activeSwipeDirection === 'right' && (
            <View style={[styles.swipeBadge, { backgroundColor: Colors.srs.good, right: 20, top: 20 }]}>
              <Text style={styles.swipeBadgeText}>👉 TỐT</Text>
            </View>
          )}
          {activeSwipeDirection === 'up' && (
            <View style={[styles.swipeBadge, { backgroundColor: Colors.srs.hard, top: 20, alignSelf: 'center' }]}>
              <Text style={styles.swipeBadgeText}>👆 KHÓ</Text>
            </View>
          )}
          {activeSwipeDirection === 'down' && (
            <View style={[styles.swipeBadge, { backgroundColor: Colors.srs.easy, bottom: 20, alignSelf: 'center' }]}>
              <Text style={styles.swipeBadgeText}>👇 DỄ</Text>
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
              {currentCard.hskLevel && (
                <View style={styles.hskBadge}>
                  <Text style={styles.hskBadgeText}>HSK {currentCard.hskLevel}</Text>
                </View>
              )}
              <Text style={styles.characterBig}>{currentCard.character}</Text>
              {currentCard.traditional && currentCard.traditional !== currentCard.character && (
                <Text style={styles.traditional}>{currentCard.traditional}</Text>
              )}
              <TouchableOpacity style={styles.speakBtn} onPress={speakWord}>
                <Text style={styles.speakIcon}>{speaking ? '🔊' : '🔉'}</Text>
              </TouchableOpacity>
              <Text style={styles.tapHint}>Chạm để lật thẻ • Vuốt để chấm điểm</Text>
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

              <TouchableOpacity style={styles.speakBtnSmall} onPress={speakWord}>
                <Text style={styles.speakIcon}>{speaking ? '🔊' : '🔉'} Phát âm</Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </View>

      {/* SRS Buttons (Backup for accessibility) */}
      {flipped ? (
        <View style={styles.srsArea}>
          <Text style={styles.srsLabel}>Vuốt thẻ hoặc chọn mức độ:</Text>
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
              label="Tốt (👉)"
              sub={getIntervalLabel(SRS_GRADES.GOOD, currentCard.srs)}
              color={Colors.srs.good}
              onPress={() => handleGrade(SRS_GRADES.GOOD, 'right')}
            />
            <SRSButton
              label="Dễ (👇)"
              sub={getIntervalLabel(SRS_GRADES.EASY, currentCard.srs)}
              color={Colors.srs.easy}
              onPress={() => handleGrade(SRS_GRADES.EASY, 'down')}
            />
          </View>
        </View>
      ) : (
        <View style={styles.tapArea}>
          <TouchableOpacity style={styles.revealBtn} onPress={flipCard} activeOpacity={0.85}>
            <Text style={styles.revealBtnText}>Hiện đáp án (hoặc Chạm vào thẻ)</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function SRSButton({ label, sub, color, onPress }: { label: string; sub: string; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.srsBtn, { borderColor: color + '60', backgroundColor: color + '15' }]} onPress={onPress} activeOpacity={0.8}>
      <Text style={[styles.srsBtnLabel, { color }]}>{label}</Text>
      <Text style={styles.srsBtnSub}>{sub}</Text>
    </TouchableOpacity>
  );
}

function DoneStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.doneStat}>
      <Text style={[styles.doneStatValue, { color }]}>{value}</Text>
      <Text style={styles.doneStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg.primary },
  loadingText: { color: Colors.text.secondary, marginTop: Spacing.md },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingTop: 56, paddingBottom: Spacing.xs },
  closeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { color: Colors.text.muted, fontSize: 18 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: Typography.text.md, fontWeight: Typography.weight.semibold, color: Colors.text.primary },
  headerSub: { fontSize: Typography.text.sm, color: Colors.text.muted, marginTop: 2 },

  progressBg: { height: 4, backgroundColor: Colors.bg.elevated, marginHorizontal: Spacing.xl, borderRadius: 2 },
  progressFill: { height: '100%', backgroundColor: Colors.accent.purple, borderRadius: 2 },

  gestureHintText: { fontSize: Typography.text.xs, color: Colors.text.muted, textAlign: 'center', marginTop: Spacing.sm },

  cardArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cardWrapper: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    alignItems: 'center',
    justify: 'center',
  },
  cardFace: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: Radii.xl,
    backfaceVisibility: 'hidden',
    ...Shadows.card,
  },
  cardFront: {
    backgroundColor: Colors.bg.card,
    borderWidth: 1, borderColor: Colors.border.subtle,
  },
  cardBack: {
    backgroundColor: Colors.bg.elevated,
    borderWidth: 1, borderColor: Colors.accent.purpleDim,
  },

  swipeBadge: {
    position: 'absolute',
    zIndex: 100,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6,
  },
  swipeBadgeText: { color: '#fff', fontSize: Typography.text.sm, fontWeight: Typography.weight.heavy },

  cardFrontContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  hskBadge: {
    position: 'absolute', top: Spacing.lg, right: Spacing.lg,
    backgroundColor: Colors.accent.purpleDim, borderRadius: Radii.full,
    paddingHorizontal: Spacing.md, paddingVertical: 4,
  },
  hskBadgeText: { fontSize: Typography.text.xs, color: Colors.accent.purpleLight, fontWeight: Typography.weight.semibold },
  characterBig: {
    fontSize: Typography.hanzi.xl, color: Colors.text.primary, fontWeight: Typography.weight.bold,
    textShadowColor: Colors.accent.purple, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 20,
  },
  traditional: { fontSize: Typography.text.xl, color: Colors.text.secondary, marginTop: Spacing.sm },
  speakBtn: { marginTop: Spacing.xl, padding: Spacing.md },
  speakBtnSmall: { borderWidth: 1, borderColor: Colors.border.default, borderRadius: Radii.full, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg, alignSelf: 'center', marginTop: Spacing.lg },
  speakIcon: { fontSize: 24, color: Colors.text.secondary },
  tapHint: { position: 'absolute', bottom: Spacing.lg, fontSize: Typography.text.xs, color: Colors.text.muted },

  cardBackContent: { padding: Spacing.xl, alignItems: 'center' },
  characterSmall: { fontSize: Typography.hanzi.md, color: Colors.text.primary, fontWeight: Typography.weight.bold },
  pinyin: { fontSize: Typography.text.xl, color: Colors.accent.purpleLight, fontWeight: Typography.weight.medium, marginTop: Spacing.sm },
  hanviet: { fontSize: Typography.text.lg, color: Colors.accent.gold, marginTop: Spacing.xs },
  divider: { height: 1, width: '100%', backgroundColor: Colors.border.subtle, marginVertical: Spacing.lg },
  translation: { fontSize: Typography.text.xl, color: Colors.text.primary, textAlign: 'center', fontWeight: Typography.weight.medium },
  exampleBox: { backgroundColor: Colors.bg.secondary, borderRadius: Radii.lg, padding: Spacing.lg, marginTop: Spacing.lg, width: '100%' },
  exampleCn: { fontSize: Typography.text.lg, color: Colors.text.primary },
  examplePy: { fontSize: Typography.text.sm, color: Colors.accent.purpleLight, marginTop: 4 },
  exampleVi: { fontSize: Typography.text.sm, color: Colors.text.secondary, marginTop: 2 },

  tapArea: { padding: Spacing.xl },
  revealBtn: {
    backgroundColor: Colors.bg.elevated, borderRadius: Radii.lg,
    paddingVertical: Spacing.lg, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border.default,
  },
  revealBtnText: { color: Colors.text.primary, fontSize: Typography.text.md, fontWeight: Typography.weight.medium },

  srsArea: { padding: Spacing.xl, paddingTop: Spacing.xs },
  srsLabel: { fontSize: Typography.text.xs, color: Colors.text.muted, textAlign: 'center', marginBottom: Spacing.sm },
  srsRow: { flexDirection: 'row', gap: Spacing.xs },
  srsBtn: {
    flex: 1, borderRadius: Radii.md, paddingVertical: Spacing.sm,
    alignItems: 'center', borderWidth: 1,
  },
  srsBtnLabel: { fontSize: Typography.text.xs, fontWeight: Typography.weight.bold },
  srsBtnSub: { fontSize: 10, color: Colors.text.muted, marginTop: 2 },

  // Done screen
  doneScreen: { flex: 1, backgroundColor: Colors.bg.primary, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  doneEmoji: { fontSize: 72, marginBottom: Spacing.lg },
  doneTitle: { fontSize: Typography.text.xxxl, fontWeight: Typography.weight.heavy, color: Colors.text.primary },
  doneSub: { fontSize: Typography.text.md, color: Colors.text.secondary, marginTop: Spacing.sm, textAlign: 'center' },
  doneStats: { flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.xxl, marginBottom: Spacing.xxl },
  doneStat: { alignItems: 'center' },
  doneStatValue: { fontSize: Typography.text.xxxl, fontWeight: Typography.weight.bold },
  doneStatLabel: { fontSize: Typography.text.sm, color: Colors.text.muted, marginTop: 4 },
  doneBtn: { backgroundColor: Colors.accent.purple, borderRadius: Radii.lg, paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xxl },
  doneBtnText: { color: '#fff', fontSize: Typography.text.md, fontWeight: Typography.weight.semibold },
});
