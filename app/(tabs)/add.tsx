import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { generateCardData, generateCardDataBatch, CardData } from "../../lib/gemini";
import { createDefaultSRSState } from "../../lib/srs";
import { useStore } from "../../store/useStore";
import { getFirestoreErrorMessage, getGeminiErrorMessage } from "../../lib/errorHandler";
import { Colors, Typography, Spacing, Radii, triggerHaptic } from "../../constants/theme";
import { SectionTitle } from "../../components/ui/SectionTitle";
import { DeckPicker } from "../../components/add/DeckPicker";
import { CardPreview } from "../../components/add/CardPreview";
import { DuolingoCard } from "../../components/ui/DuolingoCard";
import { DuolingoButton } from "../../components/ui/DuolingoButton";
import { DuolingoHeader } from "../../components/ui/DuolingoHeader";

const MAX_WORDS = 10;

type WordItemStatus = "loading" | "done" | "error";

interface WordItem {
  word: string;
  status: WordItemStatus;
  data: CardData | null;
  saving: boolean;
  saved: boolean;
  errorMsg?: string;
}

function parseWords(raw: string): string[] {
  return raw
    .split(/[,，\n]/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0)
    .slice(0, MAX_WORDS);
}

export default function AddCardScreen() {
  const insets = useSafeAreaInsets();
  const { deckId } = useLocalSearchParams<{ deckId?: string }>();
  const decks = useStore((s) => s.decks);
  const cards = useStore((s) => s.cards);
  const addCard = useStore((s) => s.addCard);
  const findExistingCard = useStore((s) => s.findExistingCard);
  const fetchCards = useStore((s) => s.fetchCards);

  const [input, setInput] = useState("");
  const [selectedDeckId, setSelectedDeckId] = useState<string>(deckId || "");
  const [wordItems, setWordItems] = useState<WordItem[]>([]);
  const [analyzingBatch, setAnalyzingBatch] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [recentHistory, setRecentHistory] = useState<string[]>([]);

  const [isDeckPickerOpen, setIsDeckPickerOpen] = useState(false);

  useEffect(() => {
    if (decks.length > 0 && !selectedDeckId) {
      setSelectedDeckId(deckId && decks.some((d) => d.id === deckId) ? deckId : decks[0].id);
    }
  }, [decks, deckId, selectedDeckId]);

  useEffect(() => {
    if (selectedDeckId && !cards[selectedDeckId]) {
      fetchCards(selectedDeckId);
    }
  }, [selectedDeckId, cards, fetchCards]);

  useEffect(() => {
    AsyncStorage.getItem("@gemini_history").then((json) => {
      if (json) {
        try {
          setRecentHistory(JSON.parse(json));
        } catch {
          // ignore
        }
      }
    });
  }, []);

  const saveToHistory = async (newWords: string[]) => {
    const combined = Array.from(new Set([...newWords, ...recentHistory])).slice(0, 8);
    setRecentHistory(combined);
    await AsyncStorage.setItem("@gemini_history", JSON.stringify(combined));
  };

  const currentDeck = useMemo(() => {
    return decks.find((d) => d.id === selectedDeckId) || decks[0] || null;
  }, [decks, selectedDeckId]);

  const handleGenerateBatch = async () => {
    const parsed = parseWords(input);
    if (parsed.length === 0) {
      triggerHaptic("warning");
      Alert.alert("Thông báo", "Vui lòng nhập từ hoặc câu Tiếng Trung");
      return;
    }
    if (!selectedDeckId) {
      triggerHaptic("warning");
      Alert.alert("Thông báo", "Vui lòng chọn hoặc tạo 1 bộ thẻ trước");
      return;
    }

    Keyboard.dismiss();
    setAnalyzingBatch(true);
    triggerHaptic("medium");

    const initialItems: WordItem[] = parsed.map((w) => ({
      word: w,
      status: "loading",
      data: null,
      saving: false,
      saved: false,
    }));
    setWordItems(initialItems);
    saveToHistory(parsed);

    try {
      const results = await generateCardDataBatch(parsed);

      setWordItems((prev) =>
        prev.map((item, idx) => {
          const resData = results[idx];
          if (resData) {
            return { ...item, status: "done", data: resData };
          }
          return {
            ...item,
            status: "error",
            errorMsg: "Không thể phân tích từ này.",
          };
        })
      );
      triggerHaptic("success");
    } catch (e: any) {
      triggerHaptic("error");
      setWordItems((prev) =>
        prev.map((item) => ({
          ...item,
          status: "error",
          errorMsg: getGeminiErrorMessage(e),
        }))
      );
    } finally {
      setAnalyzingBatch(false);
    }
  };

  const handleSaveItem = async (index: number) => {
    const item = wordItems[index];
    if (!item.data || item.saving || item.saved) return;

    setWordItems((prev) =>
      prev.map((w, i) => (i === index ? { ...w, saving: true } : w))
    );
    triggerHaptic("medium");

    try {
      const existing = findExistingCard(item.data.character, selectedDeckId);
      if (existing) {
        setWordItems((prev) =>
          prev.map((w, i) =>
            i === index
              ? { ...w, saving: false, status: "error", errorMsg: "Từ này đã có trong bộ thẻ" }
              : w
          )
        );
        triggerHaptic("warning");
        return;
      }

      await addCard({
        deckId: selectedDeckId,
        character: item.data.character,
        pinyin: item.data.pinyin,
        translation: item.data.translation,
        examples: item.data.examples || [],
        srs: createDefaultSRSState(),
      });

      triggerHaptic("success");
      setWordItems((prev) =>
        prev.map((w, i) =>
          i === index ? { ...w, saving: false, saved: true } : w
        )
      );
    } catch (e: any) {
      triggerHaptic("error");
      setWordItems((prev) =>
        prev.map((w, i) =>
          i === index
            ? { ...w, saving: false, errorMsg: getFirestoreErrorMessage(e) }
            : w
        )
      );
    }
  };

  const handleSaveAll = async () => {
    const validIndexes = wordItems
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => item.status === "done" && item.data && !item.saved)
      .map(({ idx }) => idx);

    if (validIndexes.length === 0) return;

    setBulkSaving(true);
    triggerHaptic("medium");

    for (const idx of validIndexes) {
      await handleSaveItem(idx);
    }

    setBulkSaving(false);
  };

  const handleHistoryClick = (histWord: string) => {
    triggerHaptic("selection");
    if (!input.trim()) {
      setInput(histWord);
    } else if (!input.includes(histWord)) {
      setInput((prev) => `${prev}, ${histWord}`);
    }
  };

  const parsedCount = parseWords(input).length;
  const unsavedDoneCount = wordItems.filter(
    (w) => w.status === "done" && w.data && !w.saved
  ).length;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <DuolingoHeader courseName="Tiếng Trung" streakCount={1} gemsCount={150} heartsCount={5} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 90, 110) },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Target Deck Picker Card */}
        <DuolingoCard style={styles.pickerCard}>
          <Text style={styles.pickerLabel}>LƯU VÀO BỘ THẺ:</Text>
          <TouchableOpacity
            style={styles.deckSelectBtn}
            onPress={() => {
              triggerHaptic("light");
              setIsDeckPickerOpen(true);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="folder-open" size={20} color={Colors.duolingo.blue} />
            <Text style={styles.deckSelectText} numberOfLines={1}>
              {currentDeck ? currentDeck.name : "Chọn bộ thẻ..."}
            </Text>
            <Ionicons name="chevron-down" size={18} color={Colors.duolingo.textMuted} />
          </TouchableOpacity>
        </DuolingoCard>

        {/* AI Generator Input Card */}
        <DuolingoCard style={styles.inputCard}>
          <View style={styles.inputCardHeader}>
            <Ionicons name="sparkles" size={20} color={Colors.duolingo.purple} />
            <Text style={styles.inputCardTitle}>NHẬP TỪ VỰNG CẦN NẠP THẺ</Text>
          </View>

          <TextInput
            style={styles.textArea}
            placeholder="Nhập từ vựng Hán tự hoặc câu (Ví dụ: 学习, 苹果, 谢谢)..."
            placeholderTextColor={Colors.duolingo.disabledText}
            value={input}
            onChangeText={setInput}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {recentHistory.length > 0 && (
            <View style={styles.historyContainer}>
              <Text style={styles.historyLabel}>Từ đã tra gần đây:</Text>
              <View style={styles.historyChips}>
                {recentHistory.map((hWord, idx) => (
                  <TouchableOpacity
                    key={`${hWord}-${idx}`}
                    style={styles.historyChip}
                    onPress={() => handleHistoryClick(hWord)}
                  >
                    <Text style={styles.historyChipText}>{hWord}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <DuolingoButton
            title={analyzingBatch ? "ĐANG PHÂN TÍCH AI..." : `✨ TẠO THẺ AI (${parsedCount}/${MAX_WORDS}) ➜`}
            variant="blue"
            disabled={analyzingBatch || parsedCount === 0}
            onPress={handleGenerateBatch}
            height={52}
            style={{ marginTop: Spacing.md }}
          />
        </DuolingoCard>

        {/* Generated Cards List Preview */}
        {wordItems.length > 0 && (
          <View style={styles.resultsContainer}>
            <View style={styles.resultsHeaderRow}>
              <SectionTitle>KẾT QUẢ TỰ ĐỘNG TẠO ({wordItems.length})</SectionTitle>

              {unsavedDoneCount > 0 && (
                <TouchableOpacity
                  style={styles.saveAllBtn}
                  onPress={handleSaveAll}
                  disabled={bulkSaving}
                >
                  <Text style={styles.saveAllBtnText}>
                    {bulkSaving ? "LƯU..." : "LƯU TẤT CẢ"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {wordItems.map((item, idx) => (
              <View key={`${item.word}-${idx}`} style={{ marginBottom: 12 }}>
                {item.status === "done" && item.data ? (
                  <CardPreview
                    cardData={item.data}
                    saving={item.saving}
                    onReGenerate={() => {}}
                    onSave={() => handleSaveItem(idx)}
                  />
                ) : (
                  <DuolingoCard style={{ padding: 16 }}>
                    <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>{item.word}</Text>
                    {item.status === "loading" ? (
                      <ActivityIndicator size="small" color={Colors.duolingo.blue} style={{ marginTop: 8 }} />
                    ) : (
                      <Text style={{ color: Colors.duolingo.red, marginTop: 4 }}>{item.errorMsg || "Lỗi tạo thẻ"}</Text>
                    )}
                  </DuolingoCard>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Deck Picker Modal */}
      <DeckPicker
        decks={decks}
        selectedDeckId={selectedDeckId}
        isOpen={isDeckPickerOpen}
        onToggleOpen={() => setIsDeckPickerOpen((v) => !v)}
        onSelectDeck={(dId) => {
          setSelectedDeckId(dId);
          setIsDeckPickerOpen(false);
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.duolingo.bg },
  scrollContent: { paddingHorizontal: Spacing.pageMargin, paddingTop: Spacing.md },

  pickerCard: { padding: Spacing.md, marginBottom: Spacing.md },
  pickerLabel: { fontSize: 11, fontWeight: "800", color: Colors.duolingo.textMuted, letterSpacing: 0.8, marginBottom: 6 },
  deckSelectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#131F24",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Radii.md,
    borderBottomWidth: 2,
    borderBottomColor: "#0D1518",
  },
  deckSelectText: { flex: 1, fontSize: 16, fontWeight: "700", color: "#FFFFFF" },

  inputCard: { padding: Spacing.md, marginBottom: Spacing.md },
  inputCardHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  inputCardTitle: { fontSize: 12, fontWeight: "800", color: Colors.duolingo.purple, letterSpacing: 0.8 },
  textArea: {
    backgroundColor: "#131F24",
    borderRadius: Radii.md,
    padding: Spacing.md,
    fontSize: 16,
    color: "#FFFFFF",
    minHeight: 90,
    fontWeight: "600",
  },

  historyContainer: { marginTop: Spacing.sm },
  historyLabel: { fontSize: 11, color: Colors.duolingo.textMuted, fontWeight: "700", marginBottom: 4 },
  historyChips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  historyChip: {
    backgroundColor: "#131F24",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.full,
    borderBottomWidth: 2,
    borderBottomColor: "#0D1518",
  },
  historyChipText: { fontSize: 12, color: Colors.duolingo.blue, fontWeight: "700" },

  resultsContainer: { marginTop: Spacing.sm },
  resultsHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.xs },
  saveAllBtn: {
    backgroundColor: Colors.duolingo.green,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.md,
    borderBottomWidth: 2,
    borderBottomColor: Colors.duolingo.greenDark,
  },
  saveAllBtnText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
});
