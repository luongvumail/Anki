import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, StyleSheet,
  ScrollView, Switch, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radii, triggerHaptic } from '../../constants/theme';
import { FormField } from '../ui/FormField';
import { WheelTimePicker } from './WheelTimePicker';
import { SectionTitle } from '../ui/SectionTitle';

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
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loadingPass, setLoadingPass] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);

  const handlePasswordSubmit = async () => {
    if (!newPassword) return;
    setLoadingPass(true);
    try {
      await onChangePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
    } catch {
      // Handled in parent
    } finally {
      setLoadingPass(false);
    }
  };

  const handleResetSubmit = async () => {
    setLoadingReset(true);
    try {
      await onSendResetEmail();
    } catch {
      // Handled in parent
    } finally {
      setLoadingReset(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalContainer, { paddingTop: Math.max(insets.top + 12, 20) }]}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>TÀI KHOẢN & CÀI ĐẶT</Text>
          <TouchableOpacity
            onPress={() => {
              triggerHaptic('light');
              onClose();
            }}
            style={styles.doneBtn}
          >
            <Text style={styles.doneBtnText}>Xong</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={[styles.modalScroll, { paddingBottom: Math.max(insets.bottom + 40, 50) }]} showsVerticalScrollIndicator={false}>
          {/* Profile Section */}
          <SectionTitle>THÔNG TIN CÁ NHÂN</SectionTitle>
          <View style={styles.insetGroup}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tên hiển thị</Text>
              <Text style={styles.infoValue}>{displayName}</Text>
            </View>
            <View style={[styles.infoRow, styles.cellBorderTop]}>
              <Text style={styles.infoLabel}>Địa chỉ Email</Text>
              <Text style={styles.infoValue}>{email || 'Chưa cập nhật'}</Text>
            </View>
          </View>

          {/* Daily Reminder Section */}
          <SectionTitle>NHẮC NHỞ HỌC HÀNG NGÀY</SectionTitle>
          <View style={styles.insetGroup}>
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>Bật nhắc học hàng ngày</Text>
                <Text style={styles.switchSub}>Nhận thông báo nhắc ôn tập từ vựng</Text>
              </View>
              <Switch
                value={reminderEnabled}
                onValueChange={onToggleReminder}
                trackColor={{ false: Colors.bg.tertiary, true: Colors.accent.indigo }}
                thumbColor="#FFFFFF"
              />
            </View>

            {reminderEnabled && (
              <View style={[styles.pickerContainer, styles.cellBorderTop]}>
                <Text style={styles.pickerTitle}>CHỌN GIỜ NHẮC NHỞ HÀNG NGÀY</Text>
                <WheelTimePicker
                  hour={reminderHour}
                  minute={reminderMinute}
                  onHourChange={onHourChange}
                  onMinuteChange={onMinuteChange}
                />
              </View>
            )}
          </View>

          {/* Password Security Section */}
          <SectionTitle>BẢO MẬT & MẬT KHẨU</SectionTitle>
          <View style={styles.insetGroup}>
            <View style={{ padding: Spacing.cellHorizontal, gap: Spacing.md }}>
              <FormField
                label="MẬT KHẨU HIỆN TẠI"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Nhập mật khẩu hiện tại"
                secureTextEntry
              />

              <FormField
                label="MẬT KHẨU MỚI"
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Tối thiểu 6 ký tự"
                secureTextEntry
              />

              <TouchableOpacity
                style={[styles.actionBtn, (!newPassword || loadingPass) && styles.btnDisabled]}
                onPress={handlePasswordSubmit}
                disabled={!newPassword || loadingPass}
                activeOpacity={0.8}
              >
                {loadingPass ? (
                  <ActivityIndicator size="small" color="#F3F4F6" />
                ) : (
                  <Text style={styles.actionBtnText}>CẬP NHẬT MẬT KHẨU</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.cellBorderTop}>
              <TouchableOpacity
                style={styles.textActionRow}
                onPress={handleResetSubmit}
                disabled={loadingReset}
                activeOpacity={0.7}
              >
                {loadingReset ? (
                  <ActivityIndicator size="small" color={Colors.accent.indigoLight} />
                ) : (
                  <>
                    <Ionicons name="mail-outline" size={18} color={Colors.accent.indigoLight} style={{ marginRight: 8 }} />
                    <Text style={styles.textActionLabel}>Gửi email đặt lại mật khẩu</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign Out Action Section */}
          <SectionTitle>THAO TÁC TÀI KHOẢN</SectionTitle>
          <View style={styles.insetGroup}>
            <TouchableOpacity style={styles.signOutRow} onPress={onSignOut} activeOpacity={0.7}>
              <Ionicons name="log-out-outline" size={18} color={Colors.neon.coral} style={{ marginRight: 8 }} />
              <Text style={styles.signOutText}>Đăng xuất tài khoản</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1, backgroundColor: Colors.bg.primary },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.pageMargin,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.separator,
  },
  modalTitle: {
    fontSize: Typography.text.caption1.fontSize,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    letterSpacing: 1,
  },
  doneBtn: { padding: Spacing.xs },
  doneBtnText: {
    fontSize: Typography.text.footnote.fontSize,
    color: Colors.accent.indigoLight,
    fontWeight: Typography.weight.bold,
  },
  modalScroll: { paddingHorizontal: Spacing.pageMargin },

  insetGroup: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radii.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  cellBorderTop: {
    borderTopWidth: 1,
    borderTopColor: Colors.border.separator,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.cellHorizontal,
    paddingVertical: Spacing.cellVertical,
  },
  infoLabel: { fontSize: Typography.text.body.fontSize, color: Colors.text.primary },
  infoValue: { fontSize: Typography.text.body.fontSize, color: Colors.text.secondary, fontWeight: Typography.weight.medium },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.cellHorizontal,
    paddingVertical: Spacing.cellVertical,
  },
  switchLabel: { fontSize: Typography.text.body.fontSize, color: Colors.text.primary, fontWeight: Typography.weight.semibold },
  switchSub: { fontSize: Typography.text.caption1.fontSize, color: Colors.text.secondary, marginTop: 2 },

  pickerContainer: {
    padding: Spacing.cellHorizontal,
    alignItems: 'center',
  },
  pickerTitle: {
    fontSize: Typography.text.caption2.fontSize,
    color: Colors.text.secondary,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.8,
    marginBottom: Spacing.xs,
  },

  actionBtn: {
    backgroundColor: Colors.accent.indigo,
    borderRadius: Radii.card,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.accent.indigoLight,
    marginTop: Spacing.xs,
  },
  btnDisabled: { opacity: 0.5 },
  actionBtnText: {
    color: '#F3F4F6',
    fontSize: Typography.text.footnote.fontSize,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.8,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },

  textActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.cellVertical,
  },
  textActionLabel: {
    fontSize: Typography.text.footnote.fontSize,
    color: Colors.accent.indigoLight,
    fontWeight: Typography.weight.semibold,
  },

  signOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.cellVertical,
  },
  signOutText: {
    fontSize: Typography.text.body.fontSize,
    color: Colors.neon.coral,
    fontWeight: Typography.weight.bold,
  },
});
