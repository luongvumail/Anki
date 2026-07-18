import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  updatePassword, reauthenticateWithCredential, EmailAuthProvider,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { getAuthErrorMessage } from '../../lib/errorHandler';
import {
  getReminderSettings, scheduleDailyStudyReminder, cancelDailyStudyReminder,
} from '../../lib/notificationService';
import { useStore } from '../../store/useStore';
import { Colors, Typography, Spacing, Radii, triggerHaptic } from '../../constants/theme';
import { DeckIcon } from '../../components/ui/DeckIcon';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { AccountModal } from '../../components/home/AccountModal';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { decks, fetchDecks, isLoading, userId } = useStore();
  const [refreshing, setRefreshing] = useState(false);

  // Account Settings Modal States
  const [showAccountModal, setShowAccountModal] = useState(false);

  // Daily Study Reminder States
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderHour, setReminderHour] = useState(20);
  const [reminderMinute, setReminderMinute] = useState(0);

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

  // Load reminder settings on mount
  useEffect(() => {
    async function loadReminder() {
      const settings = await getReminderSettings();
      setReminderEnabled(settings.enabled);
      setReminderHour(settings.hour);
      setReminderMinute(settings.minute);
    }
    loadReminder();
  }, []);

  const onRefresh = async () => {
    triggerHaptic('light');
    setRefreshing(true);
    await fetchDecks();
    setRefreshing(false);
  };

  const handleToggleReminder = async (value: boolean) => {
    triggerHaptic('selection');
    setReminderEnabled(value);
    if (value) {
      const success = await scheduleDailyStudyReminder(reminderHour, reminderMinute);
      if (success) {
        triggerHaptic('success');
        const formattedTime = `${reminderHour < 10 ? '0' : ''}${reminderHour}:${reminderMinute < 10 ? '0' : ''}${reminderMinute}`;
        Alert.alert('Đã bật nhắc nhở hàng ngày', `Ứng dụng Anki sẽ nhắc bạn vào học lúc ${formattedTime} hàng ngày.`);
      } else {
        triggerHaptic('error');
        setReminderEnabled(false);
        Alert.alert('Quyền thông báo', 'Vui lòng cho phép quyền thông báo trong Cài đặt iPhone để sử dụng tính năng này.');
      }
    } else {
      await cancelDailyStudyReminder();
      triggerHaptic('light');
    }
  };

  const handleHourChange = (h: number) => {
    setReminderHour(h);
    if (reminderEnabled) scheduleDailyStudyReminder(h, reminderMinute);
  };

  const handleMinuteChange = (m: number) => {
    setReminderMinute(m);
    if (reminderEnabled) scheduleDailyStudyReminder(reminderHour, m);
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

  const handleChangePassword = async (currentPassword: string, newPassword: string) => {
    if (!user || !user.email) return;
    if (!newPassword || newPassword.length < 6) {
      triggerHaptic('warning');
      Alert.alert('Thông báo', 'Mật khẩu mới cần ít nhất 6 ký tự');
      return;
    }

    triggerHaptic('medium');
    try {
      if (currentPassword) {
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
      }
      await updatePassword(user, newPassword);
      triggerHaptic('success');
      Alert.alert('Thành công', 'Mật khẩu của bạn đã được cập nhật thành công!');
    } catch (e: any) {
      triggerHaptic('error');
      Alert.alert('Đổi mật khẩu thất bại', getAuthErrorMessage(e));
      throw e;
    }
  };

  const handleSendResetEmail = async () => {
    if (!user || !user.email) return;
    triggerHaptic('medium');
    try {
      await sendPasswordResetEmail(auth, user.email);
      triggerHaptic('success');
      Alert.alert('Đã gửi email khôi phục', `Hướng dẫn đặt lại mật khẩu đã được gửi tới ${user.email}.\nVui lòng kiểm tra hộp thư của bạn.`);
    } catch (e: any) {
      triggerHaptic('error');
      Alert.alert('Không thể gửi email', getAuthErrorMessage(e));
      throw e;
    }
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
      {/* Linear App Header Bar */}
      <View style={styles.header}>
        <View>
          <Text style={styles.dateSubhead}>{todayDateStr}</Text>
          <View style={styles.brandRow}>
            <Text style={styles.largeTitle}>Anki</Text>
            <View style={styles.linearBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.linearBadgeText}>v1.0</Text>
            </View>
          </View>
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

      {/* Linear Hero Panel Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <Text style={styles.heroSectionTitle}>DAILY REVIEWS DUE</Text>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>{decks.length} DECKS</Text>
          </View>
        </View>

        <View style={styles.heroCountRow}>
          <Text style={styles.heroCount}>{totalDue}</Text>
          <Text style={styles.heroUnit}> CARD REVIEWS</Text>
        </View>

        <ProgressBar progress={progressPct} style={{ marginTop: Spacing.xs }} />

        <View style={styles.progressLabels}>
          <Text style={styles.progressText}>{progressPct}% COMPLETE</Text>
          <Text style={styles.progressText}>{doneToday} / {totalCards} CARDS</Text>
        </View>

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
          <Ionicons name={totalDue > 0 ? "play" : "checkmark-circle"} size={17} color="#F3F4F6" style={{ marginRight: 6 }} />
          <Text style={styles.primaryBtnText}>
            {totalDue > 0 ? 'START STUDY SESSION' : totalCards > 0 ? 'ALL REVIEWS COMPLETED' : 'CREATE DECK TO START'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Linear Grid Metrics */}
      <View style={styles.metricsGroup}>
        <View style={styles.metricCol}>
          <Text style={styles.metricValue}>{totalDue}</Text>
          <Text style={styles.metricLabel}>DUE TODAY</Text>
        </View>
        <View style={styles.metricSeparator} />
        <View style={styles.metricCol}>
          <Text style={styles.metricValue}>{totalNew}</Text>
          <Text style={styles.metricLabel}>NEW CARDS</Text>
        </View>
        <View style={styles.metricSeparator} />
        <View style={styles.metricCol}>
          <Text style={[styles.metricValue, { color: Colors.neon.emerald }]}>{doneToday}</Text>
          <Text style={styles.metricLabel}>COMPLETED</Text>
        </View>
      </View>

      {/* Decks Section Header */}
      <View style={styles.sectionHeader}>
        <SectionTitle style={{ marginBottom: 0, marginTop: 0, marginLeft: 0 }}>DECK COLLECTIONS</SectionTitle>
        <TouchableOpacity
          onPress={() => {
            triggerHaptic('selection');
            router.push('/decks' as any);
          }}
        >
          <Text style={styles.sectionLink}>View All ›</Text>
        </TouchableOpacity>
      </View>

      {isLoading && !refreshing ? (
        <ActivityIndicator color={Colors.accent.indigoLight} style={{ marginTop: 30 }} />
      ) : decks.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="journal-outline" size={36} color={Colors.accent.gray2} style={{ marginBottom: Spacing.sm }} />
          <Text style={styles.emptyTitle}>No Collections Found</Text>
          <Text style={styles.emptySub}>Create your first vocabulary deck to start studying</Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => {
              triggerHaptic('medium');
              router.push('/decks' as any);
            }}
          >
            <Text style={styles.emptyBtnText}>+ CREATE NEW DECK</Text>
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
                    <DeckIcon name={deck.icon} size={16} color={Colors.accent.indigoLight} />
                  </View>
                  <View style={styles.deckMeta}>
                    <Text style={styles.deckName} numberOfLines={1}>{deck.name}</Text>
                    <Text style={styles.deckSub}>{total} cards  •  {pct}% mastered</Text>
                  </View>
                  {due > 0 ? (
                    <View style={styles.dueBadge}>
                      <Text style={styles.dueBadgeText}>{due} DUE</Text>
                    </View>
                  ) : (
                    <Text style={styles.doneText}>COMPLETED</Text>
                  )}
                  <Ionicons name="chevron-forward" size={15} color={Colors.accent.gray3} style={{ marginLeft: 6 }} />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: Spacing.lg,
  },
  dateSubhead: {
    fontSize: Typography.text.caption1.fontSize,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.secondary,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  largeTitle: {
    fontSize: Typography.text.largeTitle.fontSize,
    lineHeight: Typography.text.largeTitle.lineHeight,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    letterSpacing: 0.37,
  },
  linearBadge: {
    flexDirection: 'row',
    alignItems: 'center',
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
    borderRadius: Radii.card,
    backgroundColor: Colors.bg.secondary,
    borderWidth: 1,
    borderColor: Colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: Typography.text.subhead.fontSize,
    fontWeight: Typography.weight.bold,
    color: Colors.accent.indigoLight,
    textAlign: 'center',
    textAlignVertical: 'center',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  heroBadgeText: {
    fontSize: Typography.text.caption2.fontSize,
    color: Colors.accent.indigoLight,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.5,
  },
  heroCountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.accent.indigoLight,
  },
  primaryBtnDisabled: {
    backgroundColor: Colors.bg.tertiary,
    borderColor: Colors.border.default,
  },
  primaryBtnText: {
    color: '#F3F4F6',
    fontSize: Typography.text.footnote.fontSize,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.5,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  metricsGroup: {
    flexDirection: 'row',
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radii.card,
    paddingVertical: Spacing.cellVertical,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  metricCol: { flex: 1, alignItems: 'center' },
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  deckRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    borderWidth: 1,
    borderColor: Colors.border.default,
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
    backgroundColor: Colors.bg.tertiary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  dueBadgeText: {
    fontSize: Typography.text.caption2.fontSize,
    color: Colors.neon.cyan,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.5,
  },
  doneText: {
    fontSize: Typography.text.caption2.fontSize,
    color: Colors.neon.emerald,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.5,
  },
  emptyCard: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radii.card,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border.default,
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
    backgroundColor: Colors.accent.indigo,
    paddingHorizontal: Spacing.xl,
    height: 44,
    borderRadius: Radii.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.accent.indigoLight,
  },
  emptyBtnText: {
    color: '#F3F4F6',
    fontWeight: Typography.weight.bold,
    fontSize: Typography.text.subhead.fontSize,
    letterSpacing: 0.5,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
});
