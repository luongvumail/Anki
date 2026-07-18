import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "../../store/useStore";
import { generateCardData, CardData } from "../../lib/gemini";
import { DEFAULT_SRS_STATE } from "../../lib/srs";
import { getGeminiErrorMessage, getFirestoreErrorMessage } from "../../lib/errorHandler";
import { Colors, Typography, Spacing, Radii, triggerHaptic } from "../../constants/theme";
import { SectionTitle } from "../../components/ui/SectionTitle";
import { InsetGroup } from "../../components/ui/InsetGroup";
import { DeckPicker } from "../../components/add/DeckPicker";
import { CardPreview } from "../../components/add/CardPreview";

export default function AddCardScreen() {
  const insets = useSafeAreaInsets();
  const { decks, addCard, updateCard, findExistingCard, fetchCards } = useStore();
  const [input, setInput] = useState("");
  const [selectedDeckId, setSelectedDeckId] = useState("");
  const [deckPickerOpen, setDeckPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cardData, setCardData] = useState<CardData | null>(null);
  const [existingCardId, setExistingCardId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (selectedDeckId) {
      fetchCards(selectedDeckId);
    }
  }, [selectedDeckId]);

  const handleGenerate = async (forceAI = false) => {
    if (!input.trim()) {
      triggerHaptic("warning");
      Alert.alert("Thông báo", "Vui lòng nhập từ cần học");
      return;
    }
    if (!selectedDeckId) {
      triggerHaptic("warning");
      Alert.alert("Thông báo", "Vui lòng chọn bộ thẻ lưu trữ trước");
      return;
    }

    if (!forceAI) {
      await fetchCards(selectedDeckId);
      const existing = findExistingCard(input.trim(), selectedDeckId);
      if (existing) {
        triggerHaptic("warning");
        setExistingCardId(existing.id);
        Alert.alert(
          "Từ vựng đã có sẵn!",
          `Từ "${existing.character}" (${existing.pinyin})\nNghĩa: ${existing.translation}\n\nBạn muốn làm gì?`,
          [
            { text: "Hủy", style: "cancel" },
            {
              text: "Dùng thẻ cũ",
              onPress: () => {
                triggerHaptic("light");
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
              text: "Tạo lại & Ghi đè",
              onPress: () => handleGenerate(true),
            },
          ],
        );
        return;
      }
    } else {
      const existing = findExistingCard(input.trim(), selectedDeckId);
      if (existing) {
        setExistingCardId(existing.id);
      }
    }

    triggerHaptic("medium");
    setLoading(true);
    setCardData(null);
    try {
      const data = await generateCardData(input.trim());
      triggerHaptic("success");
      setCardData(data);
    } catch (e: any) {
      triggerHaptic("error");
      Alert.alert("Thông báo AI", getGeminiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!cardData || !selectedDeckId) return;
    setSaving(true);
    triggerHaptic("medium");
    try {
      const targetExistingId =
        existingCardId || findExistingCard(cardData.character, selectedDeckId)?.id;

      if (targetExistingId) {
        await updateCard(targetExistingId, selectedDeckId, {
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
        });
        triggerHaptic("success");
        Alert.alert("Đã cập nhật", `Đã cập nhật từ vựng "${cardData.character}" thành công!`);
      } else {
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
        triggerHaptic("success");
        Alert.alert("Đã lưu thẻ", `Đã thêm từ "${cardData.character}" vào bộ thẻ!`);
      }

      setInput("");
      setCardData(null);
      setExistingCardId(null);
    } catch (e: any) {
      triggerHaptic("error");
      Alert.alert("Lỗi lưu thẻ", getFirestoreErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top + 16, 54),
            paddingBottom: Math.max(insets.bottom + 90, 110),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Linear Header */}
        <View style={styles.header}>
          <Text style={styles.subhead}>TỰ ĐỘNG PHÂN TÍCH TỪ VỰNG</Text>
          <Text style={styles.largeTitle}>Thêm từ AI</Text>
        </View>

        {/* Section 1: Deck Selection */}
        <SectionTitle>BỘ THẺ LƯU TRỮ</SectionTitle>
        <DeckPicker
          decks={decks}
          selectedDeckId={selectedDeckId}
          isOpen={deckPickerOpen}
          onToggleOpen={() => setDeckPickerOpen((o) => !o)}
          onSelectDeck={(id) => {
            triggerHaptic("selection");
            setSelectedDeckId(id);
            setDeckPickerOpen(false);
          }}
        />

        {/* Section 2: Input */}
        <SectionTitle>TỪ CẦN TẠO THẺ</SectionTitle>
        <InsetGroup>
          <View style={styles.inputCell}>
            <TextInput
              style={styles.input}
              placeholder="VD: 学习, xuéxí, 汉语, học tập..."
              placeholderTextColor={Colors.text.tertiary}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => handleGenerate()}
              returnKeyType="search"
            />
            <TouchableOpacity
              style={[
                styles.genBtn,
                (loading || !input.trim() || !selectedDeckId) && styles.genBtnDisabled,
              ]}
              onPress={() => handleGenerate()}
              disabled={loading || !input.trim() || !selectedDeckId}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.genBtnText}>Tạo AI</Text>
              )}
            </TouchableOpacity>
          </View>
        </InsetGroup>

        {/* Loading Indicator */}
        {loading && (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={Colors.accent.indigoLight} size="small" />
            <Text style={styles.loadingText}>
              AI đang phân tích âm Hán Việt & ví dụ cho "{input}"...
            </Text>
          </View>
        )}

        {/* Preview Card */}
        {cardData && (
          <CardPreview
            cardData={cardData}
            saving={saving}
            onReGenerate={() => handleGenerate(true)}
            onSave={handleSave}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  content: { paddingHorizontal: Spacing.pageMargin },

  header: { marginBottom: Spacing.lg },
  subhead: {
    fontSize: Typography.text.caption1.fontSize,
    lineHeight: Typography.text.caption1.lineHeight,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.secondary,
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  largeTitle: {
    fontSize: Typography.text.largeTitle.fontSize,
    lineHeight: Typography.text.largeTitle.lineHeight,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    letterSpacing: 0.37,
  },

  inputCell: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 48,
  },
  input: {
    flex: 1,
    fontSize: Typography.text.body.fontSize,
    color: Colors.text.primary,
    paddingHorizontal: 8,
  },
  genBtn: {
    backgroundColor: Colors.accent.indigo,
    borderRadius: Radii.card,
    paddingHorizontal: 16,
    height: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.accent.indigoLight,
  },
  genBtnDisabled: { opacity: 0.5 },
  genBtnText: {
    color: "#F3F4F6",
    fontWeight: Typography.weight.bold,
    fontSize: Typography.text.footnote.fontSize,
    textAlign: "center",
    textAlignVertical: "center",
    includeFontPadding: false,
  },

  loadingCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radii.card,
    padding: Spacing.cellHorizontal,
    marginTop: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  loadingText: {
    flex: 1,
    fontSize: Typography.text.footnote.fontSize,
    color: Colors.text.secondary,
  },
});
