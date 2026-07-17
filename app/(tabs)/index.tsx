import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { auth } from '../../lib/firebase';
import { useStore } from '../../store/useStore';
import { isDue } from '../../lib/srs';
import { Colors, Typography, Spacing, Radii, Shadows } from '../../constants/theme';

export default function DashboardScreen() {
  const { decks, fetchDecks, isLoading, userId } = useStore();
  const [refreshing, setRefreshing] = useState(false);
  const user = auth.currentUser;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

  // Total due cards across all decks
  const totalDue = decks.reduce((sum, d) => sum + (d.dueCount || 0), 0);
  const totalCards = decks.reduce((sum, d) => sum + (d.cardCount || 0), 0);

  useEffect(() => {
    if (userId) {
      fetchDecks();
    }
  }, [userId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDecks();
    setRefreshing(false);
  };

  const handleSignOut = () => auth.signOut();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent.purple} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting} 👋</Text>
          <Text style={styles.userName}>{user?.displayName || user?.email?.split('@')[0] || 'Học viên'}</Text>
        </View>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn}>
          <Text style={styles.signOutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </View>

      {/* Today's review summary */}
      <View style={styles.heroCard}>
        <View style={styles.heroGlow} />
        <Text style={styles.heroLabel}>Cần ôn hôm nay</Text>
        <Text style={styles.heroCount}>{totalDue}</Text>
        <Text style={styles.heroSub}>thẻ trong {decks.length} bộ từ</Text>
        {totalDue > 0 && (
          <TouchableOpacity
            style={styles.startBtn}
            onPress={() => decks.length > 0 && router.push(`/study/${decks[0].id}`)}
            activeOpacity={0.85}
          >
            <Text style={styles.startBtnText}>▶  Bắt đầu ôn tập</Text>
          </TouchableOpacity>
        )}
        {totalDue === 0 && totalCards > 0 && (
          <View style={styles.doneBox}>
            <Text style={styles.doneText}>✅ Bạn đã hoàn thành tất cả bài ôn hôm nay!</Text>
          </View>
        )}
      </View>

      {/* Quick stats row */}
      <View style={styles.statsRow}>
        <StatBox label="Tổng thẻ" value={totalCards} color={Colors.accent.purple} />
        <StatBox label="Cần ôn" value={totalDue} color={Colors.accent.gold} />
        <StatBox label="Bộ từ" value={decks.length} color={Colors.accent.green} />
      </View>

      {/* Deck list preview */}
      <Text style={styles.sectionTitle}>Bộ từ của bạn</Text>
      {isLoading && <ActivityIndicator color={Colors.accent.purple} style={{ marginTop: 20 }} />}
      {decks.length === 0 && !isLoading && (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>📚</Text>
          <Text style={styles.emptyTitle}>Chưa có bộ từ nào</Text>
          <Text style={styles.emptyText}>Tạo bộ từ đầu tiên trong tab "Bộ thẻ"</Text>
        </View>
      )}
      {decks.map(deck => (
        <TouchableOpacity
          key={deck.id}
          style={styles.deckRow}
          onPress={() => router.push(`/deck/${deck.id}`)}
          activeOpacity={0.8}
        >
          <View style={[styles.deckIcon, { backgroundColor: deck.color + '33' }]}>
            <Text style={styles.deckIconText}>{deck.icon}</Text>
          </View>
          <View style={styles.deckInfo}>
            <Text style={styles.deckName}>{deck.name}</Text>
            <Text style={styles.deckMeta}>{deck.cardCount} thẻ • {deck.dueCount || 0} cần ôn</Text>
          </View>
          {(deck.dueCount || 0) > 0 && (
            <View style={styles.dueBadge}>
              <Text style={styles.dueBadgeText}>{deck.dueCount}</Text>
            </View>
          )}
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[styles.statBox, { borderColor: color + '40' }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  content: { padding: Spacing.xl, paddingTop: 60, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xxl },
  greeting: { fontSize: Typography.text.sm, color: Colors.text.secondary },
  userName: { fontSize: Typography.text.xl, fontWeight: Typography.weight.bold, color: Colors.text.primary, marginTop: 2 },
  signOutBtn: { padding: Spacing.sm },
  signOutText: { color: Colors.text.muted, fontSize: Typography.text.sm },

  heroCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radii.xl,
    padding: Spacing.xxl,
    marginBottom: Spacing.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.accent.purpleDim,
    ...Shadows.card,
  },
  heroGlow: {
    position: 'absolute', top: -40, right: -40,
    width: 150, height: 150, borderRadius: 75,
    backgroundColor: Colors.accent.purpleDim,
  },
  heroLabel: { fontSize: Typography.text.sm, color: Colors.text.secondary, marginBottom: Spacing.xs },
  heroCount: { fontSize: 72, fontWeight: Typography.weight.heavy, color: Colors.text.primary, lineHeight: 80 },
  heroSub: { fontSize: Typography.text.sm, color: Colors.text.secondary, marginBottom: Spacing.xl },
  startBtn: {
    backgroundColor: Colors.accent.purple,
    borderRadius: Radii.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  startBtnText: { color: '#fff', fontWeight: Typography.weight.semibold, fontSize: Typography.text.md },
  doneBox: { backgroundColor: Colors.accent.greenDim, borderRadius: Radii.md, padding: Spacing.md },
  doneText: { color: Colors.accent.green, fontSize: Typography.text.sm, textAlign: 'center' },

  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xxl },
  statBox: {
    flex: 1, backgroundColor: Colors.bg.card,
    borderRadius: Radii.lg, padding: Spacing.lg, alignItems: 'center',
    borderWidth: 1,
  },
  statValue: { fontSize: Typography.text.xxl, fontWeight: Typography.weight.bold },
  statLabel: { fontSize: Typography.text.xs, color: Colors.text.muted, marginTop: 2 },

  sectionTitle: { fontSize: Typography.text.lg, fontWeight: Typography.weight.semibold, color: Colors.text.primary, marginBottom: Spacing.md },
  emptyBox: { alignItems: 'center', paddingVertical: Spacing.section },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { fontSize: Typography.text.lg, fontWeight: Typography.weight.semibold, color: Colors.text.primary },
  emptyText: { fontSize: Typography.text.sm, color: Colors.text.secondary, marginTop: Spacing.xs, textAlign: 'center' },

  deckRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.bg.card, borderRadius: Radii.lg,
    padding: Spacing.lg, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border.subtle,
  },
  deckIcon: { width: 44, height: 44, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  deckIconText: { fontSize: 22 },
  deckInfo: { flex: 1 },
  deckName: { fontSize: Typography.text.md, fontWeight: Typography.weight.semibold, color: Colors.text.primary },
  deckMeta: { fontSize: Typography.text.sm, color: Colors.text.secondary, marginTop: 2 },
  dueBadge: {
    backgroundColor: Colors.accent.purple, borderRadius: Radii.full,
    minWidth: 24, height: 24, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing.xs, marginRight: Spacing.sm,
  },
  dueBadgeText: { color: '#fff', fontSize: Typography.text.xs, fontWeight: Typography.weight.bold },
  chevron: { color: Colors.text.muted, fontSize: 20 },
});
