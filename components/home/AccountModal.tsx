import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Spacing, Typography, Layout, triggerHaptic } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import { useStore } from "../../store/useStore";
import { supabase } from "../../lib/supabase";
import {
  cancelDailyStudyReminder,
  getReminderSettings,
  scheduleDailyStudyReminder,
} from "../../lib/notificationService";
import { WheelTimePicker } from "./WheelTimePicker";
import { SectionTitle } from "../ui/SectionTitle";
import { AppCard } from "../ui/AppCard";
import { AppButton } from "../ui/AppButton";
import { ThemeSwitcher } from "../ui/ThemeSwitcher";

export function AccountModal() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const isAccountModalOpen = useStore((s) => s.isAccountModalOpen);
  const closeAccountModal = useStore((s) => s.closeAccountModal);
  const resetUserState = useStore((s) => s.resetUserState);

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderHour, setReminderHour] = useState(20);
  const [reminderMinute, setReminderMinute] = useState(0);

  useEffect(() => {
    if (!isAccountModalOpen) return;
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUserEmail(data.user.email || null);
        setUserName(
          data.user.user_metadata?.full_name ||
            (data.user.email ? data.user.email.split("@")[0] : "Bạn"),
        );
      }
    });
    getReminderSettings().then((settings) => {
      setReminderEnabled(settings.enabled);
      setReminderHour(settings.hour);
      setReminderMinute(settings.minute);
    });
  }, [isAccountModalOpen]);

  const displayName = userName || (userEmail ? userEmail.split("@")[0] : "Bạn");
  const email = userEmail;

  const handleToggleReminder = async (val: boolean) => {
    setReminderEnabled(val);
    if (val) {
      const ok = await scheduleDailyStudyReminder(reminderHour, reminderMinute);
      if (!ok) {
        setReminderEnabled(false);
        Alert.alert(
          "Cần quyền thông báo",
          "Vui lòng cấp quyền thông báo cho Anki trong Cài đặt điện thoại Android để nhận lời nhắc học tập hàng ngày.",
        );
      }
    } else {
      await cancelDailyStudyReminder();
    }
  };

  const handleHourChange = (hour: number) => {
    setReminderHour(hour);
    if (reminderEnabled) {
      scheduleDailyStudyReminder(hour, reminderMinute);
    }
  };

  const handleMinuteChange = (minute: number) => {
    setReminderMinute(minute);
    if (reminderEnabled) {
      scheduleDailyStudyReminder(reminderHour, minute);
    }
  };

  const handleSignOut = () => {
    Alert.alert("Đăng xuất", "Bạn có chắc chắn muốn đăng xuất tài khoản?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Đăng xuất",
        style: "destructive",
        onPress: async () => {
          closeAccountModal();
          await supabase.auth.signOut();
          resetUserState();
        },
      },
    ]);
  };

  if (!isAccountModalOpen) return null;

  return (
    <Modal
      visible={isAccountModalOpen}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={closeAccountModal}
    >
      <View style={[styles.modalContainer, { backgroundColor: theme.bg }]}>
        {/* Top App Header */}
        <View
          style={[
            styles.headerBar,
            {
              paddingTop: Math.max(insets.top, Spacing.lg),
              backgroundColor: theme.bg,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => {
              triggerHaptic("selection");
              closeAccountModal();
            }}
          >
            <Ionicons name="close" size={Layout.iconLg} color={theme.textMuted} />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
              TÀI KHOẢN & CÀI ĐẶT
            </Text>
            <Text style={[styles.headerSub, { color: theme.textMuted }]}>
              Quản lý thông tin & Cấu hình ứng dụng
            </Text>
          </View>

          <View style={{ width: Layout.avatarMd }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* User Account Info Header */}
          <AppCard style={styles.userInfoCard}>
            <View style={styles.userRow}>
              <View style={[styles.avatarCircle, { backgroundColor: theme.blueDim }]}>
                <Ionicons name="person" size={Layout.iconXl} color={theme.blue} />
              </View>
              <View style={styles.userTextCol}>
                <Text style={[styles.userName, { color: theme.textPrimary }]}>
                  {displayName || "Học viên Anki"}
                </Text>
                <Text style={[styles.userEmail, { color: theme.textMuted }]}>
                  {email || "chua_cap_nhat@email.com"}
                </Text>
              </View>
            </View>
          </AppCard>

          {/* Theme Settings Section */}
          <SectionTitle style={{ marginTop: Spacing.md, marginBottom: 2 }}>GIAO DIỆN</SectionTitle>
          <AppCard style={styles.settingCard}>
            <ThemeSwitcher />
          </AppCard>

          {/* Daily Reminder Settings Section */}
          <SectionTitle style={{ marginTop: Spacing.md, marginBottom: 2 }}>
            NHẮC NHỞ HỌC TẬP
          </SectionTitle>
          <AppCard style={styles.settingCard}>
            <View style={styles.reminderToggleRow}>
              <Text style={[styles.reminderTitle, { color: theme.textPrimary }]}>
                Thông báo mỗi ngày
              </Text>
              <Switch
                value={reminderEnabled}
                onValueChange={(val) => {
                  triggerHaptic("selection");
                  handleToggleReminder(val);
                }}
                trackColor={{
                  false: theme.isDark ? "#334155" : "#CBD5E1",
                  true: theme.green,
                }}
                thumbColor={reminderEnabled ? "#FFFFFF" : theme.isDark ? "#94A3B8" : "#64748B"}
              />
            </View>

            {reminderEnabled && (
              <View style={styles.pickerBox}>
                <WheelTimePicker
                  hour={reminderHour}
                  minute={reminderMinute}
                  onHourChange={handleHourChange}
                  onMinuteChange={handleMinuteChange}
                />
              </View>
            )}
          </AppCard>

          {/* Sign Out Action */}
          <AppButton
            title="ĐĂNG XUẤT TÀI KHOẢN"
            variant="error"
            size="lg"
            onPress={() => {
              triggerHaptic("heavy");
              handleSignOut();
            }}
            style={{ marginTop: Spacing.xl, marginBottom: Spacing.xl }}
          />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.pageMargin,
    paddingBottom: Spacing.cellPadding,
    borderBottomWidth: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
    zIndex: 10,
  },

  headerTitleContainer: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: Typography.callout.fontSize,
    fontWeight: Typography.weight.extraBold,
  },
  headerSub: {
    fontSize: Typography.caption1.fontSize,
    marginTop: 2,
    fontWeight: Typography.weight.semibold,
  },
  closeBtn: {
    padding: Spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: Spacing.pageMargin,
    paddingTop: Spacing.sm,
  },

  userInfoCard: {
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  avatarCircle: {
    width: Layout.fabSize,
    height: Layout.fabSize,
    borderRadius: Layout.fabSize / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  userTextCol: {
    flex: 1,
  },
  userName: {
    fontSize: Typography.titleMD.fontSize,
    fontWeight: Typography.weight.extraBold,
  },
  userEmail: {
    fontSize: Typography.caption.fontSize,
    marginTop: 2,
    fontWeight: Typography.weight.semibold,
  },
  settingCard: {
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
  },

  reminderToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  reminderTitle: {
    fontSize: Typography.subhead.fontSize,
    fontWeight: Typography.weight.semibold,
  },
  pickerBox: {
    marginTop: Spacing.xs,
    paddingTop: Spacing.xs,
  },
});
