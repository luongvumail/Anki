import React, { useRef, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radii, triggerHaptic } from '../../constants/theme';

const ITEM_HEIGHT = 44;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

interface WheelTimePickerProps {
  hour: number;
  minute: number;
  onHourChange: (hour: number) => void;
  onMinuteChange: (minute: number) => void;
}

export function WheelTimePicker({
  hour,
  minute,
  onHourChange,
  onMinuteChange,
}: WheelTimePickerProps) {
  const hourScrollRef = useRef<ScrollView>(null);
  const minuteScrollRef = useRef<ScrollView>(null);

  React.useEffect(() => {
    setTimeout(() => {
      hourScrollRef.current?.scrollTo({ y: hour * ITEM_HEIGHT, animated: false });
      minuteScrollRef.current?.scrollTo({ y: minute * ITEM_HEIGHT, animated: false });
    }, 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleHourScroll = useCallback(
    (y: number) => {
      const h = Math.round(y / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(23, h));
      onHourChange(clamped);
    },
    [onHourChange]
  );

  const handleMinuteScroll = useCallback(
    (y: number) => {
      const m = Math.round(y / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(59, m));
      onMinuteChange(clamped);
    },
    [onMinuteChange]
  );

  const formattedTime = `${hour < 10 ? '0' : ''}${hour}:${minute < 10 ? '0' : ''}${minute}`;

  return (
    <View style={styles.container}>
      <Text style={styles.subLabel}>CHỌN GIỜ NHẮC HỌC</Text>

      <View style={styles.wheelPickerContainer}>
        {/* Hour Wheel */}
        <View style={styles.wheelColumn}>
          <Text style={styles.wheelLabel}>GIỜ</Text>
          <View style={styles.wheelWrapper}>
            <View style={styles.wheelSelector} pointerEvents="none" />
            <ScrollView
              ref={hourScrollRef}
              style={styles.wheelScroll}
              showsVerticalScrollIndicator={false}
              snapToInterval={ITEM_HEIGHT}
              decelerationRate="fast"
              contentContainerStyle={{ paddingVertical: ITEM_HEIGHT }}
              onMomentumScrollEnd={e => handleHourScroll(e.nativeEvent.contentOffset.y)}
              onScrollEndDrag={e => handleHourScroll(e.nativeEvent.contentOffset.y)}
            >
              {HOURS.map(h => (
                <TouchableOpacity
                  key={h}
                  style={styles.wheelItem}
                  onPress={() => {
                    triggerHaptic('selection');
                    onHourChange(h);
                    hourScrollRef.current?.scrollTo({ y: h * ITEM_HEIGHT, animated: true });
                  }}
                >
                  <Text style={[styles.wheelItemText, hour === h && styles.wheelItemTextActive]}>
                    {h < 10 ? `0${h}` : `${h}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        <Text style={styles.wheelColon}>:</Text>

        {/* Minute Wheel */}
        <View style={styles.wheelColumn}>
          <Text style={styles.wheelLabel}>PHÚT</Text>
          <View style={styles.wheelWrapper}>
            <View style={styles.wheelSelector} pointerEvents="none" />
            <ScrollView
              ref={minuteScrollRef}
              style={styles.wheelScroll}
              showsVerticalScrollIndicator={false}
              snapToInterval={ITEM_HEIGHT}
              decelerationRate="fast"
              contentContainerStyle={{ paddingVertical: ITEM_HEIGHT }}
              onMomentumScrollEnd={e => handleMinuteScroll(e.nativeEvent.contentOffset.y)}
              onScrollEndDrag={e => handleMinuteScroll(e.nativeEvent.contentOffset.y)}
            >
              {MINUTES.map(m => (
                <TouchableOpacity
                  key={m}
                  style={styles.wheelItem}
                  onPress={() => {
                    triggerHaptic('selection');
                    onMinuteChange(m);
                    minuteScrollRef.current?.scrollTo({ y: m * ITEM_HEIGHT, animated: true });
                  }}
                >
                  <Text style={[styles.wheelItemText, minute === m && styles.wheelItemTextActive]}>
                    {m < 10 ? `0${m}` : `${m}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </View>

      <View style={styles.statusRow}>
        <Ionicons name="notifications-outline" size={15} color={Colors.accent.indigoLight} />
        <Text style={styles.statusText}>Nhắc học hàng ngày lúc {formattedTime}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: Colors.border.separator,
    paddingHorizontal: Spacing.cellHorizontal,
    paddingVertical: Spacing.cellVertical,
  },
  subLabel: {
    fontSize: Typography.text.caption2.fontSize,
    color: Colors.text.secondary,
    fontWeight: Typography.weight.bold,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  wheelPickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginVertical: Spacing.xs,
  },
  wheelColumn: {
    alignItems: 'center',
    flex: 1,
  },
  wheelLabel: {
    fontSize: Typography.text.caption2.fontSize,
    color: Colors.text.tertiary,
    fontWeight: Typography.weight.bold,
    letterSpacing: 1,
    marginBottom: 4,
  },
  wheelWrapper: {
    height: 44 * 3,
    overflow: 'hidden',
    borderRadius: Radii.card,
    backgroundColor: Colors.bg.tertiary,
    borderWidth: 1,
    borderColor: Colors.border.default,
    position: 'relative',
  },
  wheelSelector: {
    position: 'absolute',
    top: 44,
    left: 0,
    right: 0,
    height: 44,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.accent.indigo,
    backgroundColor: Colors.accent.indigo + '18',
    zIndex: 1,
  },
  wheelScroll: {
    flex: 1,
  },
  wheelItem: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelItemText: {
    fontSize: 22,
    fontWeight: Typography.weight.medium,
    color: Colors.text.secondary,
    letterSpacing: 1,
  },
  wheelItemTextActive: {
    color: Colors.text.primary,
    fontWeight: Typography.weight.bold,
    fontSize: 24,
  },
  wheelColon: {
    fontSize: 28,
    fontWeight: Typography.weight.bold,
    color: Colors.text.secondary,
    paddingBottom: 16,
    marginHorizontal: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm,
  },
  statusText: {
    fontSize: Typography.text.caption1.fontSize,
    color: Colors.accent.indigoLight,
    fontWeight: Typography.weight.medium,
  },
});
