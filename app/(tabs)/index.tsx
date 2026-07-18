import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { auth } from '../../lib/firebase';
import { useStore } from '../../store/useStore';
import { Colors, Typography, Spacing, Radii, Shadows, Animation } from '../../constants/theme';

const { width } = Dimensions.get('window');
const DECK_CARD_W = width * 0.62;

export default function DashboardScreen() {
  const { decks, fetchDecks, isLoading, userId } = useStore();
  const [refreshing, setRefreshing] = useState(false);
  const user = auth.currentUser;

  const hour = new Date().getHours();
  const greeting =
    hour < 5 ? 'Đêm khuya rồi 🌙' :
    hour < 12 ? 'Chào buổi sáng ☀️' :
    hour < 18 ? 'Chào buổi chiều 🌤' :
    'Chào buổi tối 🌇';

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
    setRefreshing(true);
    await fetchDecks();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent.purpleLight} />}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.userName}>{displayName}</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
      </View>

      {/* ── Hero Card ── */}
      <LinearGradient
        colors={['#1e0a47', '#0a1a3d']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        {/* Glow circles */}
        <View style={[styles.glowCircle, { top: -40, right: -40, backgroundColor: Colors.accent.purpleGlow }]} />
        <View style={[styles.glowCircle, { bottom: -20, left: -20, backgroundColor: 'rgba(59,130,246,0.15)', width: 100, height: 100 }]} />

        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroLabel}>Cần ôn hôm nay</Text>
            <View style={styles.heroCountRow}>
              <Text style={styles.heroCount}>{totalDue}</Text>
              <Text style={styles.heroUnit}> thẻ</Text>
            </View>
          </View>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>{decks.length} bộ từ</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
        </View>
        <Text style={styles.progressLabel}>{progressPct}% hoàn thành hôm nay</Text>

        <TouchableOpacity
          style={styles.startBtn}
          onPress={() => {
            const firstDue = decks.find(d => (d.dueCount || 0) > 0);
            if (firstDue) router.push(`/study/${firstDue.id}`);
          }}
          disabled={totalDue === 0}
          activeOpacity={0.85}
        >
          <Ionicons name="play" size={16} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.startBtnText}>
            {totalDue > 0 ? 'Bắt đầu ôn tập' : '✅ Hoàn thành hôm nay!'}
          </Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* ── Mini Stats Row ── */}
      <View style={styles.statsRow}>
        <MiniStat icon="time" label="Cần ôn" value={totalDue} color={Colors.accent.gold} />
        <View style={styles.statsDivider} />
        <MiniStat icon="sparkles" label="Từ mới" value={totalNew} color={Colors.accent.blue} />
        <View style={styles.statsDivider} />
        <MiniStat icon="checkmark-circle" label="Đã xong" value={doneToday} color={Colors.accent.green} />
      </View>

      {/* ── Deck List ── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Bộ thẻ của bạn</Text>
        <TouchableOpacity onPress={() => router.push('/decks' as any)}>
          <Text style={styles.sectionLink}>Xem tất cả</Text>
        </TouchableOpacity>
      </View>

      {isLoading && !refreshing ? (
        <ActivityIndicator color={Colors.accent.purpleLight} style={{ marginTop: 40 }} />
      ) : decks.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📚</Text>
          <Text style={styles.emptyTitle}>Chưa có bộ thẻ nào</Text>
          <Text style={styles.emptyText}>Tạo bộ thẻ đầu tiên để bắt đầu hành trình học tập</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/decks' as any)}>
            <Text style={styles.emptyBtnText}>+ Tạo bộ thẻ</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.deckRow}>
          {decks.map(deck => {
            const due = deck.dueCount || 0;
            const total = deck.cardCount || 0;
            const pct = total > 0 ? Math.round(((total - due) / total) * 100) : 0;
            return (
              <TouchableOpacity
                key={deck.id}
                style={styles.deckCard}
                onPress={() => router.push(`/study/${deck.id}` as any)}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[deck.color + '22', deck.color + '08']}
                  style={styles.deckCardGradient}
                >
                  <View style={styles.deckCardTop}>
                    <Text style={styles.deckCardIcon}>{deck.icon}</Text>
                    {due > 0 && (
                      <View style={[styles.deckBadge, { backgroundColor: deck.color + '33' }]}>
                        <Text style={[styles.deckBadgeText, { color: deck.color }]}>{due} ôn</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.deckCardName}>{deck.name}</Text>
                  <Text style={styles.deckCardSub}>{total} từ vựng</Text>
                  <View style={styles.deckProgressBg}>
                    <View style={[styles.deckProgressFill, { width: `${pct}%`, backgroundColor: deck.color }]} />
                  </View>
                  <Text style={[styles.deckPct, { color: deck.color }]}>{pct}% thuộc</Text>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* ── Sign Out ── */}
      <TouchableOpacity style={styles.signOut} onPress={() => auth.signOut()}>
        <Ionicons name="log-out-outline" size={16} color={Colors.text.muted} />
        <Text style={styles.signOutText}>Đăng xuất</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function MiniStat({ icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <View style={styles.miniStat}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[styles.miniStatValue, { color }]}>{value}</Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  content: { paddingBottom: 100 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingTop: 60, paddingBottom: Spacing.xl },
  greeting: { fontSize: Typography.text.sm, color: Colors.text.secondary, marginBottom: 2 },
  userName: { fontSize: Typography.text.xxl, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.accent.purple,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: Typography.text.md, fontWeight: Typography.weight.bold, color: '#fff' },

  // Hero
  hero: {
    marginHorizontal: Spacing.xl, borderRadius: Radii.xl,
    padding: Spacing.xl, marginBottom: Spacing.xl,
    overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.border.glow,
  },
  glowCircle: { position: 'absolute', width: 140, height: 140, borderRadius: 70, opacity: 0.6 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.lg },
  heroLabel: { fontSize: Typography.text.sm, color: Colors.accent.purpleLight, fontWeight: Typography.weight.medium, letterSpacing: 0.5 },
  heroCountRow: { flexDirection: 'row', alignItems: 'baseline' },
  heroCount: { fontSize: 52, fontWeight: Typography.weight.black, color: Colors.text.primary, lineHeight: 60 },
  heroUnit: { fontSize: Typography.text.lg, color: Colors.text.secondary, fontWeight: Typography.weight.medium },
  heroBadge: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: Radii.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
  heroBadgeText: { fontSize: Typography.text.xs, color: Colors.text.secondary, fontWeight: Typography.weight.medium },

  progressBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, marginBottom: Spacing.xs, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.accent.purpleLight, borderRadius: 3 },
  progressLabel: { fontSize: Typography.text.xs, color: Colors.text.muted, marginBottom: Spacing.lg },

  startBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.accent.purple,
    borderRadius: Radii.lg, paddingVertical: Spacing.md,
    shadowColor: Colors.accent.purple,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 6,
  },
  startBtnText: { color: '#fff', fontSize: Typography.text.md, fontWeight: Typography.weight.bold },

  // Mini Stats
  statsRow: {
    flexDirection: 'row', marginHorizontal: Spacing.xl,
    backgroundColor: Colors.bg.card, borderRadius: Radii.lg,
    borderWidth: 1, borderColor: Colors.border.subtle,
    marginBottom: Spacing.xxl, overflow: 'hidden',
  },
  miniStat: { flex: 1, alignItems: 'center', paddingVertical: Spacing.lg, gap: 4 },
  miniStatValue: { fontSize: Typography.text.xl, fontWeight: Typography.weight.bold },
  miniStatLabel: { fontSize: Typography.text.xs, color: Colors.text.muted, fontWeight: Typography.weight.medium },
  statsDivider: { width: 1, backgroundColor: Colors.border.subtle, marginVertical: Spacing.md },

  // Section header
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, marginBottom: Spacing.md },
  sectionTitle: { fontSize: Typography.text.lg, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  sectionLink: { fontSize: Typography.text.sm, color: Colors.accent.purpleLight, fontWeight: Typography.weight.medium },

  // Deck row
  deckRow: { paddingHorizontal: Spacing.xl, gap: Spacing.md, paddingBottom: Spacing.sm },
  deckCard: { width: DECK_CARD_W, borderRadius: Radii.xl, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border.default },
  deckCardGradient: { padding: Spacing.xl },
  deckCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  deckCardIcon: { fontSize: 32 },
  deckBadge: { borderRadius: Radii.full, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  deckBadgeText: { fontSize: Typography.text.xs, fontWeight: Typography.weight.bold },
  deckCardName: { fontSize: Typography.text.lg, fontWeight: Typography.weight.bold, color: Colors.text.primary, marginBottom: 4 },
  deckCardSub: { fontSize: Typography.text.xs, color: Colors.text.muted, marginBottom: Spacing.md },
  deckProgressBg: { height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, marginBottom: Spacing.xs, overflow: 'hidden' },
  deckProgressFill: { height: '100%', borderRadius: 2 },
  deckPct: { fontSize: Typography.text.xs, fontWeight: Typography.weight.semibold },

  // Empty
  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: Spacing.xl },
  emptyIcon: { fontSize: 56, marginBottom: Spacing.md },
  emptyTitle: { fontSize: Typography.text.xl, fontWeight: Typography.weight.bold, color: Colors.text.primary, marginBottom: Spacing.xs },
  emptyText: { fontSize: Typography.text.sm, color: Colors.text.secondary, textAlign: 'center', lineHeight: 20, marginBottom: Spacing.xl },
  emptyBtn: { backgroundColor: Colors.accent.purple, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: Radii.full },
  emptyBtnText: { color: '#fff', fontWeight: Typography.weight.bold, fontSize: Typography.text.md },

  // Sign out
  signOut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, marginTop: Spacing.xxxl, paddingBottom: Spacing.xl },
  signOutText: { fontSize: Typography.text.sm, color: Colors.text.muted },
});
