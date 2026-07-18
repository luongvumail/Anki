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
import { getPinyinToneColor } from '../../lib/pinyinColor';
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

  // Computed values — phải khai báo TRƯỚC refs
  const deck = decks.find(d => d.id === deckId);
  const currentCard = session?.queue[session.currentIndex ?? 0];
  const isSessionDone = session && session.currentIndex >= session.queue.length;
  const progress = session ? session.currentIndex / Math.max(session.queue.length, 1) : 0;

  // Refs để tránh stale closure trong PanResponder
  const flippedRef = useRef(flipped);
  const currentCardRef = useRef(currentCard);
  const sessionRef = useRef(session);
  useEffect(() => { flippedRef.current = flipped; }, [flipped]);
  useEffect(() => { currentCardRef.current = currentCard; }, [currentCard]);
  useEffect(() => { sessionRef.current = session; }, [session]);

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
    const card = currentCardRef.current;
    const sess = sessionRef.current;
    if (!card || !sess) return;

    if (grade === SRS_GRADES.AGAIN) triggerHaptic('error');
    else if (grade === SRS_GRADES.HARD) triggerHaptic('warning');
    else triggerHaptic('success');

    await gradeCard(card, grade as any);

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
          updatedQueue.push(card);
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

  // Dùng ref để lưu handleGrade tránh stale closure trong PanResponder
  const handleGradeRef = useRef(handleGrade);
  useEffect(() => { handleGradeRef.current = handleGrade; });

  const panResponder = useRef(
    PanResponder.create({
      // Chỉ set panResponder khi gesture đủ lớn (tránh tranh với ScrollView)
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 8 || Math.abs(gestureState.dy) > 8;
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

        // Tap nhỏ → flip (chỉ khi chưa lật)
        if (absX < 12 && absY < 12) {
          if (!flippedRef.current) {
            triggerHaptic('light');
            Animated.spring(flipAnim, {
              toValue: 1,
              useNativeDriver: true,
              tension: 50,
              friction: 7,
            }).start();
            setFlipped(true);
          }
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
          return;
        }

        // Chỉ cho phép swipe grade khi đã lật thẻ
        if (!flippedRef.current) {
          setActiveSwipeDirection(null);
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, friction: 5, useNativeDriver: true }).start();
          return;
        }

        if (absX > absY && absX > SWIPE_THRESHOLD) {
          if (dx < 0) handleGradeRef.current(SRS_GRADES.AGAIN, 'left');
          else handleGradeRef.current(SRS_GRADES.GOOD, 'right');
        } else if (absY > absX && absY > SWIPE_THRESHOLD) {
          if (dy < 0) handleGradeRef.current(SRS_GRADES.HARD, 'up');
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
        <ActivityIndicator size="small" color={Colors.accent.indigoLight} />
        <Text style={styles.loadingText}>PREPARING STUDY QUEUE...</Text>
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
          <Ionicons name="checkmark-circle" size={56} color={Colors.neon.emerald} />
        </View>
        <Text style={styles.doneTitle}>SESSION COMPLETED</Text>
        <Text style={styles.doneSub}>All queued flashcard reviews are finished for today</Text>

        <View style={styles.doneInsetGroup}>
          <View style={styles.doneRow}>
            <Text style={styles.doneRowLabel}>Total Reviewed</Text>
            <Text style={styles.doneRowValue}>{session.reviewedCount} cards</Text>
          </View>
          <View style={[styles.doneRow, styles.cellBorderTop]}>
            <Text style={styles.doneRowLabel}>Accuracy Rate</Text>
            <Text style={[styles.doneRowValue, { color: Colors.neon.emerald }]}>{accuracy}%</Text>
          </View>
          <View style={[styles.doneRow, styles.cellBorderTop]}>
            <Text style={styles.doneRowLabel}>Cards Re-queued</Text>
            <Text style={[styles.doneRowValue, { color: Colors.neon.coral }]}>{session.reviewedCount - session.correctCount}</Text>
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
          <Text style={styles.doneBtnText}>DONE</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!currentCard) return null;

  const pinyinColor = getPinyinToneColor(currentCard.pinyin);

  return (
    <View style={styles.container}>
      {/* Linear Header Bar */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 10, 48) }]}>
        <TouchableOpacity
          onPress={() => {
            triggerHaptic('light');
            endSession();
            router.back();
          }}
          style={styles.headerLeftBtn}
        >
          <Text style={styles.doneTextBtn}>Close</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{deck?.name || 'STUDY SESSION'}</Text>
          <Text style={styles.headerSub}>{session.currentIndex + 1} OF {session.queue.length}</Text>
        </View>
        <TouchableOpacity onPress={speakWord} style={styles.headerRightBtn}>
          <Ionicons name={speaking ? "volume-high" : "volume-medium-outline"} size={20} color={Colors.accent.indigoLight} />
        </TouchableOpacity>
      </View>

      {/* Linear Progress Bar */}
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      {/* Gesture hints */}
      <View style={styles.gestureHintRow}>
        <Text style={styles.gestureHintText}>
          👈 AGAIN • 👆 HARD • 👉 GOOD
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
            <View style={[styles.swipeBadge, { backgroundColor: Colors.neon.coral, left: 20, top: 20 }]}>
              <Text style={styles.swipeBadgeText}>AGAIN</Text>
            </View>
          )}
          {activeSwipeDirection === 'right' && (
            <View style={[styles.swipeBadge, { backgroundColor: Colors.neon.emerald, right: 20, top: 20 }]}>
              <Text style={styles.swipeBadgeText}>GOOD</Text>
            </View>
          )}
          {activeSwipeDirection === 'up' && (
            <View style={[styles.swipeBadge, { backgroundColor: Colors.neon.purple, top: 20, alignSelf: 'center' }]}>
              <Text style={styles.swipeBadgeText}>HARD</Text>
            </View>
          )}

          {/* Card Front (Pure Jet Black Card Body #000000 with 1px #232530 stroke) */}
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

              {/* Anti-halo Milk White Hanzi Character */}
              <Text style={styles.characterBig}>{currentCard.character}</Text>

              {currentCard.traditional && currentCard.traditional !== currentCard.character && (
                <Text style={styles.traditional}>{currentCard.traditional}</Text>
              )}

              <TouchableOpacity style={styles.speakBtn} onPress={speakWord} activeOpacity={0.8}>
                <Ionicons name={speaking ? "volume-high" : "volume-medium"} size={16} color={Colors.accent.indigoLight} />
                <Text style={styles.speakBtnText}>{speaking ? 'Pronouncing...' : 'Pronounce'}</Text>
              </TouchableOpacity>

              <Text style={styles.tapHint}>Tap card to reveal answer</Text>
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
            <ScrollView
              contentContainerStyle={styles.cardBackContent}
              showsVerticalScrollIndicator={false}
              scrollEnabled={true}
              onStartShouldSetResponder={() => false}
            >
              <Text style={styles.characterSmall}>{currentCard.character}</Text>

              {/* Soft Neon Pinyin Tone Accent */}
              <Text style={[styles.pinyin, { color: pinyinColor }]}>{currentCard.pinyin}</Text>

              <Text style={styles.hanviet}>{currentCard.hanviet}</Text>
              <View style={styles.divider} />
              <Text style={styles.translation}>{currentCard.translation}</Text>

              {currentCard.examples && currentCard.examples.length > 0 && (
                <View style={styles.exampleBox}>
                  <Text style={styles.exampleCn}>{currentCard.examples[0].chinese}</Text>
                  <Text style={[styles.examplePy, { color: pinyinColor }]}>{currentCard.examples[0].pinyin}</Text>
                  <Text style={styles.exampleVi}>{currentCard.examples[0].vietnamese}</Text>
                </View>
              )}

              <TouchableOpacity style={styles.speakBtnSmall} onPress={speakWord} activeOpacity={0.8}>
                <Ionicons name={speaking ? "volume-high" : "volume-medium-outline"} size={15} color={Colors.text.secondary} />
                <Text style={styles.speakBtnSmallText}>Replay Audio</Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </View>

      {/* SRS Action Buttons */}
      {flipped ? (
        <View style={[styles.srsArea, { paddingBottom: Math.max(insets.bottom + 16, 24) }]}>
          <Text style={styles.srsLabel}>SELECT RECALL DIFFICULTY:</Text>
          <View style={styles.srsRow}>
            <SRSButton
              label="AGAIN (👈)"
              sub={getIntervalLabel(SRS_GRADES.AGAIN, currentCard.srs)}
              color={Colors.srs.again}
              onPress={() => handleGrade(SRS_GRADES.AGAIN, 'left')}
            />
            <SRSButton
              label="HARD (👆)"
              sub={getIntervalLabel(SRS_GRADES.HARD, currentCard.srs)}
              color={Colors.srs.hard}
              onPress={() => handleGrade(SRS_GRADES.HARD, 'up')}
            />
            <SRSButton
              label="GOOD (👉)"
              sub={getIntervalLabel(SRS_GRADES.GOOD, currentCard.srs)}
              color={Colors.srs.good}
              onPress={() => handleGrade(SRS_GRADES.GOOD, 'right')}
            />
          </View>
        </View>
      ) : (
        <View style={[styles.tapArea, { paddingBottom: Math.max(insets.bottom + 16, 24) }]}>
          <TouchableOpacity style={styles.revealBtn} onPress={flipCard} activeOpacity={0.8}>
            <Text style={styles.revealBtnText}>REVEAL ANSWER (OR TAP CARD)</Text>
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
  loadingText: { color: Colors.text.secondary, marginTop: Spacing.md, fontSize: Typography.text.footnote.fontSize, letterSpacing: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.pageMargin,
    paddingBottom: Spacing.xs,
  },
  headerLeftBtn: { padding: Spacing.xs },
  doneTextBtn: { fontSize: Typography.text.footnote.fontSize, color: Colors.accent.indigoLight, fontWeight: Typography.weight.bold },
  headerRightBtn: { padding: Spacing.xs },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: Typography.text.caption1.fontSize, fontWeight: Typography.weight.bold, color: Colors.text.primary, letterSpacing: 1 },
  headerSub: { fontSize: Typography.text.caption2.fontSize, color: Colors.text.secondary, marginTop: 1, letterSpacing: 0.8 },

  progressTrack: { height: 3, backgroundColor: Colors.bg.secondary, marginHorizontal: Spacing.pageMargin, borderRadius: 1.5, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.accent.indigo, borderRadius: 1.5 },

  gestureHintRow: { alignItems: 'center', marginTop: Spacing.sm },
  gestureHintText: { fontSize: Typography.text.caption2.fontSize, color: Colors.text.secondary, letterSpacing: 0.8, fontWeight: Typography.weight.semibold },

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
    backgroundColor: Colors.bg.card,     // Pure Jet-Black Card Body (#000000) for Linear depth
    borderWidth: 1,
    borderColor: Colors.border.default,  // Crisp 1px Linear stroke (#232530)
  },
  cardBack: {
    backgroundColor: Colors.bg.card,      // Pure Jet-Black Card Body (#000000)
    borderWidth: 1,
    borderColor: Colors.border.default,
  },

  swipeBadge: {
    position: 'absolute',
    zIndex: 100,
    borderRadius: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  swipeBadgeText: { color: '#08090C', fontSize: Typography.text.footnote.fontSize, fontWeight: Typography.weight.bold, letterSpacing: 0.8 },

  cardFrontContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  hskBadge: {
    position: 'absolute',
    top: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: Colors.bg.secondary,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  hskText: { fontSize: Typography.text.caption2.fontSize, color: Colors.accent.indigoLight, fontWeight: Typography.weight.bold, letterSpacing: 0.5 },

  // Anti-halo Milk White Hanzi Typography
  characterBig: {
    fontSize: Typography.hanzi.xl,
    color: Colors.text.primary,          // Milk White (#F3F4F6)
    fontWeight: Typography.weight.bold,
  },
  traditional: { fontSize: Typography.text.title3.fontSize, color: Colors.text.secondary, marginTop: Spacing.sm },
  speakBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.xl,
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radii.full,
    height: 36,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  speakBtnText: {
    color: Colors.accent.indigoLight,
    fontSize: Typography.text.footnote.fontSize,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.5,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  tapHint: { position: 'absolute', bottom: Spacing.lg, fontSize: Typography.text.caption2.fontSize, color: Colors.text.tertiary, letterSpacing: 0.8 },

  cardBackContent: { padding: Spacing.xl, alignItems: 'center' },
  characterSmall: { fontSize: Typography.hanzi.md, color: Colors.text.primary, fontWeight: Typography.weight.bold },
  pinyin: { fontSize: Typography.text.title2.fontSize, fontWeight: Typography.weight.bold, marginTop: Spacing.xs },
  hanviet: { fontSize: Typography.text.title3.fontSize, color: Colors.text.primary, marginTop: 2, fontWeight: Typography.weight.semibold },
  divider: { height: 1, width: '100%', backgroundColor: Colors.border.separator, marginVertical: Spacing.lg },
  translation: { fontSize: Typography.text.title3.fontSize, color: Colors.text.primary, textAlign: 'center', fontWeight: Typography.weight.semibold },
  exampleBox: { backgroundColor: Colors.bg.secondary, borderRadius: 10, padding: Spacing.md, marginTop: Spacing.lg, width: '100%', borderWidth: 1, borderColor: Colors.border.default },
  exampleCn: { fontSize: Typography.text.body.fontSize, color: Colors.text.primary, fontWeight: Typography.weight.semibold },
  examplePy: { fontSize: Typography.text.caption1.fontSize, marginTop: 2 },
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
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  speakBtnSmallText: {
    color: Colors.text.secondary,
    fontSize: Typography.text.caption1.fontSize,
    fontWeight: Typography.weight.medium,
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
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  revealBtnText: {
    color: Colors.text.primary,
    fontSize: Typography.text.footnote.fontSize,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.8,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },

  srsArea: { paddingHorizontal: Spacing.pageMargin, paddingTop: Spacing.xs },
  srsLabel: { fontSize: Typography.text.caption2.fontSize, color: Colors.text.secondary, textAlign: 'center', marginBottom: Spacing.xs, letterSpacing: 1, fontWeight: Typography.weight.semibold },
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
    letterSpacing: 0.5,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  srsBtnSub: { fontSize: 10, color: Colors.text.secondary, marginTop: 2, fontWeight: Typography.weight.semibold },

  // Done screen
  doneScreen: { flex: 1, backgroundColor: Colors.bg.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.pageMargin },
  doneIconBox: { marginBottom: Spacing.lg },
  doneTitle: { fontSize: Typography.text.largeTitle.fontSize, fontWeight: Typography.weight.bold, color: Colors.text.primary, letterSpacing: 1 },
  doneSub: { fontSize: Typography.text.subhead.fontSize, color: Colors.text.secondary, marginTop: Spacing.xs, textAlign: 'center' },
  doneInsetGroup: {
    width: '100%',
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radii.card,
    overflow: 'hidden',
    marginTop: Spacing.xxl,
    marginBottom: Spacing.xxl,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  doneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.cellHorizontal,
    paddingVertical: Spacing.cellVertical,
  },
  cellBorderTop: {
    borderTopWidth: 1,
    borderTopColor: Colors.border.separator,
  },
  doneRowLabel: { fontSize: Typography.text.body.fontSize, color: Colors.text.primary },
  doneRowValue: { fontSize: Typography.text.body.fontSize, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  doneBtn: {
    width: '100%',
    backgroundColor: Colors.accent.indigo,
    borderRadius: Radii.card,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.accent.indigoLight,
  },
  doneBtnText: {
    color: '#F3F4F6',
    fontSize: Typography.text.footnote.fontSize,
    fontWeight: Typography.weight.bold,
    letterSpacing: 1,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
});
