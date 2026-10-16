import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Spacing, Typography, Layout, triggerHaptic } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import { StudySession } from "../../store/slices/types";
import { useStore } from "../../store/useStore";
import { getStreakCount } from "../../lib/reviewTracker";
import { AppCard } from "../ui/AppCard";
import { AppButton } from "../ui/AppButton";
import { AppMascot } from "../ui/AppMascot";

interface SessionDoneScreenProps {
  session: StudySession;
  onDone: () => void;
}

export function SessionDoneScreen({ session, onDone }: SessionDoneScreenProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const addXP = useStore((s) => s.addXP);
  const checkAndUnlockBadges = useStore((s) => s.checkAndUnlockBadges);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const earnedXP = Math.max(15, (session.reviewedCount || 0) * 10);

  useEffect(() => {
    triggerHaptic("success");
    addXP(earnedXP);

    // Calculate learned cards and streak count to check and unlock badges real-time
    const allCards = useStore.getState().cards;
    let totalLearned = 0;
    Object.values(allCards).forEach((deckList) => {
      totalLearned += deckList.filter((c) => c.srs && c.srs.repetitions > 0).length;
    });

    getStreakCount().then((streak) => {
      checkAndUnlockBadges(streak, totalLearned);
    });

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

  const mascotExpression = accuracy >= 80 ? "celebrate" : accuracy >= 50 ? "happy" : "thinking";
  const mascotSpeech =
    accuracy >= 80 ? "Xuất sắc! 太棒了!" : accuracy >= 50 ? "Khá tốt! 加油!" : "Cần ôn thêm!";
  const doneTitle = accuracy >= 50 ? "HOÀN THÀNH BÀI HỌC!" : "CẦN ÔN TẬP THÊM!";
  const doneSub =
    accuracy >= 80
      ? "Bạn đã hoàn thành xuất sắc mục tiêu bài học hôm nay!"
      : accuracy >= 50
        ? "Bạn đã vượt qua bài học! Hãy tiếp tục duy trì phong độ nhé."
        : "Phiên học đã kết thúc. Hãy dành thêm thời gian ôn lại các từ khó!";

  return (
    <View
      style={[
        styles.doneScreen,
        {
          backgroundColor: theme.bg,
          paddingTop: Math.max(insets.top + Spacing.lg, Spacing.xxl),
          paddingBottom: Math.max(insets.bottom + Spacing.lg, Spacing.xl),
        },
      ]}
    >
      <Animated.View style={[styles.innerContent, { opacity: fadeAnim }]}>
        <AppMascot
          expression={mascotExpression}
          size={Layout.avatarXl}
          speechBubbleText={mascotSpeech}
        />
        <Text style={[styles.doneTitle, { color: theme.textPrimary }]}>{doneTitle}</Text>
        <Text style={[styles.doneSub, { color: theme.textMuted }]}>{doneSub}</Text>

        {/* Celebratory Stats Grid Cards (3 Balanced Boxes: Accuracy %, Reviewed Count, Earned XP) */}
        <View style={styles.statsGrid}>
          <AppCard style={styles.statBox}>
            <Text style={[styles.statVal, { color: theme.green }]}>{accuracy}%</Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>CHÍNH XÁC</Text>
          </AppCard>

          <AppCard style={styles.statBox}>
            <Text style={[styles.statVal, { color: theme.blue }]}>{session.reviewedCount}</Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>TỪ ĐÃ ÔN</Text>
          </AppCard>

          <AppCard style={styles.statBox}>
            <Text style={[styles.statVal, { color: theme.yellow }]}>+{earnedXP}</Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>KINH NGHIỆM</Text>
          </AppCard>
        </View>

        {/* 3D Full-Width Primary Continue Button */}
        <AppButton
          title="TIẾP TỤC"
          icon={<Ionicons name="arrow-forward" size={Layout.iconMd} color="#FFFFFF" />}
          variant="primary"
          size="lg"
          onPress={onDone}
          style={{ marginTop: Spacing.lg }}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  doneScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.pageMargin,
  },
  innerContent: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  doneTitle: {
    fontSize: Typography.title1.fontSize,
    fontWeight: Typography.weight.extraBold,
    letterSpacing: 0.5,
    textAlign: "center",
    marginTop: Spacing.md,
  },
  doneSub: {
    fontSize: Typography.subhead.fontSize,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xl,
    textAlign: "center",
  },

  statsGrid: {
    flexDirection: "row",
    gap: Spacing.cellPadding,
    width: "100%",
    marginBottom: Spacing.md,
  },
  statBox: {
    flex: 1,
    padding: Spacing.md,
    alignItems: "center",
  },
  statVal: {
    fontSize: Typography.titleLG.fontSize,
    fontWeight: Typography.weight.extraBold,
    marginTop: 2,
  },
  statLabel: {
    fontSize: Typography.caption2.fontSize,
    fontWeight: Typography.weight.bold,
    marginTop: 2,
    letterSpacing: 0.5,
  },
});
