import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, ScrollView, Switch, TextInput,
  ActivityIndicator, StyleSheet,
} from 'react-native';
import { Colors, Typography, Spacing, Radii, triggerHaptic } from '../../constants/theme';
import { InsetGroup } from '../ui/InsetGroup';
import { InsetRow } from '../ui/InsetRow';
import { SectionTitle } from '../ui/SectionTitle';
import { WheelTimePicker } from './WheelTimePicker';

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
  onChangePassword: (currentPass: string, newPass: string) => Promise<void>;
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
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [sendingResetEmail, setSendingResetEmail] = useState(false);

  const handlePasswordSubmit = async () => {
    setUpdatingPassword(true);
    try {
      await onChangePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleResetSubmit = async () => {
    setSendingResetEmail(true);
    try {
      await onSendResetEmail();
    } finally {
      setSendingResetEmail(false);
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
        {/* Modal Header Bar */}
        <View style={styles.modalHeader}>
          <View style={{ width: 60 }} />
          <Text style={styles.modalTitle}>ACCOUNT & SETTINGS</Text>
          <TouchableOpacity onPress={onClose} style={styles.headerRightBtn}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
          {/* Profile Section */}
          <SectionTitle>PROFILE</SectionTitle>
          <InsetGroup>
            <InsetRow label="Display Name" value={displayName} />
            <InsetRow label="Email Address" value={email || 'N/A'} isBorder />
          </InsetGroup>

          {/* Daily Reminder Section */}
          <SectionTitle>DAILY STUDY REMINDER</SectionTitle>
          <InsetGroup>
            <InsetRow
              label="Enable Daily Reminder"
              labelStyle={{ flex: 1 }}
              right={
                <Switch
                  value={reminderEnabled}
                  onValueChange={onToggleReminder}
                  trackColor={{ false: Colors.bg.tertiary, true: Colors.accent.indigo }}
                  thumbColor="#F3F4F6"
                />
              }
            />

            {reminderEnabled && (
              <WheelTimePicker
                hour={reminderHour}
                minute={reminderMinute}
                onHourChange={onHourChange}
                onMinuteChange={onMinuteChange}
              />
            )}
          </InsetGroup>

          {/* Change Password Section */}
          <SectionTitle>SECURITY & PASSWORD</SectionTitle>
          <InsetGroup>
            <InsetRow
              label="Current Password"
              right={
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Optional for email reset"
                  placeholderTextColor={Colors.text.tertiary}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry
                />
              }
            />
            <InsetRow
              label="New Password"
              isBorder
              right={
                <TextInput
                  style={styles.fieldInput}
                  placeholder="At least 6 characters"
                  placeholderTextColor={Colors.text.tertiary}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                />
              }
            />
          </InsetGroup>

          <TouchableOpacity
            style={[styles.savePasswordBtn, updatingPassword && styles.btnDisabled]}
            onPress={handlePasswordSubmit}
            disabled={updatingPassword}
            activeOpacity={0.8}
          >
            {updatingPassword ? (
              <ActivityIndicator color="#F3F4F6" size="small" />
            ) : (
              <Text style={styles.savePasswordBtnText}>UPDATE PASSWORD</Text>
            )}
          </TouchableOpacity>

          {/* Email Recovery */}
          <SectionTitle>EMAIL RECOVERY</SectionTitle>
          <InsetGroup>
            <TouchableOpacity
              style={styles.modalActionCell}
              onPress={handleResetSubmit}
              disabled={sendingResetEmail}
              activeOpacity={0.7}
            >
              <Text style={styles.modalActionCellText}>Send Password Reset Email</Text>
              {sendingResetEmail && <ActivityIndicator size="small" color={Colors.accent.indigoLight} />}
            </TouchableOpacity>
          </InsetGroup>

          {/* Sign Out */}
          <SectionTitle>ACCOUNT ACTIONS</SectionTitle>
          <InsetGroup>
            <TouchableOpacity
              style={styles.modalActionCell}
              onPress={onSignOut}
              activeOpacity={0.7}
            >
              <Text style={styles.destructiveText}>Sign Out Account</Text>
            </TouchableOpacity>
          </InsetGroup>
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.separator,
    backgroundColor: Colors.bg.secondary,
  },
  modalTitle: {
    fontSize: Typography.text.footnote.fontSize,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    letterSpacing: 1,
  },
  headerRightBtn: { padding: Spacing.xs },
  doneBtnText: {
    fontSize: Typography.text.body.fontSize,
    color: Colors.accent.indigoLight,
    fontWeight: Typography.weight.bold,
  },
  modalContent: { paddingHorizontal: Spacing.pageMargin, paddingTop: Spacing.md, paddingBottom: 40 },
  fieldInput: {
    flex: 1,
    fontSize: Typography.text.body.fontSize,
    color: Colors.text.primary,
  },
  savePasswordBtn: {
    backgroundColor: Colors.accent.indigo,
    borderRadius: Radii.card,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.accent.indigoLight,
  },
  savePasswordBtnText: {
    color: '#F3F4F6',
    fontSize: Typography.text.footnote.fontSize,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.5,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  btnDisabled: { opacity: 0.6 },
  modalActionCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.cellHorizontal,
    paddingVertical: Spacing.cellVertical,
    minHeight: Spacing.cellMinHeight,
  },
  modalActionCellText: {
    fontSize: Typography.text.body.fontSize,
    color: Colors.accent.indigoLight,
    fontWeight: Typography.weight.medium,
  },
  destructiveText: {
    fontSize: Typography.text.body.fontSize,
    color: Colors.neon.coral,
    fontWeight: Typography.weight.semibold,
  },
});
