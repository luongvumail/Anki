import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useStore } from '../../store/useStore';
import { Colors, Typography, Spacing, Radii, Shadows } from '../../constants/theme';

const DECK_COLORS = ['#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4'];
const DECK_ICONS = ['📚', '🀄', '🐉', '🎋', '🏮', '🌸', '⛩️', '🍜', '🎎', '🐼'];

export default function DecksScreen() {
  const { decks, fetchDecks, createDeck, deleteDeck, isLoading, userId } = useStore();
  const [showCreate, setShowCreate] = useState(false);
  const [deckName, setDeckName] = useState('');
  const [deckDesc, setDeckDesc] = useState('');
  const [selectedColor, setSelectedColor] = useState(DECK_COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState(DECK_ICONS[0]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchDecks();
    }
  }, [userId]);

  const handleCreate = async () => {
    if (!deckName.trim()) { Alert.alert('Lỗi', 'Vui lòng nhập tên bộ thẻ'); return; }
    setCreating(true);
    try {
      await createDeck({ name: deckName.trim(), description: deckDesc.trim(), color: selectedColor, icon: selectedIcon });
      setShowCreate(false);
      setDeckName(''); setDeckDesc('');
    } catch (e: any) {
      Alert.alert('Lỗi', e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteDeck = (deck: any) => {
    Alert.alert('Xoá bộ thẻ', `Bạn có chắc muốn xoá "${deck.name}"? Tất cả thẻ sẽ bị xoá.`, [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Xoá', style: 'destructive', onPress: () => deleteDeck(deck.id) },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Bộ thẻ</Text>
          <Text style={styles.subtitle}>{decks.length > 0 ? `${decks.length} bộ thẻ` : 'Chưa có bộ thẻ nào'}</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.addBtnText}>Tạo mới</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {isLoading && <ActivityIndicator color={Colors.accent.purple} style={{ marginTop: 40 }} />}
        {decks.length === 0 && !isLoading && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🀄</Text>
            <Text style={styles.emptyTitle}>Chưa có bộ thẻ</Text>
            <Text style={styles.emptyText}>Tạo bộ thẻ đầu tiên để bắt đầu hành trình học tập của bạn</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowCreate(true)}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.emptyBtnText}>Tạo bộ thẻ đầu tiên</Text>
            </TouchableOpacity>
          </View>
        )}
        {decks.map(deck => {
          const total = deck.cardCount || 0;
          const due = deck.dueCount || 0;
          const masteryPct = total > 0 ? Math.round(((total - due) / total) * 100) : 0;
          return (
            <TouchableOpacity
              key={deck.id}
              style={styles.deckCard}
              onPress={() => router.push(`/deck/${deck.id}`)}
              onLongPress={() => handleDeleteDeck(deck)}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[deck.color + '18', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.deckGradient}
              >
                <View style={styles.deckTop}>
                  <View style={[styles.deckIconCircle, { backgroundColor: deck.color + '22' }]}>
                    <Text style={styles.deckIconText}>{deck.icon}</Text>
                  </View>
                  <View style={styles.deckMeta}>
                    <Text style={styles.deckName}>{deck.name}</Text>
                    {deck.description ? <Text style={styles.deckDesc}>{deck.description}</Text> : null}
                  </View>
                  <TouchableOpacity
                    style={[styles.studyBtn, { backgroundColor: deck.color }]}
                    onPress={() => router.push(`/study/${deck.id}`)}
                  >
                    <Ionicons name="play" size={14} color="#fff" />
                    <Text style={styles.studyBtnText}>Học</Text>
                  </TouchableOpacity>
                </View>

                {/* Progress bar */}
                <View style={styles.progressBg}>
                  <View style={[styles.progressFill, { width: `${masteryPct}%`, backgroundColor: deck.color }]} />
                </View>

                <View style={styles.counts}>
                  <CountChip label="Mới" value={deck.newCount || 0} color={Colors.accent.blue} />
                  <CountChip label="Cần ôn" value={due} color={Colors.accent.gold} />
                  <CountChip label="Đã thuộc" value={total - due} color={Colors.accent.green} />
                  <Text style={[styles.masteryText, { color: deck.color }]}>{masteryPct}%</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Create Deck Modal */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Tạo bộ thẻ mới</Text>
            <TouchableOpacity onPress={() => setShowCreate(false)}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView>
            <Text style={styles.fieldLabel}>Tên bộ thẻ *</Text>
            <TextInput
              style={styles.input}
              placeholder="VD: HSK 1, Từ vựng công việc..."
              placeholderTextColor={Colors.text.muted}
              value={deckName}
              onChangeText={setDeckName}
            />

            <Text style={styles.fieldLabel}>Mô tả (tuỳ chọn)</Text>
            <TextInput
              style={styles.input}
              placeholder="Mô tả ngắn về bộ thẻ..."
              placeholderTextColor={Colors.text.muted}
              value={deckDesc}
              onChangeText={setDeckDesc}
            />

            <Text style={styles.fieldLabel}>Màu sắc</Text>
            <View style={styles.colorRow}>
              {DECK_COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorDot, { backgroundColor: c }, selectedColor === c && styles.colorDotActive]}
                  onPress={() => setSelectedColor(c)}
                />
              ))}
            </View>

            <Text style={styles.fieldLabel}>Biểu tượng</Text>
            <View style={styles.iconGrid}>
              {DECK_ICONS.map(ic => (
                <TouchableOpacity
                  key={ic}
                  style={[styles.iconOption, selectedIcon === ic && styles.iconOptionActive]}
                  onPress={() => setSelectedIcon(ic)}
                >
                  <Text style={styles.iconOptionText}>{ic}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.createBtn, creating && styles.createBtnDisabled]}
              onPress={handleCreate}
              disabled={creating}
            >
              {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.createBtnText}>Tạo bộ thẻ</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function CountChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[styles.chip, { borderColor: color + '50' }]}>
      <Text style={[styles.chipValue, { color }]}>{value}</Text>
      <Text style={styles.chipLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingTop: 60, paddingBottom: Spacing.md },
  title: { fontSize: Typography.text.xxxl, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  subtitle: { fontSize: Typography.text.sm, color: Colors.text.muted, marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.accent.purple, borderRadius: Radii.full, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg, ...Shadows.card },
  addBtnText: { color: '#fff', fontWeight: Typography.weight.semibold, fontSize: Typography.text.sm },
  list: { padding: Spacing.xl, paddingTop: Spacing.md, paddingBottom: 100 },

  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: Spacing.xl },
  emptyIcon: { fontSize: 64, marginBottom: Spacing.lg },
  emptyTitle: { fontSize: Typography.text.xl, fontWeight: Typography.weight.bold, color: Colors.text.primary, marginBottom: Spacing.xs },
  emptyText: { fontSize: Typography.text.sm, color: Colors.text.secondary, marginTop: Spacing.xs, textAlign: 'center', lineHeight: 20, marginBottom: Spacing.xl },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.accent.purple, borderRadius: Radii.full, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl },
  emptyBtnText: { color: '#fff', fontWeight: Typography.weight.bold, fontSize: Typography.text.md },

  deckCard: {
    borderRadius: Radii.xl, marginBottom: Spacing.lg,
    overflow: 'hidden', borderWidth: 1, borderColor: Colors.border.default,
    backgroundColor: Colors.bg.card,
  },
  deckGradient: { padding: Spacing.lg },
  deckTop: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md, gap: Spacing.md },
  deckIconCircle: { width: 52, height: 52, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center' },
  deckIconText: { fontSize: 28 },
  deckMeta: { flex: 1 },
  deckName: { fontSize: Typography.text.lg, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  deckDesc: { fontSize: Typography.text.xs, color: Colors.text.muted, marginTop: 2 },
  progressBg: { height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, marginBottom: Spacing.md, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  counts: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  chip: { borderRadius: Radii.xs, borderWidth: 1, paddingVertical: 3, paddingHorizontal: Spacing.sm, alignItems: 'center' },
  chipValue: { fontSize: Typography.text.sm, fontWeight: Typography.weight.bold },
  chipLabel: { fontSize: 10, color: Colors.text.muted },
  masteryText: { marginLeft: 'auto', fontSize: Typography.text.sm, fontWeight: Typography.weight.bold },
  studyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radii.md, paddingVertical: Spacing.xs, paddingHorizontal: Spacing.md },
  studyBtnText: { color: '#fff', fontWeight: Typography.weight.semibold, fontSize: Typography.text.xs },

  modal: { flex: 1, backgroundColor: Colors.bg.primary, padding: Spacing.xl },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xxl, paddingTop: Spacing.lg },
  modalTitle: { fontSize: Typography.text.xxl, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  closeBtn: { fontSize: 20, color: Colors.text.muted, padding: Spacing.sm },
  fieldLabel: { fontSize: Typography.text.sm, color: Colors.text.secondary, marginBottom: Spacing.xs, fontWeight: Typography.weight.medium, marginTop: Spacing.lg },
  input: {
    backgroundColor: Colors.bg.elevated, borderRadius: Radii.md,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    color: Colors.text.primary, fontSize: Typography.text.md,
    borderWidth: 1, borderColor: Colors.border.default,
  },
  colorRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap', marginTop: Spacing.sm },
  colorDot: { width: 40, height: 40, borderRadius: 20 },
  colorDotActive: { borderWidth: 3, borderColor: '#fff', transform: [{ scale: 1.1 }] },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.sm },
  iconOption: {
    width: 56, height: 56, borderRadius: Radii.md,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.bg.elevated, borderWidth: 1, borderColor: Colors.border.subtle,
  },
  iconOptionActive: { borderColor: Colors.accent.purple, backgroundColor: Colors.accent.purpleDim },
  iconOptionText: { fontSize: 30 },
  createBtn: { backgroundColor: Colors.accent.purple, borderRadius: Radii.lg, padding: Spacing.lg, alignItems: 'center', marginTop: Spacing.xxl, marginBottom: 40, ...Shadows.card },
  createBtnDisabled: { opacity: 0.6 },
  createBtnText: { color: '#fff', fontWeight: Typography.weight.bold, fontSize: Typography.text.md },
});
