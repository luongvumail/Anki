import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, Modal, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  updatePassword, reauthenticateWithCredential, EmailAuthProvider,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useStore } from '../../store/useStore';
import { Colors, Typography, Spacing, Radii, triggerHaptic } from '../../constants/theme';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { decks, fetchDecks, isLoading, userId } = useStore();
  const [refreshing, setRefreshing] = useState(false);

  // Account Settings Modal States
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [sendingResetEmail, setSendingResetEmail] = useState(false);

  const user = auth.currentUser;

  const todayDateStr = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).toUpperCase();

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Học viên';
  const initials = displayName.slice(0, 2).toUpperCase();

  const totalDue = decks.reduce((s, d) => s + (d.dueCount || 0), 0);
  const totalCards = decks.reduce((s, d) => s + (d.cardCount || 0), 0);
  const totalNew = decks.reduce((s, d) => s + (d.newCount || 0), 0);
  const doneToday = Math.max(0, totalCards - totalDue - totalNew);
  const progressPct = totalCards > 0 ? Math.round((doneToday / totalCards) * 100) : 0;

  useEffect(() => {
    if (userId) fetchDecks();
  }, [userId]);

  const onRefresh = async () => {
    triggerHaptic('light');
    setRefreshing(true);
    await fetchDecks();
    setRefreshing(false);
  };

  const handleSignOut = () => {
    triggerHaptic('warning');
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất tài khoản?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: () => {
          setShowAccountModal(false);
          auth.signOut();
        },
      },
    ]);
  };

  const handleChangePassword = async () => {
    if (!user || !user.email) return;
    if (!newPassword || newPassword.length < 6) {
      triggerHaptic('warning');
      Alert.alert('Thông báo', 'Mật khẩu mới cần ít nhất 6 ký tự');
      return;
    }

    setUpdatingPassword(true);
    triggerHaptic('medium');
    try {
      if (currentPassword) {
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
      }
      await updatePassword(user, newPassword);
      triggerHaptic('success');
      Alert.alert('Thành công', 'Mật khẩu của bạn đã được cập nhật thành công!');
      setCurrentPassword('');
      setNewPassword('');
    } catch (e: any) {
      triggerHaptic('error');
      const msg = e.code === 'auth/wrong-password' ? 'Mật khẩu hiện tại không đúng.'
        : e.code === 'auth/requires-recent-login' ? 'Vui lòng sử dụng nút "Gửi email đặt lại mật khẩu" bên dưới.'
        : e.message;
      Alert.alert('Đổi mật khẩu thất bại', msg);
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleSendResetEmail = async () => {
    if (!user || !user.email) return;
    setSendingResetEmail(true);
    triggerHaptic('medium');
    try {
      await sendPasswordResetEmail(auth, user.email);
      triggerHaptic('success');
      Alert.alert('Đã gửi email khôi phục', `Hướng dẫn đặt lại mật khẩu đã được gửi tới ${user.email}.\nVui lòng kiểm tra hộp thư của bạn.`);
    } catch (e: any) {
      triggerHaptic('error');
      Alert.alert('Không thể gửi email', e.message);
    } finally {
      setSendingResetEmail(false);
    }
  };

  const renderVectorIcon = (iconName: string) => {
    const validIcons = [
      'book-outline', 'language-outline', 'school-outline', 'journal-outline',
      'sparkles-outline', 'bookmarks-outline', 'earth-outline', 'cube-outline',
      'trophy-outline', 'ribbon-outline', 'bulb-outline', 'shapes-outline',
    ];
    const icon = validIcons.includes(iconName) ? (iconName as any) : 'book-outline';
    return <Ionicons name={icon} size={18} color={Colors.accent.blue} />;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: Math.max(insets.top + 16, 54), paddingBottom: Math.max(insets.bottom + 90, 110) },
      ]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent.gray} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Navigation Bar Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.dateSubhead}>{todayDateStr}</Text>
          <Text style={styles.largeTitle}>Hôm nay</Text>
        </View>
        <TouchableOpacity
          style={styles.avatarBtn}
          onPress={() => {
            triggerHaptic('selection');
            setShowAccountModal(true);
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.avatarText}>{initials}</Text>
        </TouchableOpacity>
      </View>

      {/* Hero Inset Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <Text style={styles.heroSectionTitle}>CẦN ÔN HÔM NAY</Text>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>{decks.length} bộ thẻ</Text>
          </View>
        </View>

        <View style={styles.heroCountRow}>
          <Text style={styles.heroCount}>{totalDue}</Text>
          <Text style={styles.heroUnit}> từ vựng</Text>
        </View>

        {/* Progress Track */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
        </View>
        <View style={styles.progressLabels}>
          <Text style={styles.progressText}>{progressPct}% hoàn thành</Text>
          <Text style={styles.progressText}>{doneToday}/{totalCards} từ</Text>
        </View>

        {/* Primary Blue Action Button */}
        <TouchableOpacity
          style={[styles.primaryBtn, totalDue === 0 && styles.primaryBtnDisabled]}
          onPress={() => {
            triggerHaptic('medium');
            const firstDue = decks.find(d => (d.dueCount || 0) > 0) || decks[0];
            if (firstDue) router.push(`/study/${firstDue.id}`);
          }}
          disabled={totalDue === 0 && decks.length === 0}
          activeOpacity={0.8}
        >
          <Ionicons name={totalDue > 0 ? "play" : "checkmark-circle"} size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.primaryBtnText}>
            {totalDue > 0 ? 'Bắt đầu ôn tập' : totalCards > 0 ? 'Đã hoàn thành hôm nay' : 'Tạo bộ thẻ để bắt đầu'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Inset Grouped Metrics */}
      <View style={styles.metricsGroup}>
        <View style={styles.metricCol}>
          <Text style={styles.metricValue}>{totalDue}</Text>
          <Text style={styles.metricLabel}>Cần ôn</Text>
        </View>
        <View style={styles.metricSeparator} />
        <View style={styles.metricCol}>
          <Text style={styles.metricValue}>{totalNew}</Text>
          <Text style={styles.metricLabel}>Từ mới</Text>
        </View>
        <View style={styles.metricSeparator} />
        <View style={styles.metricCol}>
          <Text style={styles.metricValue}>{doneToday}</Text>
          <Text style={styles.metricLabel}>Đã xong</Text>
        </View>
      </View>

      {/* Decks Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>BỘ THẺ CỦA BẠN</Text>
        <TouchableOpacity
          onPress={() => {
            triggerHaptic('selection');
            router.push('/decks' as any);
          }}
        >
          <Text style={styles.sectionLink}>Xem tất cả ›</Text>
        </TouchableOpacity>
      </View>

      {isLoading && !refreshing ? (
        <ActivityIndicator color={Colors.accent.gray} style={{ marginTop: 30 }} />
      ) : decks.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="library-outline" size={36} color={Colors.accent.gray} style={{ marginBottom: Spacing.sm }} />
          <Text style={styles.emptyTitle}>Chưa có bộ thẻ nào</Text>
          <Text style={styles.emptySub}>Tạo bộ thẻ để lưu trữ từ vựng Tiếng Trung</Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => {
              triggerHaptic('medium');
              router.push('/decks' as any);
            }}
          >
            <Text style={styles.emptyBtnText}>+ Tạo bộ thẻ mới</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.decksGroup}>
          {decks.map((deck, idx) => {
            const due = deck.dueCount || 0;
            const total = deck.cardCount || 0;
            const pct = total > 0 ? Math.round(((total - due) / total) * 100) : 0;
            return (
              <React.Fragment key={deck.id}>
                {idx > 0 && <View style={styles.cellDividerIndented} />}
                <TouchableOpacity
                  style={styles.deckRow}
                  onPress={() => {
                    triggerHaptic('light');
                    router.push(`/study/${deck.id}` as any);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.deckIconTile}>
                    {renderVectorIcon(deck.icon)}
                  </View>
                  <View style={styles.deckMeta}>
                    <Text style={styles.deckName} numberOfLines={1}>{deck.name}</Text>
                    <Text style={styles.deckSub}>{total} từ vựng  •  {pct}% thuộc</Text>
                  </View>
                  {due > 0 ? (
                    <View style={styles.dueBadge}>
                      <Text style={styles.dueBadgeText}>{due} cần ôn</Text>
                    </View>
                  ) : (
                    <Text style={styles.doneText}>Xong</Text>
                  )}
                  <Ionicons name="chevron-forward" size={16} color={Colors.accent.gray3} style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </React.Fragment>
            );
          })}
        </View>
      )}

      {/* Account Settings Page Sheet Modal */}
      <Modal
        visible={showAccountModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAccountModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={{ width: 60 }} />
            <Text style={styles.modalTitle}>Tài khoản & Cài đặt</Text>
            <TouchableOpacity onPress={() => setShowAccountModal(false)} style={styles.headerRightBtn}>
              <Text style={styles.doneBtnText}>Xong</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Account Info */}
            <Text style={styles.sectionHeaderTitle}>THÔNG TIN TÀI KHOẢN</Text>
            <View style={styles.modalInsetGroup}>
              <View style={styles.modalRow}>
                <Text style={styles.fieldLabel}>Họ tên</Text>
                <Text style={styles.fieldValue}>{displayName}</Text>
              </View>
              <View style={[styles.modalRow, styles.cellBorderTop]}>
                <Text style={styles.fieldLabel}>Email</Text>
                <Text style={styles.fieldValue}>{user?.email || 'N/A'}</Text>
              </View>
            </View>

            {/* Change Password */}
            <Text style={styles.sectionHeaderTitle}>ĐỔI MẬT KHẨU</Text>
            <View style={styles.modalInsetGroup}>
              <View style={styles.modalRow}>
                <Text style={styles.fieldLabel}>Mật khẩu hiện tại</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Mật khẩu cũ (tuỳ chọn)"
                  placeholderTextColor={Colors.text.tertiary}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry
                />
              </View>
              <View style={[styles.modalRow, styles.cellBorderTop]}>
                <Text style={styles.fieldLabel}>Mật khẩu mới</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Ít nhất 6 ký tự"
                  placeholderTextColor={Colors.text.tertiary}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.savePasswordBtn, updatingPassword && styles.btnDisabled]}
              onPress={handleChangePassword}
              disabled={updatingPassword}
              activeOpacity={0.8}
            >
              {updatingPassword ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.savePasswordBtnText}>Cập nhật mật khẩu</Text>
              )}
            </TouchableOpacity>

            {/* Reset Email Option */}
            <Text style={styles.sectionHeaderTitle}>KHÔI PHỤC QUA EMAIL</Text>
            <View style={styles.modalInsetGroup}>
              <TouchableOpacity
                style={styles.modalActionCell}
                onPress={handleSendResetEmail}
                disabled={sendingResetEmail}
                activeOpacity={0.7}
              >
                <Text style={styles.modalActionCellText}>Gửi email đặt lại mật khẩu</Text>
                {sendingResetEmail && <ActivityIndicator size="small" color={Colors.accent.blue} />}
              </TouchableOpacity>
            </View>

            {/* Sign Out */}
            <Text style={styles.sectionHeaderTitle}>ĐĂNG XUẤT</Text>
            <View style={styles.modalInsetGroup}>
              <TouchableOpacity
                style={styles.modalActionCell}
                onPress={handleSignOut}
                activeOpacity={0.7}
              >
                <Text style={styles.destructiveText}>Đăng xuất tài khoản</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  content: { paddingHorizontal: Spacing.pageMargin },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: Spacing.lg,
  },
  dateSubhead: {
    fontSize: Typography.text.caption1.fontSize,
    lineHeight: Typography.text.caption1.lineHeight,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.secondary,
    letterSpacing: -0.08,
    marginBottom: 2,
  },
  largeTitle: {
    fontSize: Typography.text.largeTitle.fontSize,
    lineHeight: Typography.text.largeTitle.lineHeight,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    letterSpacing: 0.37,
  },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.accent.gray5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: Typography.text.subhead.fontSize,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },

  // Hero Card
  heroCard: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radii.card,
    padding: Spacing.cellHorizontal,
    marginBottom: Spacing.lg,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  heroSectionTitle: {
    fontSize: Typography.text.caption1.fontSize,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.secondary,
    letterSpacing: -0.08,
  },
  heroBadge: {
    backgroundColor: Colors.accent.gray5,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  heroBadgeText: {
    fontSize: Typography.text.caption2.fontSize,
    color: Colors.text.secondary,
    fontWeight: Typography.weight.medium,
  },

  heroCountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: 4,
  },
  heroCount: {
    fontSize: 40,
    lineHeight: 46,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  heroUnit: {
    fontSize: Typography.text.body.fontSize,
    color: Colors.text.secondary,
    fontWeight: Typography.weight.medium,
    marginLeft: 4,
  },

  progressTrack: {
    height: 4,
    backgroundColor: Colors.accent.gray5,
    borderRadius: 2,
    marginTop: Spacing.xs,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.accent.blue,
    borderRadius: 2,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: Spacing.lg,
  },
  progressText: {
    fontSize: Typography.text.caption1.fontSize,
    color: Colors.text.secondary,
  },

  primaryBtn: {
    backgroundColor: Colors.accent.blue,
    borderRadius: Radii.card,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnDisabled: {
    backgroundColor: Colors.accent.gray4,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: Typography.text.body.fontSize,
    fontWeight: Typography.weight.semibold,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },

  // Metrics Group
  metricsGroup: {
    flexDirection: 'row',
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radii.card,
    paddingVertical: Spacing.cellVertical,
    marginBottom: Spacing.xl,
  },
  metricCol: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: Typography.text.title2.fontSize,
    lineHeight: Typography.text.title2.lineHeight,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  metricLabel: {
    fontSize: Typography.text.caption1.fontSize,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  metricSeparator: {
    width: 0.5,
    backgroundColor: Colors.border.separator,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sectionBottom,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: Typography.text.caption1.fontSize,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.secondary,
    letterSpacing: -0.08,
  },
  sectionLink: {
    fontSize: Typography.text.footnote.fontSize,
    color: Colors.accent.blue,
  },

  // Decks Group
  decksGroup: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radii.card,
    overflow: 'hidden',
  },
  deckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.cellHorizontal,
    paddingVertical: Spacing.cellVertical,
    minHeight: Spacing.cellMinHeight,
  },
  cellDividerIndented: {
    height: 0.5,
    backgroundColor: Colors.border.separator,
    marginLeft: 56,
  },
  deckIconTile: {
    width: 32,
    height: 32,
    borderRadius: Radii.icon,
    backgroundColor: Colors.accent.gray5,
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: Colors.accent.gray5,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  dueBadgeText: {
    fontSize: Typography.text.caption2.fontSize,
    color: Colors.text.primary,
    fontWeight: Typography.weight.medium,
  },
  doneText: {
    fontSize: Typography.text.footnote.fontSize,
    color: Colors.text.secondary,
  },

  // Empty
  emptyCard: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radii.card,
    padding: Spacing.xl,
    alignItems: 'center',
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
    textAlign: 'center',
  },
  emptyBtn: {
    backgroundColor: Colors.accent.blue,
    paddingHorizontal: Spacing.xl,
    height: 44,
    borderRadius: Radii.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBtnText: {
    color: '#FFFFFF',
    fontWeight: Typography.weight.semibold,
    fontSize: Typography.text.subhead.fontSize,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },

  // Account Modal
  modalContainer: { flex: 1, backgroundColor: Colors.bg.primary },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border.separator,
    backgroundColor: Colors.bg.secondary,
  },
  modalTitle: {
    fontSize: Typography.text.headline.fontSize,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
  },
  headerRightBtn: { padding: Spacing.xs },
  doneBtnText: {
    fontSize: Typography.text.body.fontSize,
    color: Colors.accent.blue,
    fontWeight: Typography.weight.bold,
  },
  modalContent: { paddingHorizontal: Spacing.pageMargin, paddingTop: Spacing.md, paddingBottom: 40 },
  sectionHeaderTitle: {
    fontSize: Typography.text.caption1.fontSize,
    color: Colors.text.secondary,
    fontWeight: Typography.weight.semibold,
    letterSpacing: -0.08,
    marginBottom: Spacing.sectionBottom,
    marginTop: Spacing.sectionTop,
    marginLeft: 4,
  },
  modalInsetGroup: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radii.card,
    overflow: 'hidden',
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.cellHorizontal,
    paddingVertical: Spacing.cellVertical,
    minHeight: Spacing.cellMinHeight,
  },
  cellBorderTop: {
    borderTopWidth: 0.5,
    borderTopColor: Colors.border.separator,
  },
  fieldLabel: {
    width: 130,
    fontSize: Typography.text.body.fontSize,
    color: Colors.text.primary,
    fontWeight: Typography.weight.medium,
  },
  fieldValue: {
    flex: 1,
    fontSize: Typography.text.body.fontSize,
    color: Colors.text.secondary,
  },
  fieldInput: {
    flex: 1,
    fontSize: Typography.text.body.fontSize,
    color: Colors.text.primary,
  },
  savePasswordBtn: {
    backgroundColor: Colors.accent.blue,
    borderRadius: Radii.card,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  savePasswordBtnText: {
    color: '#FFFFFF',
    fontSize: Typography.text.body.fontSize,
    fontWeight: Typography.weight.semibold,
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
    color: Colors.accent.blue,
    fontWeight: Typography.weight.medium,
  },
  destructiveText: {
    fontSize: Typography.text.body.fontSize,
    color: Colors.srs.again,
    fontWeight: Typography.weight.semibold,
  },
});
