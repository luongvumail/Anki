import React, { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, Radii, triggerHaptic } from "../../constants/theme";
import { StudySession } from "../../store/slices/types";

interface SessionDoneScreenProps {
  session: StudySession;
  onDone: () => void;
}

export function SessionDoneScreen({ session, onDone }: SessionDoneScreenProps) {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const accuracy =
    session.reviewedCount > 0
      ? Math.round((session.correctCount / session.reviewedCount) * 100)
      : 0;

  return (
    <View
      style={[
        styles.doneScreen,
        {
          paddingTop: Math.max(insets.top + 20, 50),
          paddingBottom: Math.max(insets.bottom + 20, 30),
        },
      ]}
    >
      <Animated.View style={[styles.innerContent, { opacity: fadeAnim }]}>
        <View style={styles.doneIconBox}>
          <Ionicons name="checkmark-circle" size={56} color={Colors.neon.emerald} />
        </View>
        <Text style={styles.doneTitle}>HOÀN THÀNH</Text>
        <Text style={styles.doneSub}>Bạn đã hoàn thành tất cả thẻ cần ôn tập hôm nay!</Text>

        <View style={styles.doneInsetGroup}>
          <View style={styles.doneRow}>
            <Text style={styles.doneRowLabel}>Tổng số thẻ đã học</Text>
            <Text style={styles.doneRowValue}>{session.reviewedCount} thẻ</Text>
          </View>
          <View style={[styles.doneRow, styles.cellBorderTop]}>
            <Text style={styles.doneRowLabel}>Tỷ lệ nhớ đúng</Text>
            <Text style={[styles.doneRowValue, { color: Colors.neon.emerald }]}>{accuracy}%</Text>
          </View>
          <View style={[styles.doneRow, styles.cellBorderTop]}>
            <Text style={styles.doneRowLabel}>Thẻ chưa thuộc (Quên)</Text>
            <Text style={[styles.doneRowValue, { color: Colors.neon.coral }]}>
              {session.reviewedCount - session.correctCount}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.doneBtn}
          onPress={() => {
            triggerHaptic("medium");
            onDone();
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.doneBtnText}>HOÀN THÀNH</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  doneScreen: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.pageMargin,
  },
  innerContent: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  doneIconBox: { marginBottom: Spacing.lg },
  doneTitle: {
    fontSize: Typography.text.largeTitle.fontSize,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    letterSpacing: 1,
  },
  doneSub: {
    fontSize: Typography.text.subhead.fontSize,
    color: Colors.text.secondary,
    marginTop: Spacing.xs,
    textAlign: "center",
  },
  doneInsetGroup: {
    width: "100%",
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radii.card,
    overflow: "hidden",
    marginTop: Spacing.xxl,
    marginBottom: Spacing.xxl,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  doneRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.cellHorizontal,
    paddingVertical: Spacing.cellVertical,
  },
  cellBorderTop: {
    borderTopWidth: 1,
    borderTopColor: Colors.border.separator,
  },
  doneRowLabel: { fontSize: Typography.text.body.fontSize, color: Colors.text.primary },
  doneRowValue: {
    fontSize: Typography.text.body.fontSize,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  doneBtn: {
    width: "100%",
    backgroundColor: Colors.accent.indigo,
    borderRadius: Radii.card,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.accent.indigo,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  doneBtnText: {
    color: "#F0F3F6",
    fontSize: Typography.text.callout.fontSize,
    fontWeight: Typography.weight.semibold,
    letterSpacing: -0.2,
    textAlign: "center",
    textAlignVertical: "center",
    includeFontPadding: false,
  },
});
