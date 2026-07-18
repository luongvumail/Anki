import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useStore } from '../../store/useStore';
import { getFirestoreErrorMessage } from '../../lib/errorHandler';
import { Colors, Typography, Spacing, Radii, VECTOR_DECK_ICONS, triggerHaptic } from '../../constants/theme';

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
      await createDeck({ name: deckName.trim(), description: deckDesc.trim(), color: '#0A84FF', icon: selectedIcon });
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
            Alert.alert('Xoá bộ thẻ', `Bạn có chắc chẫn muốn xoá bộ thẻ “${deck.name}” và toàn bộ từ vựng?`, [
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

  const renderVectorIcon = (iconName: string, size = 18, color = Colors.accent.blue) => {
    const validIcons = VECTOR_DECK_ICONS;
    const icon = validIcons.includes(iconName) ? (iconName as any) : 'book-outline';
    return <Ionicons name={icon} size={size} color={color} />;
  };

  return (
    <View style={styles.container}>
      {/* iOS Header Bar */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 16, 54) }]}>
        <View>
          <Text style={styles.largeTitle}>Bộ thẻ</Text>
          <Text style={styles.subhead}>{decks.length} bộ thẻ lưu trữ</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => {
            triggerHaptic('selection');
            setShowCreate(true);
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={26} color={Colors.accent.blue} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.list,
          { paddingBottom: Math.max(insets.bottom + 90, 110) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {isLoading && <ActivityIndicator color={Colors.accent.gray} style={{ marginTop: 30 }} />}

        {decks.length === 0 && !isLoading && (
          <View style={styles.emptyCard}>
            <Ionicons name="folder-open-outline" size={40} color={Colors.accent.gray} style={{ marginBottom: Spacing.sm }} />
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
          <View style={styles.insetGroup}>
            {decks.map((deck, idx) => {
              const total = deck.cardCount || 0;
              const due = deck.dueCount || 0;
              const masteryPct = total > 0 ? Math.round(((total - due) / total) * 100) : 0;

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
                        ? <ActivityIndicator size="small" color={Colors.accent.blue} />
                        : renderVectorIcon(deck.icon, 18, Colors.accent.blue)
                      }
                    </View>

                    <View style={styles.deckMeta}>
                      <View style={styles.deckNameRow}>
                        <Text style={styles.deckName}>{deck.name}</Text>
                        {due > 0 ? (
                          <View style={styles.dueBadge}>
                            <Text style={styles.dueBadgeText}>{due} ôn</Text>
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
          </View>
        )}
      </ScrollView>

      {/* iOS Page Sheet Modal */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCreate(false)}>
        <View style={styles.modalContainer}>
          {/* Header Bar */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreate(false)} style={styles.headerLeftBtn}>
              <Text style={styles.cancelBtnText}>Hủy</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Bộ thẻ mới</Text>
            <TouchableOpacity onPress={handleCreate} disabled={creating} style={styles.headerRightBtn}>
              {creating ? (
                <ActivityIndicator size="small" color={Colors.accent.blue} />
              ) : (
                <Text style={styles.doneBtnText}>Tạo</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionHeaderTitle}>THÔNG TIN BỘ THẺ</Text>
            <View style={styles.modalInsetGroup}>
              <View style={styles.modalRow}>
                <Text style={styles.fieldLabel}>Tên bộ thẻ</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="VD: HSK 1, Giao tiếp..."
                  placeholderTextColor={Colors.text.tertiary}
                  value={deckName}
                  onChangeText={setDeckName}
                />
              </View>
              <View style={[styles.modalRow, styles.cellBorderTop]}>
                <Text style={styles.fieldLabel}>Mô tả</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Mô tả ngắn (tuỳ chọn)"
                  placeholderTextColor={Colors.text.tertiary}
                  value={deckDesc}
                  onChangeText={setDeckDesc}
                />
              </View>
            </View>

            <Text style={styles.sectionHeaderTitle}>BIỂU TƯỢNG ICON VECTOR</Text>
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
                    {renderVectorIcon(icName, 22, selectedIcon === icName ? Colors.accent.blue : Colors.text.secondary)}
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
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.pageMargin,
    paddingBottom: Spacing.md,
  },
  largeTitle: {
    fontSize: Typography.text.largeTitle.fontSize,
    lineHeight: Typography.text.largeTitle.lineHeight,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    letterSpacing: 0.37,
  },
  subhead: {
    fontSize: Typography.text.subhead.fontSize,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  addBtn: {
    padding: Spacing.xs,
  },
  list: { paddingHorizontal: Spacing.pageMargin, paddingTop: Spacing.sm },

  insetGroup: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radii.card,
    overflow: 'hidden',
  },
  deckCell: {
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
    backgroundColor: Colors.accent.gray5,
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.accent.blue,
    borderRadius: 2,
  },
  deckStatsText: {
    fontSize: Typography.text.caption1.fontSize,
    color: Colors.text.secondary,
    marginTop: 4,
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

  // Modal
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
  headerLeftBtn: { padding: Spacing.xs },
  headerRightBtn: { padding: Spacing.xs },
  cancelBtnText: {
    fontSize: Typography.text.body.fontSize,
    color: Colors.accent.blue,
  },
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
  modalInsetGroupPadding: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radii.card,
    padding: Spacing.lg,
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
    width: 90,
    fontSize: Typography.text.body.fontSize,
    color: Colors.text.primary,
    fontWeight: Typography.weight.medium,
  },
  fieldInput: {
    flex: 1,
    fontSize: Typography.text.body.fontSize,
    color: Colors.text.primary,
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
    borderWidth: 2,
    borderColor: Colors.accent.blue,
    backgroundColor: Colors.accent.blueDim,
  },
});
