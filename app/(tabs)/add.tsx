import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useStore } from '../../store/useStore';
import { generateCardData, CardData } from '../../lib/gemini';
import { DEFAULT_SRS_STATE } from '../../lib/srs';
import { Colors, Typography, Spacing, Radii } from '../../constants/theme';

export default function AddCardScreen() {
  const { decks, addCard, findExistingCard, fetchCards } = useStore();
  const [input, setInput] = useState('');
  const [selectedDeckId, setSelectedDeckId] = useState('');
  const [loading, setLoading] = useState(false);
  const [cardData, setCardData] = useState<CardData | null>(null);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (selectedDeckId) {
      fetchCards(selectedDeckId);
    }
  }, [selectedDeckId]);

  const handleGenerate = async (forceAI = false) => {
    if (!input.trim()) { Alert.alert('Lỗi', 'Vui lòng nhập từ cần học'); return; }
    if (!selectedDeckId) { Alert.alert('Lỗi', 'Vui lòng chọn bộ thẻ'); return; }

    // Check for duplicate card before calling Gemini AI
    if (!forceAI) {
      const existing = findExistingCard(input.trim(), selectedDeckId);
      if (existing) {
        Alert.alert(
          '⚠️ Từ này đã tồn tại!',
          `Từ "${existing.character}" (${existing.pinyin}) - ${existing.translation} đã có sẵn trong bộ thẻ này.\n\nBạn muốn làm gì?`,
          [
            { text: 'Huỷ', style: 'cancel' },
            {
              text: 'Dùng thẻ có sẵn',
              onPress: () => {
                setCardData({
                  character: existing.character,
                  traditional: existing.traditional,
                  pinyin: existing.pinyin,
                  hanviet: existing.hanviet,
                  translation: existing.translation,
                  examples: existing.examples || [],
                  radical: existing.radical,
                  strokeCount: existing.strokeCount,
                  hskLevel: existing.hskLevel,
                  tags: existing.tags,
                });
              },
            },
            {
              text: 'Tạo lại bằng AI',
              onPress: () => handleGenerate(true),
            },
          ]
        );
        return;
      }
    }

    setLoading(true);
    setCardData(null);
    try {
      const data = await generateCardData(input.trim());
      setCardData(data);
    } catch (e: any) {
      Alert.alert('Lỗi AI', 'Không thể tạo thông tin từ. Kiểm tra API key Gemini và kết nối mạng.\n\n' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!cardData || !selectedDeckId) return;
    setSaving(true);
    try {
      await addCard({
        deckId: selectedDeckId,
        character: cardData.character,
        traditional: cardData.traditional,
        pinyin: cardData.pinyin,
        hanviet: cardData.hanviet,
        translation: cardData.translation,
        examples: cardData.examples || [],
        radical: cardData.radical,
        strokeCount: cardData.strokeCount,
        hskLevel: cardData.hskLevel,
        tags: cardData.tags || [],
        srs: DEFAULT_SRS_STATE,
      });
      Alert.alert('✅ Đã lưu', `Thêm "${cardData.character}" vào bộ thẻ thành công!`);
      setInput('');
      setCardData(null);
    } catch (e: any) {
      Alert.alert('Lỗi', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Thêm từ mới</Text>
        <Text style={styles.subtitle}>Nhập chữ Hán hoặc pinyin, AI sẽ tự điền thông tin</Text>

        {/* Deck selector */}
        <Text style={styles.label}>Chọn bộ thẻ</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.deckSelector}>
          {decks.map(deck => (
            <TouchableOpacity
              key={deck.id}
              style={[styles.deckChip, selectedDeckId === deck.id && { backgroundColor: deck.color, borderColor: deck.color }]}
              onPress={() => setSelectedDeckId(deck.id)}
            >
              <Text style={styles.deckChipText}>{deck.icon} {deck.name}</Text>
            </TouchableOpacity>
          ))}
          {decks.length === 0 && (
            <Text style={styles.noDeckText}>Tạo bộ thẻ trước trong tab "Bộ thẻ"</Text>
          )}
        </ScrollView>

        {/* Input */}
        <Text style={styles.label}>Từ cần học</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="VD: 学习, xuéxí, 汉语..."
            placeholderTextColor={Colors.text.muted}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleGenerate}
            returnKeyType="search"
          />
          <TouchableOpacity
            style={[styles.genBtn, loading && styles.genBtnDisabled]}
            onPress={handleGenerate}
            disabled={loading || !input.trim() || !selectedDeckId}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.genBtnText}>✨ AI</Text>}
          </TouchableOpacity>
        </View>

        {/* AI Result Preview */}
        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={Colors.accent.purple} size="large" />
            <Text style={styles.loadingText}>Gemini đang phân tích từ "{input}"...</Text>
          </View>
        )}

        {cardData && (
          <View style={styles.preview}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>Xem trước thẻ</Text>
            </View>

            {/* Quick Action Bar at the top */}
            <View style={styles.actionRowTop}>
              <TouchableOpacity style={styles.regenerateBtn} onPress={handleGenerate}>
                <Text style={styles.regenerateBtnText}>↻ Tạo lại</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.saveBtnText}>💾 Lưu thẻ ngay</Text>}
              </TouchableOpacity>
            </View>

            {/* Front of card */}
            <View style={styles.cardFront}>
              <Text style={styles.character}>{cardData.character}</Text>
              {cardData.traditional && cardData.traditional !== cardData.character && (
                <Text style={styles.traditional}>{cardData.traditional} (phồn thể)</Text>
              )}
            </View>

            {/* Back info */}
            <View style={styles.cardBack}>
              <Row label="Pinyin" value={cardData.pinyin} valueStyle={styles.pinyin} />
              <Row label="Hán Việt" value={cardData.hanviet} valueStyle={styles.hanviet} />
              <Row label="Nghĩa" value={cardData.translation} />
              {cardData.radical ? <Row label="Bộ thủ" value={cardData.radical} /> : null}
              {cardData.hskLevel ? <Row label="HSK" value={`Cấp ${cardData.hskLevel}`} /> : null}

              {cardData.examples && cardData.examples.length > 0 && (
                <View style={styles.examples}>
                  <Text style={styles.examplesTitle}>Câu ví dụ</Text>
                  {cardData.examples.map((ex, i) => (
                    <View key={i} style={styles.exampleItem}>
                      <Text style={styles.exampleCn}>{ex.chinese}</Text>
                      <Text style={styles.examplePy}>{ex.pinyin}</Text>
                      <Text style={styles.exampleVi}>{ex.vietnamese}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Row({ label, value, valueStyle }: { label: string; value: string; valueStyle?: any }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}:</Text>
      <Text style={[styles.rowValue, valueStyle]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  content: { padding: Spacing.xl, paddingTop: 60, paddingBottom: 60 },
  title: { fontSize: Typography.text.xxxl, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  subtitle: { fontSize: Typography.text.sm, color: Colors.text.secondary, marginTop: Spacing.xs, marginBottom: Spacing.xxl },
  label: { fontSize: Typography.text.sm, color: Colors.text.secondary, marginBottom: Spacing.sm, fontWeight: Typography.weight.medium },
  deckSelector: { marginBottom: Spacing.xl },
  deckChip: {
    borderRadius: Radii.full, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg,
    borderWidth: 1, borderColor: Colors.border.default,
    backgroundColor: Colors.bg.card, marginRight: Spacing.sm,
  },
  deckChipText: { color: Colors.text.primary, fontSize: Typography.text.sm },
  noDeckText: { color: Colors.text.muted, fontSize: Typography.text.sm, alignSelf: 'center' },
  inputRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
  input: {
    backgroundColor: Colors.bg.secondary, borderRadius: Radii.md,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    color: Colors.text.primary, fontSize: Typography.text.lg,
    borderWidth: 1, borderColor: Colors.border.default,
  },
  genBtn: {
    backgroundColor: Colors.accent.purple, borderRadius: Radii.md,
    paddingHorizontal: Spacing.lg, justifyContent: 'center', alignItems: 'center', minWidth: 70,
  },
  genBtnDisabled: { opacity: 0.5 },
  genBtnText: { color: '#fff', fontWeight: Typography.weight.semibold },
  loadingBox: { alignItems: 'center', paddingVertical: Spacing.xxl },
  loadingText: { color: Colors.text.secondary, marginTop: Spacing.md, textAlign: 'center' },

  preview: { backgroundColor: Colors.bg.card, borderRadius: Radii.xl, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border.subtle },
  previewHeader: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  previewTitle: { fontSize: Typography.text.xs, color: Colors.text.muted, textTransform: 'uppercase', letterSpacing: 1 },
  actionRowTop: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border.subtle },
  cardFront: { alignItems: 'center', paddingVertical: Spacing.xl, backgroundColor: Colors.bg.elevated },
  character: { fontSize: Typography.hanzi.lg, color: Colors.text.primary, fontWeight: Typography.weight.bold },
  traditional: { fontSize: Typography.text.md, color: Colors.text.secondary, marginTop: 2 },
  cardBack: { padding: Spacing.lg },
  row: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.sm },
  rowLabel: { fontSize: Typography.text.sm, color: Colors.text.muted, width: 72 },
  rowValue: { flex: 1, fontSize: Typography.text.md, color: Colors.text.primary },
  pinyin: { color: Colors.accent.purpleLight, fontWeight: Typography.weight.medium },
  hanviet: { color: Colors.accent.gold, fontWeight: Typography.weight.medium },
  examples: { marginTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border.subtle, paddingTop: Spacing.md },
  examplesTitle: { fontSize: Typography.text.xs, color: Colors.text.muted, marginBottom: Spacing.sm },
  exampleItem: { marginBottom: Spacing.sm, backgroundColor: Colors.bg.secondary, borderRadius: Radii.md, padding: Spacing.md },
  exampleCn: { fontSize: Typography.text.md, color: Colors.text.primary, fontWeight: Typography.weight.medium },
  examplePy: { fontSize: Typography.text.xs, color: Colors.accent.purpleLight, marginTop: 2 },
  exampleVi: { fontSize: Typography.text.xs, color: Colors.text.secondary, marginTop: 2 },
  regenerateBtn: {
    flex: 1, borderRadius: Radii.md, padding: Spacing.md, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border.default,
  },
  regenerateBtnText: { color: Colors.text.secondary },
  saveBtn: { flex: 2, backgroundColor: Colors.accent.purple, borderRadius: Radii.md, padding: Spacing.md, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: Typography.weight.semibold },
});
