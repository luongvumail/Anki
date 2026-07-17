import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useStore } from '../../store/useStore';
import { Colors, Typography, Spacing, Radii } from '../../constants/theme';

const DECK_COLORS = ['#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4'];
const DECK_ICONS = ['📚', '🀄', '🐉', '🎋', '🏮', '🌸', '⛩️', '🍜', '🎎', '🐼'];

export default function DecksScreen() {
  const { decks, fetchDecks, createDeck, deleteDeck, isLoading } = useStore();
  const [showCreate, setShowCreate] = useState(false);
  const [deckName, setDeckName] = useState('');
  const [deckDesc, setDeckDesc] = useState('');
  const [selectedColor, setSelectedColor] = useState(DECK_COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState(DECK_ICONS[0]);
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchDecks(); }, []);

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
        <Text style={styles.title}>Bộ thẻ</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)}>
          <Text style={styles.addBtnText}>+ Tạo mới</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {isLoading && <ActivityIndicator color={Colors.accent.purple} style={{ marginTop: 40 }} />}
        {decks.length === 0 && !isLoading && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🀄</Text>
            <Text style={styles.emptyTitle}>Chưa có bộ thẻ</Text>
            <Text style={styles.emptyText}>Nhấn "+ Tạo mới" để bắt đầu</Text>
          </View>
        )}
        {decks.map(deck => (
          <TouchableOpacity
            key={deck.id}
            style={styles.deckCard}
            onPress={() => router.push(`/deck/${deck.id}`)}
            onLongPress={() => handleDeleteDeck(deck)}
            activeOpacity={0.85}
          >
            {/* Color stripe */}
            <View style={[styles.stripe, { backgroundColor: deck.color }]} />
            <View style={styles.deckBody}>
              <View style={styles.deckTop}>
                <Text style={styles.deckIconText}>{deck.icon}</Text>
                <View style={styles.deckMeta}>
                  <Text style={styles.deckName}>{deck.name}</Text>
                  {deck.description ? <Text style={styles.deckDesc}>{deck.description}</Text> : null}
                </View>
              </View>
              <View style={styles.counts}>
                <CountChip label="Mới" value={deck.newCount || 0} color={Colors.accent.blue} />
                <CountChip label="Ôn" value={deck.dueCount || 0} color={Colors.accent.gold} />
                <CountChip label="Tổng" value={deck.cardCount || 0} color={Colors.text.muted} />
              </View>
              <TouchableOpacity
                style={[styles.studyBtn, { backgroundColor: deck.color }]}
                onPress={() => router.push(`/study/${deck.id}`)}
              >
                <Text style={styles.studyBtnText}>Học ngay ▶</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.xl, paddingTop: 60 },
  title: { fontSize: Typography.text.xxxl, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  addBtn: { backgroundColor: Colors.accent.purple, borderRadius: Radii.full, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg },
  addBtnText: { color: '#fff', fontWeight: Typography.weight.semibold, fontSize: Typography.text.sm },
  list: { padding: Spacing.xl, paddingTop: 0, paddingBottom: 40 },

  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 56, marginBottom: Spacing.lg },
  emptyTitle: { fontSize: Typography.text.xl, fontWeight: Typography.weight.semibold, color: Colors.text.primary },
  emptyText: { fontSize: Typography.text.sm, color: Colors.text.secondary, marginTop: Spacing.sm },

  deckCard: {
    backgroundColor: Colors.bg.card, borderRadius: Radii.xl,
    marginBottom: Spacing.lg, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.border.subtle,
    flexDirection: 'row',
  },
  stripe: { width: 5 },
  deckBody: { flex: 1, padding: Spacing.lg },
  deckTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.md },
  deckIconText: { fontSize: 32, marginRight: Spacing.md },
  deckMeta: { flex: 1 },
  deckName: { fontSize: Typography.text.lg, fontWeight: Typography.weight.semibold, color: Colors.text.primary },
  deckDesc: { fontSize: Typography.text.sm, color: Colors.text.secondary, marginTop: 2 },
  counts: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  chip: { borderRadius: Radii.sm, borderWidth: 1, paddingVertical: 4, paddingHorizontal: Spacing.sm, alignItems: 'center' },
  chipValue: { fontSize: Typography.text.md, fontWeight: Typography.weight.bold },
  chipLabel: { fontSize: Typography.text.xs, color: Colors.text.muted },
  studyBtn: { borderRadius: Radii.md, paddingVertical: Spacing.sm, alignItems: 'center' },
  studyBtnText: { color: '#fff', fontWeight: Typography.weight.semibold, fontSize: Typography.text.sm },

  modal: { flex: 1, backgroundColor: Colors.bg.primary, padding: Spacing.xl },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xxl, paddingTop: Spacing.lg },
  modalTitle: { fontSize: Typography.text.xxl, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  closeBtn: { fontSize: 20, color: Colors.text.muted, padding: Spacing.sm },
  fieldLabel: { fontSize: Typography.text.sm, color: Colors.text.secondary, marginBottom: Spacing.xs, fontWeight: Typography.weight.medium, marginTop: Spacing.lg },
  input: {
    backgroundColor: Colors.bg.secondary, borderRadius: Radii.md,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    color: Colors.text.primary, fontSize: Typography.text.md,
    borderWidth: 1, borderColor: Colors.border.default,
  },
  colorRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap', marginTop: Spacing.sm },
  colorDot: { width: 36, height: 36, borderRadius: 18 },
  colorDotActive: { borderWidth: 3, borderColor: '#fff' },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.sm },
  iconOption: {
    width: 52, height: 52, borderRadius: Radii.md,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.bg.card, borderWidth: 1, borderColor: Colors.border.subtle,
  },
  iconOptionActive: { borderColor: Colors.accent.purple, backgroundColor: Colors.accent.purpleDim },
  iconOptionText: { fontSize: 28 },
  createBtn: { backgroundColor: Colors.accent.purple, borderRadius: Radii.md, padding: Spacing.lg, alignItems: 'center', marginTop: Spacing.xxl, marginBottom: 40 },
  createBtnDisabled: { opacity: 0.6 },
  createBtnText: { color: '#fff', fontWeight: Typography.weight.semibold, fontSize: Typography.text.md },
});
