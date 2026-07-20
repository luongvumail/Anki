import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useStore } from '../../store/useStore';
import { getFirestoreErrorMessage } from '../../lib/errorHandler';
import { Colors, Typography, Spacing, Radii, VECTOR_DECK_ICONS, triggerHaptic } from '../../constants/theme';
import { DeckIcon } from '../../components/ui/DeckIcon';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { InsetGroup } from '../../components/ui/InsetGroup';
import { FormField } from '../../components/ui/FormField';

import { computeDueCount, computeNewCount, getDeckMasteryPct } from '../../lib/deckUtils';

export default function DecksScreen() {
  const insets = useSafeAreaInsets();
  const { decks, fetchDecks, createDeck, deleteDeck, resetDeckProgress, isLoading, userId } = useStore();
  const [showCreate, setShowCreate] = useState(false);
  const [deckName, setDeckName] = useState('');
  const [deckDesc, setDeckDesc] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(VECTOR_DECK_ICONS[0]);
  const [creating, setCreating] = useState(false);
  const [resettingDeckId, setResettingDeckId] = useState<string | null>(null);

  useEffect(() => {
    if (userId) fetchDecks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleCreate = async () => {
    if (!deckName.trim()) {
      triggerHaptic('warning');
      Alert.alert('Thông báo', 'Vui lòng nhập tên bộ thẻ');
      return;
    }
    setCreating(true);
    triggerHaptic('medium');
    try {
      await createDeck({ name: deckName.trim(), description: deckDesc.trim(), color: Colors.accent.indigo, icon: selectedIcon });
      triggerHaptic('success');
      setShowCreate(false);
      setDeckName(''); setDeckDesc('');
    } catch (e: any) {
      triggerHaptic('error');
      Alert.alert('Lỗi lưu dữ liệu', getFirestoreErrorMessage(e));
    } finally {
      setCreating(false);
    }
  };

  const handleLongPressDeck = (deck: any) => {
    triggerHaptic('warning');
    Alert.alert(
      deck.name,
      'Chọn thao tác cho bộ thẻ này:',
      [
        {
          text: 'Học ngay',
          onPress: () => {
            triggerHaptic('light');
            router.push(`/study/${deck.id}`);
          },
        },
        {
          text: 'Reset tiến độ học ⚠️',
          onPress: () => {
            Alert.alert(
              'Reset tiến độ?',
              `Toàn bộ tiến độ SRS của bộ thẻ “${deck.name}” sẽ về 0. Từ vựng vẫn được giữ nguyên.`,
              [
                { text: 'Hủy', style: 'cancel' },
                {
                  text: 'Reset tiến độ',
                  style: 'destructive',
                  onPress: async () => {
                    triggerHaptic('error');
                    setResettingDeckId(deck.id);
                    try {
                      await resetDeckProgress(deck.id);
                      triggerHaptic('success');
                      Alert.alert('Đã reset', `Tiến độ học của bộ thẻ “${deck.name}” đã về 0.`);
                    } catch (e: any) {
                      triggerHaptic('error');
                      Alert.alert('Lỗi', e.message || 'Không thể reset tiến độ.');
                    } finally {
                      setResettingDeckId(null);
                    }
                  },
                },
              ]
            );
          },
        },
        {
          text: 'Xoá bộ thẻ 🗑️',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Xoá bộ thẻ', `Bạn có chắc chắn muốn xoá bộ thẻ “${deck.name}” và toàn bộ từ vựng?`, [
              { text: 'Hủy', style: 'cancel' },
              {
                text: 'Xoá',
                style: 'destructive',
                onPress: () => {
                  triggerHaptic('error');
                  deleteDeck(deck.id);
                },
              },
            ]);
          },
        },
        { text: 'Hủy', style: 'cancel' },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.list,
          {
            paddingTop: Math.max(insets.top + 16, 54),
            paddingBottom: Math.max(insets.bottom + 90, 110),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
      {/* Linear Header Bar */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubhead}>{decks.length} BỘ THẺ LƯU TRỮ</Text>
          <Text style={styles.headerTitle}>Bộ thẻ</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => {
            triggerHaptic('selection');
            setShowCreate(true);
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={26} color={Colors.accent.indigoLight} />
        </TouchableOpacity>
      </View>

      {isLoading && <ActivityIndicator color={Colors.accent.indigoLight} style={{ marginTop: 30 }} />}

        {decks.length === 0 && !isLoading && (
          <View style={styles.emptyCard}>
            <Ionicons name="folder-open-outline" size={40} color={Colors.text.secondary} style={{ marginBottom: Spacing.sm }} />
            <Text style={styles.emptyTitle}>Chưa có bộ thẻ</Text>
            <Text style={styles.emptySub}>Tạo bộ thẻ để phân loại từ vựng Tiếng Trung</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => {
                triggerHaptic('medium');
                setShowCreate(true);
              }}
            >
              <Text style={styles.emptyBtnText}>+ Tạo bộ thẻ mới</Text>
            </TouchableOpacity>
          </View>
        )}

        {decks.length > 0 && (
          <InsetGroup>
            {decks.map((deck, idx) => {
              const deckCards = useStore.getState().cards[deck.id];
              const total = deck.cardCount || 0;
              const due = deckCards ? computeDueCount(deckCards) : (deck.dueCount || 0);
              const newCount = deckCards ? computeNewCount(deckCards) : (deck.newCount || 0);
              const masteryPct = getDeckMasteryPct(total, due, deckCards);

              return (
                <React.Fragment key={deck.id}>
                  {idx > 0 && <View style={styles.cellDividerIndented} />}
                  <TouchableOpacity
                    style={styles.deckCell}
                    onPress={() => {
                      triggerHaptic('light');
                      router.push(`/deck/${deck.id}`);
                    }}
                    onLongPress={() => handleLongPressDeck(deck)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.deckIconTile}>
                      {resettingDeckId === deck.id
                        ? <ActivityIndicator size="small" color={Colors.accent.indigoLight} />
                        : <DeckIcon name={deck.icon} size={18} color={Colors.accent.indigoLight} />
                      }
                    </View>

                    <View style={styles.deckMeta}>
                      <View style={styles.deckNameRow}>
                        <Text style={styles.deckName}>{deck.name}</Text>
                        {due > 0 ? (
                          <View style={styles.dueBadge}>
                            <Text style={styles.dueBadgeText}>{due} ôn</Text>
                          </View>
                        ) : newCount > 0 ? (
                          <View style={styles.dueBadge}>
                            <Text style={styles.dueBadgeText}>{newCount} mới</Text>
                          </View>
                        ) : null}
                      </View>

                      {deck.description ? (
                        <Text style={styles.deckDesc} numberOfLines={1}>{deck.description}</Text>
                      ) : null}

                      {/* Progress Track */}
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${masteryPct}%` }]} />
                      </View>

                      <Text style={styles.deckStatsText}>
                        {total} từ vựng  •  {masteryPct}% thuộc
                      </Text>
                    </View>

                    <Ionicons name="chevron-forward" size={16} color={Colors.accent.gray3} style={{ marginLeft: 8 }} />
                  </TouchableOpacity>
                </React.Fragment>
              );
            })}
          </InsetGroup>
        )}
      </ScrollView>

      {/* Modal - Linear Form Field Layout */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCreate(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreate(false)} style={styles.headerLeftBtn}>
              <Text style={styles.cancelBtnText}>Hủy</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>BỘ THẺ MỚI</Text>
            <TouchableOpacity onPress={handleCreate} disabled={creating} style={styles.headerRightBtn}>
              {creating ? (
                <ActivityIndicator size="small" color={Colors.accent.indigoLight} />
              ) : (
                <Text style={styles.doneBtnText}>Tạo</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
            <SectionTitle>THÔNG TIN BỘ THẺ</SectionTitle>
            <View style={styles.formContainer}>
              <FormField
                label="TÊN BỘ THẺ"
                placeholder="VD: HSK 1, Giao tiếp..."
                value={deckName}
                onChangeText={setDeckName}
              />
              <FormField
                label="MÔ TẢ BỘ THẺ"
                placeholder="Mô tả ngắn (tuỳ chọn)"
                value={deckDesc}
                onChangeText={setDeckDesc}
                containerStyle={{ marginBottom: 0 }}
              />
            </View>

            <SectionTitle>BIỂU TƯỢNG ICON VECTOR</SectionTitle>
            <View style={styles.modalInsetGroupPadding}>
              <View style={styles.iconGrid}>
                {VECTOR_DECK_ICONS.map(icName => (
                  <TouchableOpacity
                    key={icName}
                    style={[styles.iconOption, selectedIcon === icName && styles.iconOptionActive]}
                    onPress={() => {
                      triggerHaptic('selection');
                      setSelectedIcon(icName);
                    }}
                  >
                    <DeckIcon name={icName} size={22} color={selectedIcon === icName ? Colors.accent.indigoLight : Colors.text.secondary} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  headerSubhead: {
    fontSize: Typography.text.caption1.fontSize,
    lineHeight: Typography.text.caption1.lineHeight,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.secondary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    letterSpacing: -0.3,
  },
  addBtn: {
    padding: Spacing.xs,
  },
  list: { paddingHorizontal: Spacing.pageMargin, paddingTop: Spacing.sm },

  deckCell: {
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
  deckNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginRight: 4,
  },
  deckName: {
    fontSize: Typography.text.body.fontSize,
    lineHeight: Typography.text.body.lineHeight,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
  },
  deckDesc: {
    fontSize: Typography.text.caption1.fontSize,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  progressTrack: {
    height: 4,
    backgroundColor: Colors.bg.tertiary,
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.accent.indigoLight,
    borderRadius: 2,
  },
  deckStatsText: {
    fontSize: Typography.text.caption1.fontSize,
    color: Colors.text.secondary,
    marginTop: 4,
  },
  dueBadge: {
    backgroundColor: Colors.accent.indigoDim,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  dueBadgeText: {
    fontSize: Typography.text.caption2.fontSize,
    color: Colors.accent.indigoLight,
    fontWeight: Typography.weight.bold,
  },
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
    backgroundColor: Colors.accent.primary,
    paddingHorizontal: Spacing.xl,
    height: 50,
    borderRadius: Radii.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.accent.indigo,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  emptyBtnText: {
    color: '#F8FAFC',
    fontWeight: Typography.weight.bold,
    fontSize: Typography.text.subhead.fontSize,
    letterSpacing: 0.5,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },

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
  headerLeftBtn: { padding: Spacing.xs },
  headerRightBtn: { padding: Spacing.xs },
  cancelBtnText: {
    fontSize: Typography.text.body.fontSize,
    color: Colors.accent.indigoLight,
  },
  doneBtnText: {
    fontSize: Typography.text.body.fontSize,
    color: Colors.accent.indigoLight,
    fontWeight: Typography.weight.bold,
  },
  modalContent: { paddingHorizontal: Spacing.pageMargin, paddingTop: Spacing.xs, paddingBottom: 40 },
  formContainer: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radii.card,
    padding: Spacing.lg,
  },
  modalInsetGroupPadding: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radii.card,
    padding: Spacing.lg,
  },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: Radii.icon,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bg.tertiary,
  },
  iconOptionActive: {
    borderWidth: 1,
    borderColor: Colors.accent.indigoLight,
    backgroundColor: Colors.accent.indigoDim,
  },
});
