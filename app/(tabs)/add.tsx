import React, { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
import { useLocalSearchParams } from "expo-router";
import { Colors, Typography, Spacing, Radii, triggerHaptic } from "../../constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { SectionTitle } from "../../components/ui/SectionTitle";
import { InsetGroup } from "../../components/ui/InsetGroup";
import { DeckPicker } from "../../components/add/DeckPicker";
import { CardPreview } from "../../components/add/CardPreview";

export default function AddCardScreen() {
  const insets = useSafeAreaInsets();
  const { deckId } = useLocalSearchParams<{ deckId?: string }>();
  const { decks, cards, addCard, updateCard, findExistingCard, fetchCards } = useStore();
  const [input, setInput] = useState("");
  const [selectedDeckId, setSelectedDeckId] = useState("");
  const [deckPickerOpen, setDeckPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cardData, setCardData] = useState<CardData | null>(null);
  const [existingCardId, setExistingCardId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Restore or set selected deck from params/storage once decks are loaded
  useEffect(() => {
    const initSelectedDeck = async () => {
      if (decks.length === 0) return;
      if (deckId && decks.some((d) => d.id === deckId)) {
        setSelectedDeckId(deckId);
        await AsyncStorage.setItem("lastSelectedDeckId", deckId);
      } else {
        const saved = await AsyncStorage.getItem("lastSelectedDeckId");
        if (saved && decks.some((d) => d.id === saved)) {
          setSelectedDeckId(saved);
        } else if (decks.length > 0) {
          setSelectedDeckId((prev) => prev || decks[0].id);
        }
      }
    };
    initSelectedDeck();
  }, [decks, deckId]);

  useEffect(() => {
    if (selectedDeckId && (!cards[selectedDeckId] || cards[selectedDeckId].length === 0)) {
      fetchCards(selectedDeckId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          <Text style={styles.headerSubhead}>TỰ ĐỘNG PHÂN TÍCH TỪ VỰNG</Text>
          <Text style={styles.headerTitle}>Thêm từ AI</Text>
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
            AsyncStorage.setItem("lastSelectedDeckId", id);
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
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="sparkles" size={13} color="#FFFFFF" style={{ marginRight: 5 }} />
                  <Text style={styles.genBtnText}>Tạo AI</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </InsetGroup>

        {/* Loading Indicator */}
        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={Colors.accent.primaryLight} size="small" />
            <Text style={styles.loadingText}>Đang phân tích "{input}"</Text>
          </View>
        )}

        {/* Preview Card */}
        {cardData && (
          <CardPreview
            cardData={cardData}
            targetDeckName={decks.find((d) => d.id === selectedDeckId)?.name}
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

  header: { marginBottom: 0 },
  headerSubhead: {
    fontSize: Typography.text.caption1.fontSize,
    lineHeight: Typography.text.caption1.lineHeight,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.secondary,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    letterSpacing: -0.3,
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
    borderRadius: Radii.full,
    paddingHorizontal: 14,
    height: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  genBtnDisabled: {
    backgroundColor: Colors.bg.tertiary,
    opacity: 0.5,
  },
  genBtnText: {
    color: "#FFFFFF",
    fontWeight: Typography.weight.semibold,
    fontSize: Typography.text.footnote.fontSize,
    letterSpacing: 0.2,
    textAlign: "center",
    textAlignVertical: "center",
    includeFontPadding: false,
  },

  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  loadingText: {
    fontSize: Typography.text.subhead.fontSize,
    color: Colors.text.secondary,
    fontWeight: Typography.weight.medium,
  },
});
