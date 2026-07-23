import React, { useState } from "react";
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
import { Colors, Spacing, Radii, triggerHaptic } from "../../constants/theme";
import { FormField } from "../ui/FormField";
import { WheelTimePicker } from "./WheelTimePicker";
import { SectionTitle } from "../ui/SectionTitle";
import { DuolingoCard } from "../ui/DuolingoCard";
import { DuolingoButton } from "../ui/DuolingoButton";

interface AccountModalProps {
  visible: boolean;
  onClose: () => void;
  displayName: string;
  email: string | null;
  reminderEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
  onToggleReminder: (value: boolean) => void;
  onHourChange: (hour: number) => void;
  onMinuteChange: (minute: number) => void;
  onChangePassword: (curr: string, next: string) => Promise<void>;
  onSendResetEmail: () => Promise<void>;
  onSignOut: () => void;
}

export function AccountModal({
  visible,
  onClose,
  displayName,
  email,
  reminderEnabled,
  reminderHour,
  reminderMinute,
  onToggleReminder,
  onHourChange,
  onMinuteChange,
  onChangePassword,
  onSendResetEmail,
  onSignOut,
}: AccountModalProps) {
  const insets = useSafeAreaInsets();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loadingPass, setLoadingPass] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);

  const handlePasswordSubmit = async () => {
    if (!newPassword) return;
    if (newPassword.length < 6) {
      triggerHaptic("warning");
      Alert.alert("Thông báo", "Mật khẩu mới phải chứa ít nhất 6 ký tự.");
      return;
    }
    setLoadingPass(true);
    triggerHaptic("medium");
    try {
      await onChangePassword(currentPassword, newPassword);
      triggerHaptic("success");
      Alert.alert("Thành công", "Đã cập nhật mật khẩu mới!");
      setCurrentPassword("");
      setNewPassword("");
    } catch (e: any) {
      triggerHaptic("error");
      Alert.alert("Lỗi đổi mật khẩu", e?.message || "Không thể cập nhật mật khẩu.");
    } finally {
      setLoadingPass(false);
    }
  };

  const handleResetSubmit = async () => {
    setLoadingReset(true);
    triggerHaptic("medium");
    try {
      await onSendResetEmail();
      triggerHaptic("success");
      Alert.alert(
        "Đã gửi email khôi phục",
        "Hướng dẫn đặt lại mật khẩu đã được gửi đến email của bạn."
      );
    } catch (e: any) {
      triggerHaptic("error");
      Alert.alert("Không thể gửi email", e?.message || "Vui lòng thử lại sau.");
    } finally {
      setLoadingReset(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {/* Header Bar */}
        <View style={[styles.modalHeader, { paddingTop: Math.max(insets.top + 8, 20) }]}>
          <Text style={styles.modalTitle}>HỒ SƠ CÁ NHÂN</Text>
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => {
              triggerHaptic("light");
              onClose();
            }}
          >
            <Ionicons name="close-circle" size={28} color={Colors.duolingo.textMuted} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.modalScroll,
            { paddingBottom: Math.max(insets.bottom + 30, 40) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Hero Avatar Card */}
          <DuolingoCard style={styles.profileHeroCard}>
            <View style={styles.avatarCircle}>
              <Ionicons name="person" size={40} color={Colors.duolingo.blue} />
            </View>
            <Text style={styles.displayNameText}>{displayName}</Text>
            <Text style={styles.emailText}>{email || "Chưa cập nhật email"}</Text>

            {/* Quick Profile Stat Badges */}
            <View style={styles.quickStatsRow}>
              <View style={styles.quickStatItem}>
                <Text style={styles.quickStatIcon}>🔥</Text>
                <Text style={styles.quickStatValue}>1</Text>
                <Text style={styles.quickStatLabel}>STREAK</Text>
              </View>
              <View style={styles.quickStatItem}>
                <Text style={styles.quickStatIcon}>⚡</Text>
                <Text style={styles.quickStatValue}>+50</Text>
                <Text style={styles.quickStatLabel}>DIEM XP</Text>
              </View>
            </View>
          </DuolingoCard>

          {/* Daily Reminder Section */}
          <SectionTitle>NHẮC NHỞ HỌC HÀNG NGÀY</SectionTitle>
          <DuolingoCard style={{ marginBottom: Spacing.md }}>
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>Bật nhắc học hàng ngày</Text>
                <Text style={styles.switchSub}>Nhận thông báo nhắc ôn tập từ vựng đúng giờ</Text>
              </View>
              <Switch
                value={reminderEnabled}
                onValueChange={(val) => {
                  triggerHaptic("selection");
                  onToggleReminder(val);
                }}
                trackColor={{ false: Colors.duolingo.disabledBg, true: Colors.duolingo.green }}
                thumbColor="#FFFFFF"
              />
            </View>

            {reminderEnabled && (
              <View style={styles.pickerContainer}>
                <WheelTimePicker
                  hour={reminderHour}
                  minute={reminderMinute}
                  onHourChange={onHourChange}
                  onMinuteChange={onMinuteChange}
                />
              </View>
            )}
          </DuolingoCard>

          {/* Password Security Section */}
          <SectionTitle>BẢO MẬT & MẬT KHẨU</SectionTitle>
          <DuolingoCard style={{ marginBottom: Spacing.lg }}>
            <View style={{ gap: Spacing.md }}>
              <FormField
                label="Mật khẩu hiện tại"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Nhập mật khẩu hiện tại"
                secureTextEntry
              />

              <FormField
                label="Mật khẩu mới"
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Tối thiểu 6 ký tự"
                secureTextEntry
              />

              <DuolingoButton
                title={loadingPass ? "ĐANG ĐỔI MẬT KHẨU..." : "CẬP NHẬT MẬT KHẨU ➜"}
                variant="primary"
                disabled={!newPassword || loadingPass}
                onPress={handlePasswordSubmit}
                height={48}
              />

              <TouchableOpacity
                style={styles.forgotPassBtn}
                onPress={handleResetSubmit}
                disabled={loadingReset}
              >
                <Text style={styles.forgotPassText}>Quên mật khẩu? Gửi email khôi phục</Text>
              </TouchableOpacity>
            </View>
          </DuolingoCard>

          {/* Sign Out 3D Red Button */}
          <DuolingoButton
            title="ĐĂNG XUẤT TÀI KHOẢN"
            variant="error"
            onPress={() => {
              triggerHaptic("heavy");
              Alert.alert("Đăng xuất", "Bạn có chắc chắn muốn đăng xuất khỏi tài khoản?", [
                { text: "Hủy", style: "cancel" },
                {
                  text: "Đăng xuất",
                  style: "destructive",
                  onPress: onSignOut,
                },
              ]);
            }}
            height={52}
          />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1, backgroundColor: Colors.duolingo.bg },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.pageMargin,
    paddingBottom: Spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: Colors.duolingo.cardBorder,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  doneBtn: { padding: 4 },
  modalScroll: { paddingHorizontal: Spacing.pageMargin, paddingTop: Spacing.md },

  profileHeroCard: {
    alignItems: "center",
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.duolingo.blueDim,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
    borderWidth: 0,
    borderBottomWidth: 4,
    borderBottomColor: Colors.duolingo.blueDark,
  },
  displayNameText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  emailText: {
    fontSize: 13,
    color: Colors.duolingo.textMuted,
    marginTop: 2,
  },

  quickStatsRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: Spacing.md,
    width: "100%",
    justifyContent: "center",
  },
  quickStatItem: {
    alignItems: "center",
    backgroundColor: Colors.duolingo.bg,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: Radii.lg,
    borderBottomWidth: 3,
    borderBottomColor: "#18242B",
  },
  quickStatIcon: { fontSize: 18 },
  quickStatValue: { fontSize: 18, fontWeight: "800", color: "#FFFFFF", marginTop: 2 },
  quickStatLabel: { fontSize: 10, fontWeight: "700", color: Colors.duolingo.textMuted, marginTop: 1 },

  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.xs,
  },
  switchLabel: {
    fontSize: 15,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  switchSub: {
    fontSize: 12,
    color: Colors.duolingo.textMuted,
    marginTop: 2,
  },
  pickerContainer: {
    borderTopWidth: 1,
    borderTopColor: Colors.duolingo.cardBorder,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
  },

  forgotPassBtn: {
    alignSelf: "center",
    paddingVertical: 4,
  },
  forgotPassText: {
    fontSize: 13,
    color: Colors.duolingo.blue,
    fontWeight: "700",
  },
});
