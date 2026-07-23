import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, triggerHaptic } from "../../constants/theme";
import { StudySession } from "../../store/slices/types";
import { DuolingoCard } from "../ui/DuolingoCard";
import { DuolingoButton } from "../ui/DuolingoButton";
import { ProgressBar } from "../ui/ProgressBar";
import { DuolingoMascot } from "../ui/DuolingoMascot";

interface SessionDoneScreenProps {
  session: StudySession;
  onDone: () => void;
}

export function SessionDoneScreen({ session, onDone }: SessionDoneScreenProps) {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    triggerHaptic("success");
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const accuracy =
    session.reviewedCount > 0
      ? Math.round((session.correctCount / session.reviewedCount) * 100)
      : 0;

  const xpEarned = session.correctCount * 10 + 20;

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
        <DuolingoMascot expression="celebrate" size={90} speechBubbleText="Xuất sắc! 太棒了!" />
        <Text style={styles.doneTitle}>HOÀN THÀNH BÀI HỌC!</Text>
        <Text style={styles.doneSub}>Bạn đã hoàn thành tất cả mục tiêu bài học hôm nay</Text>

        {/* Celebratory Stats Grid Cards */}
        <View style={styles.statsGrid}>
          <DuolingoCard style={styles.statBox}>
            <Ionicons name="checkmark-circle" size={22} color={Colors.duolingo.green} />
            <Text style={[styles.statVal, { color: Colors.duolingo.green }]}>{accuracy}%</Text>
            <Text style={styles.statLabel}>ĐỘ CHÍNH XÁC</Text>
          </DuolingoCard>
        </View>

        {/* XP Daily Goal Progress */}
        <DuolingoCard style={styles.dailyGoalCard}>
          <View style={styles.dailyGoalRow}>
            <Text style={styles.dailyGoalTitle}>MỤC TIÊU XP HÀNG NGÀY</Text>
            <Text style={styles.dailyGoalValue}>{xpEarned} / 50 XP</Text>
          </View>
          <ProgressBar
            progress={Math.min(1, xpEarned / 50)}
            height={12}
            fillColor={Colors.duolingo.green}
            style={{ marginTop: Spacing.xs }}
          />
        </DuolingoCard>

        {/* 3D Full-Width Primary Continue Button */}
        <DuolingoButton
          title="TIẾP TỤC ➜"
          variant="primary"
          onPress={() => {
            triggerHaptic("medium");
            onDone();
          }}
          height={54}
          style={{ marginTop: Spacing.lg }}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  doneScreen: {
    flex: 1,
    backgroundColor: Colors.duolingo.bg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.pageMargin,
  },
  innerContent: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  doneIconBox: { marginBottom: Spacing.sm },
  doneTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  doneSub: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 4,
    marginBottom: Spacing.xl,
    textAlign: "center",
  },

  statsGrid: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    marginBottom: Spacing.md,
  },
  statBox: {
    flex: 1,
    padding: Spacing.md,
    alignItems: "center",
  },
  statEmoji: { fontSize: 22, marginBottom: 2 },
  statVal: { fontSize: 22, fontWeight: "800", marginTop: 2 },
  statLabel: {
    fontSize: 11,
    color: Colors.text.secondary,
    fontWeight: "700",
    marginTop: 2,
    letterSpacing: 0.5,
  },

  dailyGoalCard: {
    width: "100%",
    padding: Spacing.md,
  },
  dailyGoalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  dailyGoalTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.text.secondary,
    letterSpacing: 0.5,
  },
  dailyGoalValue: { fontSize: 12, fontWeight: "800", color: Colors.duolingo.green },
});
