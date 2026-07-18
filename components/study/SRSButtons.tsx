import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SRS_GRADES, getIntervalLabel, SRSState } from '../../lib/srs';
import { Colors, Typography, Spacing, Radii } from '../../constants/theme';

interface SRSButtonsProps {
  cardSRS: SRSState;
  onGrade: (grade: number, direction: 'left' | 'right' | 'up' | 'down') => void;
}

export function SRSButtons({ cardSRS, onGrade }: SRSButtonsProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.srsArea, { paddingBottom: Math.max(insets.bottom + 16, 24) }]}>
      <Text style={styles.srsLabel}>SELECT RECALL DIFFICULTY:</Text>
      <View style={styles.srsRow}>
        <SRSButton
          label="AGAIN (👈)"
          sub={getIntervalLabel(SRS_GRADES.AGAIN, cardSRS)}
          color={Colors.srs.again}
          onPress={() => onGrade(SRS_GRADES.AGAIN, 'left')}
        />
        <SRSButton
          label="HARD (👆)"
          sub={getIntervalLabel(SRS_GRADES.HARD, cardSRS)}
          color={Colors.srs.hard}
          onPress={() => onGrade(SRS_GRADES.HARD, 'up')}
        />
        <SRSButton
          label="GOOD (👉)"
          sub={getIntervalLabel(SRS_GRADES.GOOD, cardSRS)}
          color={Colors.srs.good}
          onPress={() => onGrade(SRS_GRADES.GOOD, 'right')}
        />
      </View>
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
});
