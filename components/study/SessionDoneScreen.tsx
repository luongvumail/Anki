import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radii, triggerHaptic } from '../../constants/theme';
import { StudySession } from '../../store/slices/types';

interface SessionDoneScreenProps {
  session: StudySession;
  onDone: () => void;
}

export function SessionDoneScreen({ session, onDone }: SessionDoneScreenProps) {
  const insets = useSafeAreaInsets();
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
          onDone();
        }}
        activeOpacity={0.8}
      >
        <Text style={styles.doneBtnText}>DONE</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
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
