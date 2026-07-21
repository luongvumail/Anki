import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "../../lib/firebase";
import { getAuthErrorMessage } from "../../lib/errorHandler";
import {
  getReminderSettings,
  scheduleDailyStudyReminder,
  cancelDailyStudyReminder,
  sendTestNotification,
  requestNotificationPermissions,
} from "../../lib/notificationService";
import { useStore } from "../../store/useStore";
import { Colors, Typography, Spacing, Radii, triggerHaptic } from "../../constants/theme";
import { DeckIcon } from "../../components/ui/DeckIcon";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { SectionTitle } from "../../components/ui/SectionTitle";
import { AccountModal } from "../../components/home/AccountModal";
import { AnimatedButton } from "../../components/ui/AnimatedButton";
import {
  computeDueCount,
  computeNewCount,
  computeReviewDueCount,
  computeLearnedCount,
  getDeckMasteryPct,
} from "../../lib/deckUtils";

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const decks = useStore((s) => s.decks);
  const fetchDecks = useStore((s) => s.fetchDecks);
  const isLoading = useStore((s) => s.isLoading);
  const userId = useStore((s) => s.userId);
  const cardsState = useStore((s) => s.cards);
  const [refreshing, setRefreshing] = useState(false);

  // Account Settings Modal States
  const [showAccountModal, setShowAccountModal] = useState(false);

  // Daily Study Reminder States
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderHour, setReminderHour] = useState(20);
  const [reminderMinute, setReminderMinute] = useState(0);
  const scheduleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const user = auth.currentUser;

  const todayDateStr = new Date()
    .toLocaleDateString("vi-VN", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })
    .toUpperCase();

  const displayName = user?.displayName || user?.email?.split("@")[0] || "Học viên";
  // 1 single character for circular avatar
  const initials = displayName.slice(0, 1).toUpperCase();

  const {
    totalCards,
    totalDue,
    totalNew,
    totalReview,
    totalLearned,
    progressPct,
    heroTitleText,
    subLabelText,
  } = useMemo(() => {
    const totalCardsVal = decks.reduce((s, d) => {
      const deckCards = cardsState[d.id];
      return s + (deckCards ? deckCards.length : d.cardCount || 0);
    }, 0);

    const totalDueVal = decks.reduce((s, d) => {
      const deckCards = cardsState[d.id];
      return s + (deckCards ? computeDueCount(deckCards) : d.dueCount || 0);
    }, 0);

    const totalNewVal = decks.reduce((s, d) => {
      const deckCards = cardsState[d.id];
      return s + (deckCards ? computeNewCount(deckCards) : d.newCount || 0);
    }, 0);

    const totalReviewVal = decks.reduce((s, d) => {
      const deckCards = cardsState[d.id];
      return (
        s +
        (deckCards
          ? computeReviewDueCount(deckCards)
          : Math.max(0, (d.dueCount || 0) - (d.newCount || 0)))
      );
    }, 0);

    const totalLearnedVal = decks.reduce((s, d) => {
      const deckCards = cardsState[d.id];
      if (deckCards) return s + computeLearnedCount(deckCards);
      const count = d.cardCount || 0;
      const due = d.dueCount || 0;
      return s + Math.max(0, count - due);
    }, 0);

    const progressPctVal =
      totalCardsVal > 0 ? Math.round((totalLearnedVal / totalCardsVal) * 100) : 0;

    let heroTitle = "HOÀN THÀNH ÔN TẬP HÔM NAY";
    if (totalDueVal > 0) {
      if (totalReviewVal > 0 && totalNewVal > 0) {
        heroTitle = `${totalDueVal} THẺ CẦN HỌC HÔM NAY`;
      } else if (totalNewVal > 0) {
        heroTitle = `${totalNewVal} THẺ MỚI CẦN HỌC`;
      } else {
        heroTitle = `${totalReviewVal} THẺ CẦN ÔN TẬP`;
      }
    }

    let subLabel = "";
    if (totalDueVal > 0) {
      if (totalReviewVal > 0 && totalNewVal > 0) {
        subLabel = `${totalNewVal} THẺ MỚI  •  ${totalReviewVal} CẦN ÔN`;
      } else if (totalNewVal > 0) {
        subLabel = `${totalNewVal} THẺ MỚI`;
      } else {
        subLabel = `${totalReviewVal} THẺ CẦN ÔN`;
      }
    } else {
      subLabel = `${totalLearnedVal}/${totalCardsVal} THẺ ĐÃ THUỘC`;
    }

    return {
      totalCards: totalCardsVal,
      totalDue: totalDueVal,
      totalNew: totalNewVal,
      totalReview: totalReviewVal,
      totalLearned: totalLearnedVal,
      progressPct: progressPctVal,
      heroTitleText: heroTitle,
      subLabelText: subLabel,
    };
  }, [decks, cardsState]);

  useEffect(() => {
    // _layout.tsx already awaits fetchDecks() before navigating here on boot/login,
    // so only re-fetch if decks haven't been loaded yet (avoids double-fetch + loading jump).
    if (userId && decks.length === 0) fetchDecks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Load reminder settings on mount
  useEffect(() => {
    async function loadReminder() {
      const settings = await getReminderSettings();
      setReminderEnabled(settings.enabled);
      setReminderHour(settings.hour);
      setReminderMinute(settings.minute);
    }
    loadReminder();
    return () => {
      if (scheduleDebounceRef.current) {
        clearTimeout(scheduleDebounceRef.current);
      }
    };
  }, []);

  // Safety check: If user is logging out, return a dark view immediately to avoid layout/white flash
  if (!userId || !user) {
    return <View style={{ flex: 1, backgroundColor: Colors.bg.primary }} />;
  }

  const onRefresh = async () => {
    triggerHaptic("light");
    setRefreshing(true);
    await fetchDecks();
    setRefreshing(false);
  };

  const handleToggleReminder = async (value: boolean) => {
    triggerHaptic("selection");
    setReminderEnabled(value);
    if (value) {
      const hasPermission = await requestNotificationPermissions();
      if (!hasPermission) {
        triggerHaptic("error");
        setReminderEnabled(false);
        Alert.alert(
          "Quyền thông báo",
          'Vui lòng mở Cài đặt iPhone > Anki > Thông báo và bật "Cho phép thông báo" để nhận nhắc nhở hàng ngày.',
        );
        return;
      }

      const success = await scheduleDailyStudyReminder(reminderHour, reminderMinute);
      if (success) {
        triggerHaptic("success");
        const formattedTime = `${reminderHour < 10 ? "0" : ""}${reminderHour}:${reminderMinute < 10 ? "0" : ""}${reminderMinute}`;
        Alert.alert(
          "Đã bật nhắc nhở hàng ngày",
          `Ứng dụng Anki sẽ nhắc bạn vào học lúc ${formattedTime} hàng ngày.`,
        );
      } else {
        triggerHaptic("error");
        setReminderEnabled(false);
        Alert.alert(
          "Không thể tạo nhắc nhở",
          "Đã xảy ra lỗi khi tạo lịch nhắc nhở. Vui lòng thử lại sau.",
        );
      }
    } else {
      await cancelDailyStudyReminder();
      triggerHaptic("light");
    }
  };

  const handleHourChange = (h: number) => {
    setReminderHour(h);
    if (reminderEnabled) {
      if (scheduleDebounceRef.current) clearTimeout(scheduleDebounceRef.current);
      scheduleDebounceRef.current = setTimeout(() => {
        scheduleDailyStudyReminder(h, reminderMinute);
      }, 400);
    }
  };

  const handleMinuteChange = (m: number) => {
    setReminderMinute(m);
    if (reminderEnabled) {
      if (scheduleDebounceRef.current) clearTimeout(scheduleDebounceRef.current);
      scheduleDebounceRef.current = setTimeout(() => {
        scheduleDailyStudyReminder(reminderHour, m);
      }, 400);
    }
  };

  const handleSignOut = () => {
    triggerHaptic("warning");
    Alert.alert("Đăng xuất", "Bạn có chắc chắn muốn đăng xuất tài khoản?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Đăng xuất",
        style: "destructive",
        onPress: async () => {
          setShowAccountModal(false);
          await auth.signOut();
          useStore.setState({ decks: [], cards: {}, session: null, userId: null });
        },
      },
    ]);
  };

  const handleChangePassword = async (currentPassword: string, newPassword: string) => {
    if (!user || !user.email) return;
    if (!newPassword || newPassword.length < 6) {
      triggerHaptic("warning");
      Alert.alert("Thông báo", "Mật khẩu mới cần ít nhất 6 ký tự");
      return;
    }

    triggerHaptic("medium");
    try {
      if (currentPassword) {
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
      }
      await updatePassword(user, newPassword);
      triggerHaptic("success");
      Alert.alert("Thành công", "Mật khẩu của bạn đã được cập nhật thành công!");
    } catch (e: any) {
      triggerHaptic("error");
      Alert.alert("Đổi mật khẩu thất bại", getAuthErrorMessage(e));
      throw e;
    }
  };

  const handleSendResetEmail = async () => {
    if (!user || !user.email) return;
    triggerHaptic("medium");
    try {
      await sendPasswordResetEmail(auth, user.email);
      triggerHaptic("success");
      Alert.alert(
        "Đã gửi email khôi phục",
        `Hướng dẫn đặt lại mật khẩu đã được gửi tới ${user.email}.\nVui lòng kiểm tra hộp thư của bạn.`,
      );
    } catch (e: any) {
      triggerHaptic("error");
      Alert.alert("Không thể gửi email", getAuthErrorMessage(e));
      throw e;
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: Math.max(insets.top + 16, 54),
          paddingBottom: Math.max(insets.bottom + 90, 110),
        },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Colors.accent.gray}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Linear App Header Bar */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubhead}>{todayDateStr}</Text>
          <Text style={styles.headerTitle}>Xin chào, {displayName}</Text>
        </View>

        {/* 1 Single Character Circular Avatar */}
        <AnimatedButton
          style={styles.avatarBtn}
          onPress={() => {
            setShowAccountModal(true);
          }}
          hapticType="selection"
        >
          <Text style={styles.avatarText}>{initials}</Text>
        </AnimatedButton>
      </View>

      {/* Hero Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <Text style={styles.heroSectionTitle}>{heroTitleText}</Text>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>{decks.length} BỘ THẺ</Text>
          </View>
        </View>

        <ProgressBar progress={progressPct} style={{ marginTop: Spacing.md }} />

        <View style={styles.progressLabels}>
          <Text style={styles.progressText}>{subLabelText}</Text>
          <Text style={styles.progressText}>{progressPct}% TỶ LỆ THUỘC</Text>
        </View>

        <AnimatedButton
          style={[styles.primaryBtn, totalCards > 0 && totalDue === 0 && styles.primaryBtnDisabled]}
          onPress={() => {
            if (totalCards === 0) {
              router.push("/add" as any);
              return;
            }
            const firstDue =
              decks.find((d) => {
                const deckCards = cardsState[d.id];
                const due = deckCards ? computeDueCount(deckCards) : d.dueCount || 0;
                return due > 0;
              }) || decks[0];
            if (firstDue) router.push(`/study/${firstDue.id}`);
          }}
          disabled={totalCards > 0 && totalDue === 0}
          hapticType="medium"
          activeScale={0.97}
        >
          <Ionicons
            name={totalCards === 0 ? "add-circle" : totalDue > 0 ? "play" : "checkmark-circle"}
            size={18}
            color="#F0F3F6"
            style={{ marginRight: 6 }}
          />
          <Text style={styles.primaryBtnText}>
            {totalCards === 0
              ? "Thêm từ vựng mới với AI"
              : totalDue > 0
                ? "Bắt đầu học ngay"
                : "Đã hoàn thành ôn tập hôm nay ✓"}
          </Text>
        </AnimatedButton>
      </View>

      {/* Decks Section Header */}
      <SectionTitle>DANH SÁCH BỘ THẺ</SectionTitle>

      {isLoading && decks.length === 0 && !refreshing ? (
        <ActivityIndicator color={Colors.accent.indigoLight} style={{ marginTop: 30 }} />
      ) : decks.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons
            name="journal-outline"
            size={36}
            color={Colors.text.secondary}
            style={{ marginBottom: Spacing.sm }}
          />
          <Text style={styles.emptyTitle}>Chưa có bộ thẻ nào</Text>
          <Text style={styles.emptySub}>
            Tạo bộ thẻ đầu tiên để bắt đầu lưu từ vựng Tiếng Trung
          </Text>
          <AnimatedButton
            style={styles.emptyBtn}
            onPress={() => {
              router.push("/decks" as any);
            }}
            hapticType="medium"
          >
            <Text style={styles.emptyBtnText}>+ TẠO BỘ THẺ MỚI</Text>
          </AnimatedButton>
        </View>
      ) : (
        <View style={styles.decksGroup}>
          {decks.map((deck, idx) => {
            const deckCards = useStore.getState().cards[deck.id];
            const due = deckCards ? computeDueCount(deckCards) : deck.dueCount || 0;
            const newCount = deckCards ? computeNewCount(deckCards) : deck.newCount || 0;
            const total = deck.cardCount || 0;
            const pct = getDeckMasteryPct(total, due, deckCards);
            return (
              <React.Fragment key={deck.id}>
                {idx > 0 && <View style={styles.cellDividerIndented} />}
                <TouchableOpacity
                  style={styles.deckRow}
                  onPress={() => {
                    triggerHaptic("light");
                    router.push(`/deck/${deck.id}` as any);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.deckIconTile}>
                    <DeckIcon name={deck.icon} size={16} color={Colors.accent.indigoLight} />
                  </View>
                  <View style={styles.deckMeta}>
                    <Text style={styles.deckName} numberOfLines={1}>
                      {deck.name}
                    </Text>
                    <Text style={styles.deckSub}>
                      {total > 0 ? `${total} thẻ  •  ${pct}% thuộc` : "Chưa có thẻ vựng"}
                    </Text>
                  </View>
                  {total === 0 ? (
                    <Text style={styles.emptyDeckText}>CHƯA CÓ THẺ</Text>
                  ) : due > 0 ? (
                    <View style={styles.dueBadge}>
                      <Text style={styles.dueBadgeText}>{due} ÔN</Text>
                    </View>
                  ) : newCount > 0 ? (
                    <View style={styles.dueBadge}>
                      <Text style={styles.dueBadgeText}>{newCount} MỚI</Text>
                    </View>
                  ) : (
                    <Text style={styles.doneText}>HOÀN THÀNH</Text>
                  )}
                  <Ionicons
                    name="chevron-forward"
                    size={15}
                    color={Colors.accent.gray3}
                    style={{ marginLeft: 6 }}
                  />
                </TouchableOpacity>
              </React.Fragment>
            );
          })}
        </View>
      )}

      {/* Account Settings Page Sheet Modal */}
      <AccountModal
        visible={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        displayName={displayName}
        email={user?.email || null}
        reminderEnabled={reminderEnabled}
        reminderHour={reminderHour}
        reminderMinute={reminderMinute}
        onToggleReminder={handleToggleReminder}
        onHourChange={handleHourChange}
        onMinuteChange={handleMinuteChange}
        onChangePassword={handleChangePassword}
        onSendResetEmail={handleSendResetEmail}
        onSignOut={handleSignOut}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  content: { paddingHorizontal: Spacing.pageMargin },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  headerSubhead: {
    fontSize: Typography.text.caption1.fontSize,
    lineHeight: Typography.text.caption1.lineHeight,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.secondary,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    letterSpacing: -0.3,
  },
  largeTitle: {
    fontSize: Typography.text.largeTitle.fontSize,
    lineHeight: Typography.text.largeTitle.lineHeight,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    letterSpacing: 0.37,
  },
  linearBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.bg.secondary,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.neon.emerald,
  },
  linearBadgeText: {
    fontSize: Typography.text.caption2.fontSize,
    color: Colors.text.secondary,
    fontWeight: Typography.weight.semibold,
  },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18, // Perfect Circle for 1-char avatar
    backgroundColor: Colors.bg.secondary,
    borderWidth: 1,
    borderColor: Colors.border.default,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: Typography.text.subhead.fontSize,
    fontWeight: Typography.weight.bold,
    color: Colors.accent.indigoLight,
    textAlign: "center",
    textAlignVertical: "center",
    includeFontPadding: false,
  },
  heroCard: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radii.card,
    padding: Spacing.cellHorizontal,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  heroSectionTitle: {
    fontSize: Typography.text.caption1.fontSize,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.secondary,
    letterSpacing: 1.2,
  },
  heroBadge: {
    backgroundColor: Colors.bg.tertiary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  heroBadgeText: {
    fontSize: Typography.text.caption2.fontSize,
    color: Colors.accent.indigoLight,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.5,
  },
  heroCountRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginVertical: 6,
  },
  heroCount: {
    fontSize: 42,
    lineHeight: 48,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  heroUnit: {
    fontSize: Typography.text.caption1.fontSize,
    color: Colors.text.secondary,
    fontWeight: Typography.weight.semibold,
    letterSpacing: 1,
    marginLeft: 6,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    marginBottom: Spacing.lg,
  },
  progressText: {
    fontSize: Typography.text.caption2.fontSize,
    color: Colors.text.secondary,
    fontWeight: Typography.weight.semibold,
    letterSpacing: 0.5,
  },
  primaryBtn: {
    backgroundColor: Colors.accent.indigo,
    borderRadius: Radii.card,
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnDisabled: {
    backgroundColor: Colors.bg.tertiary,
    opacity: 0.6,
  },
  primaryBtnText: {
    color: "#F0F3F6",
    fontSize: Typography.text.callout.fontSize,
    fontWeight: Typography.weight.semibold,
    letterSpacing: -0.2,
    textAlign: "center",
    textAlignVertical: "center",
    includeFontPadding: false,
  },
  metricsGroup: {
    flexDirection: "row",
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radii.card,
    paddingVertical: Spacing.cellVertical,
    marginBottom: Spacing.xl,
  },
  metricCol: { flex: 1, alignItems: "center" },
  metricValue: {
    fontSize: Typography.text.title2.fontSize,
    lineHeight: Typography.text.title2.lineHeight,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  metricLabel: {
    fontSize: Typography.text.caption2.fontSize,
    color: Colors.text.secondary,
    fontWeight: Typography.weight.semibold,
    letterSpacing: 0.8,
    marginTop: 2,
  },
  metricSeparator: { width: 1, backgroundColor: Colors.border.separator },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sectionBottom,
    paddingHorizontal: 4,
  },
  sectionLink: {
    fontSize: Typography.text.footnote.fontSize,
    color: Colors.accent.indigoLight,
    fontWeight: Typography.weight.semibold,
  },
  decksGroup: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radii.card,
    overflow: "hidden",
  },
  deckRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.cellHorizontal,
    paddingVertical: Spacing.cellVertical,
    minHeight: Spacing.cellMinHeight,
  },
  cellDividerIndented: {
    height: 1,
    backgroundColor: Colors.border.separator,
    marginLeft: 56,
  },
  deckIconTile: {
    width: 32,
    height: 32,
    borderRadius: Radii.icon,
    backgroundColor: Colors.bg.tertiary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  deckMeta: { flex: 1 },
  deckName: {
    fontSize: Typography.text.body.fontSize,
    lineHeight: Typography.text.body.lineHeight,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
  },
  deckSub: {
    fontSize: Typography.text.footnote.fontSize,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  dueBadge: {
    backgroundColor: Colors.bg.tertiary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  dueBadgeText: {
    fontSize: Typography.text.caption2.fontSize,
    color: Colors.accent.indigoLight,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.5,
  },
  doneText: {
    fontSize: Typography.text.caption2.fontSize,
    color: Colors.neon.emerald,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.5,
  },
  emptyDeckText: {
    fontSize: Typography.text.caption2.fontSize,
    color: Colors.text.tertiary,
    fontWeight: Typography.weight.semibold,
    letterSpacing: 0.5,
  },
  emptyCard: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radii.card,
    padding: Spacing.xl,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: Typography.text.headline.fontSize,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
  },
  emptySub: {
    fontSize: Typography.text.subhead.fontSize,
    color: Colors.text.secondary,
    marginTop: 4,
    marginBottom: Spacing.lg,
    textAlign: "center",
  },
  emptyBtn: {
    backgroundColor: Colors.accent.indigo,
    paddingHorizontal: Spacing.xl,
    height: 44,
    borderRadius: Radii.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.accent.indigoLight,
  },
  emptyBtnText: {
    color: "#F3F4F6",
    fontWeight: Typography.weight.bold,
    fontSize: Typography.text.subhead.fontSize,
    letterSpacing: 0.5,
    textAlign: "center",
    textAlignVertical: "center",
    includeFontPadding: false,
  },
});
