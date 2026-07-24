import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { auth } from "../../lib/firebase";
import { Colors, Radii, Spacing, triggerHaptic } from "../../constants/theme";

interface DuolingoHeaderProps {
  userName?: string;
  courseName?: string;
  streakCount?: number;
  gemsCount?: number;
  heartsCount?: number;
  onProfilePress?: () => void;
  onStreakPress?: () => void;
  onGemsPress?: () => void;
  onHeartsPress?: () => void;
}

export function DuolingoHeader({
  userName,
  streakCount = 1,
  onProfilePress,
  onStreakPress,
}: DuolingoHeaderProps) {
  const insets = useSafeAreaInsets();
  const authUser = auth.currentUser;
  const resolvedName =
    userName || authUser?.displayName || (authUser?.email ? authUser.email.split("@")[0] : "Bạn");

  return (
    <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top + 8, 44) }]}>
      {/* Friendly User Greeting - Synchronized & Unified across all screens */}
      <View style={styles.courseSelector}>
        <Text style={styles.courseTitleText}>Xin chào, {resolvedName}</Text>
      </View>

      {/* Top Indicators Row: Streak Only with Vector Icons */}
      <View style={styles.statsRow}>
        {/* Streak Pill */}
        <TouchableOpacity
          style={styles.statPill}
          activeOpacity={0.8}
          onPress={() => {
            triggerHaptic("light");
            if (onStreakPress) onStreakPress();
          }}
        >
          <Ionicons name="flame" size={16} color={Colors.duolingo.yellow} />
          <Text style={[styles.statValue, { color: Colors.duolingo.yellow }]}>{streakCount}</Text>
        </TouchableOpacity>

        {/* Profile Avatar */}
        {onProfilePress ? (
          <TouchableOpacity
            style={styles.avatarBtn}
            onPress={() => {
              triggerHaptic("light");
              onProfilePress();
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="person-circle" size={28} color={Colors.duolingo.blue} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.space4,
    paddingBottom: Spacing.space2,
    backgroundColor: Colors.duolingo.bg,
    borderBottomWidth: 2,
    borderBottomColor: Colors.duolingo.cardBorder,
  },
  courseSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.duolingo.cardBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.full,
    borderBottomWidth: 2,
    borderBottomColor: Colors.duolingo.cardBottom,
  },
  courseTitleText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.duolingo.cardBg,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.full,
    borderBottomWidth: 2,
    borderBottomColor: Colors.duolingo.cardBottom,
  },
  statValue: {
    fontSize: 13,
    fontWeight: "800",
  },
  avatarBtn: {
    paddingLeft: 2,
  },
});
