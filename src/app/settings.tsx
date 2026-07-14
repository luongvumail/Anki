import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { ChevronLeft, User, Key, Bell, Trash2, ShieldAlert } from 'lucide-react-native';
import { supabase } from '../services/supabase';
import { useAppStore } from '../services/store';
import { useHaptics } from '../hooks/useHaptics';
import { notificationService } from '../services/notifications';
import { db } from '../services/sqlite';

export default function SettingsScreen() {
  const { profile, userId, fetchProfile, loadQueue } = useAppStore();
  const { lightHaptic, successHaptic, warningHaptic } = useHaptics();

  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [reminderHour, setReminderHour] = useState(20);

  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);

  useEffect(() => {
    // Load notification settings on mount
    notificationService.getSettings().then((settings) => {
      setNotificationsEnabled(settings.enabled);
      setReminderHour(settings.hour);
    });
  }, []);

  const handleBack = () => {
    lightHaptic();
    router.replace('/');
  };

  const handleUpdateProfile = async () => {
    if (!displayName.trim()) {
      Alert.alert('Chú ý', 'Tên hiển thị không được bỏ trống.');
      return;
    }

    setLoadingProfile(true);
    lightHaptic();

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: displayName.trim() })
        .eq('id', userId);

      if (error) throw error;

      await fetchProfile();
      successHaptic();
      Alert.alert('Thành công', 'Đã cập nhật thông tin cá nhân!');
    } catch (e: any) {
      warningHaptic();
      Alert.alert('Lỗi', e.message || 'Không thể cập nhật hồ sơ.');
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!password) {
      Alert.alert('Chú ý', 'Vui lòng nhập mật khẩu mới.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Chú ý', 'Mật khẩu phải dài từ 6 ký tự trở lên.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Chú ý', 'Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoadingPassword(true);
    lightHaptic();

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setPassword('');
      setConfirmPassword('');
      successHaptic();
      Alert.alert('Thành công', 'Mật khẩu của bạn đã được thay đổi.');
    } catch (e: any) {
      warningHaptic();
      Alert.alert('Lỗi', e.message || 'Không thể đổi mật khẩu.');
    } finally {
      setLoadingPassword(false);
    }
  };

  const handleToggleNotifications = async (val: boolean) => {
    lightHaptic();
    setNotificationsEnabled(val);
    await notificationService.saveSettings({ enabled: val, hour: reminderHour });
  };

  const handleHourChange = async (hour: number) => {
    lightHaptic();
    setReminderHour(hour);
    await notificationService.saveSettings({ enabled: notificationsEnabled, hour });
  };

  const handleResetProgress = () => {
    warningHaptic();
    Alert.alert(
      'Reset tiến trình học tập',
      'Thao tác này sẽ đặt lại toàn bộ chu kỳ SRS (lượt ôn tập, độ dễ, số lần lặp) của tất cả từ vựng về mặc định để bạn học lại từ đầu. Danh sách từ vựng của bạn vẫn được giữ nguyên. Bạn có muốn tiếp tục?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Reset ngay',
          style: 'destructive',
          onPress: async () => {
            try {
              // 1. Reset progress locally in sqlite
              db.execSync(
                "UPDATE local_progress SET status = 'learning', interval_days = 0, ease_factor = 2.5, repetitions = 0, next_review_at = datetime('now')",
              );

              // 2. Clear progress on Supabase progress table for this user
              const { error } = await supabase
                .from('user_progress')
                .update({
                  status: 'learning',
                  interval_days: 0,
                  ease_factor: 2.5,
                  repetitions: 0,
                  next_review_at: new Date().toISOString(),
                })
                .eq('user_id', userId);

              if (error) throw error;

              await loadQueue();
              successHaptic();
              Alert.alert('Thành công', 'Tiến trình học tập đã được reset!');
            } catch (err: any) {
              console.error(err);
              Alert.alert('Thất bại', 'Không thể reset tiến trình.');
            }
          },
        },
      ],
    );
  };

  const handleClearAllData = () => {
    warningHaptic();
    Alert.alert(
      '⚠️ XÓA TẤT CẢ DỮ LIỆU',
      'Thao tác này sẽ xóa sạch danh sách từ vựng và tiến trình học tập của bạn trên thiết bị này và tài khoản cloud. Đây là hành động không thể khôi phục. Bạn có muốn xóa?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa vĩnh viễn',
          style: 'destructive',
          onPress: async () => {
            try {
              // 1. Delete all progress and vocab from Supabase
              const { error: err1 } = await supabase
                .from('user_progress')
                .delete()
                .eq('user_id', userId);

              if (err1) throw err1;

              // 2. Clear locally
              db.execSync('DELETE FROM local_progress');
              db.execSync('DELETE FROM local_vocabulary');
              db.execSync('DELETE FROM sync_queue');

              await loadQueue();
              successHaptic();
              Alert.alert('Thành công', 'Đã xóa toàn bộ dữ liệu.');
              router.replace('/');
            } catch (err: any) {
              console.error(err);
              Alert.alert('Thất bại', 'Không thể xóa dữ liệu.');
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <ChevronLeft size={24} color="#FFFFFF" />
          <Text style={styles.backText}>Dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cài đặt tài khoản</Text>
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        {/* Section 1: Profile Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <User size={18} color="#FF2D55" />
            <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
          </View>
          <View style={styles.sectionBody}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Tên hiển thị</Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Nhập tên hiển thị"
                placeholderTextColor="#6E6E73"
                autoCorrect={false}
              />
            </View>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleUpdateProfile}
              disabled={loadingProfile}
            >
              {loadingProfile ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Lưu thay đổi</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 2: Security */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Key size={18} color="#0A84FF" />
            <Text style={styles.sectionTitle}>Bảo mật & Đổi mật khẩu</Text>
          </View>
          <View style={styles.sectionBody}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Mật khẩu mới</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="Nhập mật khẩu mới"
                placeholderTextColor="#6E6E73"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Xác nhận mật khẩu mới</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholder="Nhập lại mật khẩu mới"
                placeholderTextColor="#6E6E73"
                autoCapitalize="none"
              />
            </View>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: '#0A84FF' }]}
              onPress={handleUpdatePassword}
              disabled={loadingPassword}
            >
              {loadingPassword ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Đổi mật khẩu</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 3: Notifications */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Bell size={18} color="#FFD60A" />
            <Text style={styles.sectionTitle}>Thông báo nhắc nhở</Text>
          </View>
          <View style={styles.sectionBody}>
            <View style={styles.row}>
              <View style={styles.rowInfo}>
                <Text style={styles.rowLabel}>Thông báo học hàng ngày</Text>
                <Text style={styles.rowDesc}>Nhắc bạn ôn tập thẻ để giữ Streak</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: '#3A3A3C', true: '#30D158' }}
                thumbColor="#FFFFFF"
              />
            </View>

            {notificationsEnabled && (
              <View style={styles.hourSelectorContainer}>
                <Text style={styles.label}>Chọn giờ nhắc nhở</Text>
                <View style={styles.hoursRow}>
                  {[8, 12, 18, 20, 21, 22].map((h) => (
                    <TouchableOpacity
                      key={h}
                      style={[styles.hourChip, reminderHour === h && styles.activeHourChip]}
                      onPress={() => handleHourChange(h)}
                    >
                      <Text
                        style={[
                          styles.hourChipText,
                          reminderHour === h && styles.activeHourChipText,
                        ]}
                      >
                        {h}:00
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Section 4: Data Reset & Actions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ShieldAlert size={18} color="#FF453A" />
            <Text style={styles.sectionTitle}>Khu vực nguy hiểm</Text>
          </View>
          <View style={styles.sectionBody}>
            <TouchableOpacity
              style={[
                styles.dangerButton,
                {
                  backgroundColor: 'rgba(255, 69, 58, 0.1)',
                  borderColor: 'rgba(255, 69, 58, 0.25)',
                },
              ]}
              onPress={handleResetProgress}
            >
              <Trash2 size={16} color="#FF453A" />
              <Text style={[styles.dangerButtonText, { color: '#FF453A' }]}>
                Đặt lại tiến trình học tập
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.dangerButton,
                {
                  backgroundColor: 'rgba(255, 69, 58, 0.2)',
                  borderColor: '#FF453A',
                  marginTop: 12,
                },
              ]}
              onPress={handleClearAllData}
            >
              <ShieldAlert size={16} color="#FF453A" />
              <Text style={[styles.dangerButtonText, { color: '#FF453A', fontWeight: 'bold' }]}>
                Xóa toàn bộ từ vựng & dữ liệu
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#120E2E',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: '#120E2E',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    position: 'absolute',
    left: 16,
    zIndex: 1,
  },
  backText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 20,
  },
  section: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sectionBody: {
    padding: 18,
  },
  inputContainer: {
    gap: 6,
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#AEAEB2',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    height: 44,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  primaryButton: {
    backgroundColor: '#FF2D55',
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowInfo: {
    flex: 1,
    paddingRight: 10,
  },
  rowLabel: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  rowDesc: {
    fontSize: 12,
    color: '#AEAEB2',
    marginTop: 2,
  },
  hourSelectorContainer: {
    marginTop: 18,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 14,
  },
  hoursRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  hourChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  activeHourChip: {
    backgroundColor: '#FFD60A',
    borderColor: '#FFD60A',
  },
  hourChipText: {
    fontSize: 13,
    color: '#AEAEB2',
    fontWeight: '600',
  },
  activeHourChipText: {
    color: '#000000',
  },
  dangerButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
  },
  dangerButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
