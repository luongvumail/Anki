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
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { generateCardDataBatch, CardData } from "../../lib/gemini";
import { createDefaultSRSState } from "../../lib/srs";
import { useStore } from "../../store/useStore";
import { getFirestoreErrorMessage, getGeminiErrorMessage } from "../../lib/errorHandler";
import { Colors, Typography, Spacing, Radii, triggerHaptic } from "../../constants/theme";
import { SectionTitle } from "../ui/SectionTitle";
import { DeckPicker } from "./DeckPicker";
import { CardPreview } from "./CardPreview";
import { DuolingoCard } from "../ui/DuolingoCard";
import { DuolingoButton } from "../ui/DuolingoButton";

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

export interface AIAddCardModalProps {
  visible: boolean;
  onClose: () => void;
  initialDeckId?: string;
}

export function AIAddCardModal({ visible, onClose, initialDeckId }: AIAddCardModalProps) {
  const insets = useSafeAreaInsets();
  const decks = useStore((s) => s.decks);
  const cards = useStore((s) => s.cards);
  const addCard = useStore((s) => s.addCard);
  const findExistingCard = useStore((s) => s.findExistingCard);
  const fetchCards = useStore((s) => s.fetchCards);

  const [input, setInput] = useState("");
  const [selectedDeckId, setSelectedDeckId] = useState<string>(initialDeckId || "");
  const [wordItems, setWordItems] = useState<WordItem[]>([]);
  const [analyzingBatch, setAnalyzingBatch] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [recentHistory, setRecentHistory] = useState<string[]>([]);
  const [isDeckPickerOpen, setIsDeckPickerOpen] = useState(false);

  useEffect(() => {
    if (initialDeckId && decks.some((d) => d.id === initialDeckId)) {
      setSelectedDeckId(initialDeckId);
    } else if (decks.length > 0 && (!selectedDeckId || !decks.some((d) => d.id === selectedDeckId))) {
      setSelectedDeckId(decks[0].id);
    }
  }, [decks, initialDeckId, selectedDeckId]);

  useEffect(() => {
    if (selectedDeckId && !cards[selectedDeckId]) {
      fetchCards(selectedDeckId);
    }
  }, [selectedDeckId, cards, fetchCards]);

  useEffect(() => {
    if (visible) {
      AsyncStorage.getItem("@gemini_history").then((json) => {
        if (json) {
          try {
            setRecentHistory(JSON.parse(json));
          } catch {
            // ignore
          }
        }
      });
    }
  }, [visible]);

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
            ? { ...w, saving: false, status: "error", errorMsg: getFirestoreErrorMessage(e) }
            : w
        )
      );
    }
  };

  const handleSaveAll = async () => {
    const unsavedIndices = wordItems
      .map((item, idx) => (item.status === "done" && !item.saved ? idx : -1))
      .filter((i) => i !== -1);

    if (unsavedIndices.length === 0) return;

    setBulkSaving(true);
    triggerHaptic("medium");

    for (const idx of unsavedIndices) {
      await handleSaveItem(idx);
    }

    setBulkSaving(false);
    triggerHaptic("success");
  };

  const handleRemoveItem = (index: number) => {
    triggerHaptic("light");
    setWordItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleChipClick = (historyWord: string) => {
    triggerHaptic("light");
    const currentList = parseWords(input);
    if (currentList.includes(historyWord)) return;

    if (currentList.length >= MAX_WORDS) {
      Alert.alert("Thông báo", `Tối đa ${MAX_WORDS} từ mỗi lần tạo.`);
      return;
    }

    if (!input.trim()) {
      setInput(historyWord);
    } else {
      setInput(`${input.trim()}, ${historyWord}`);
    }
  };

  const parsedCount = useMemo(() => parseWords(input).length, [input]);
  const unsavedDoneCount = useMemo(
    () => wordItems.filter((i) => i.status === "done" && !i.saved).length,
    [wordItems]
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header Modal */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Ionicons name="sparkles" size={22} color={Colors.duolingo.blue} />
            <Text style={styles.headerTitle}>NẠP TỪ VỰNG BẰNG AI</Text>
          </View>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => {
              triggerHaptic("light");
              onClose();
            }}
          >
            <Ionicons name="close-circle" size={26} color={Colors.duolingo.textMuted} />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: Math.max(insets.bottom + 40, 60) },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Target Deck Picker Card */}
            <DuolingoCard style={styles.sectionCard}>
              <Text style={styles.cardLabel}>BỘ THẺ MỤC TIÊU</Text>
              <DeckPicker
                decks={decks}
                selectedDeckId={selectedDeckId}
                onSelectDeck={(deckId) => {
                  setSelectedDeckId(deckId);
                  setIsDeckPickerOpen(false);
                }}
                isOpen={isDeckPickerOpen}
                onToggleOpen={() => setIsDeckPickerOpen((prev) => !prev)}
              />
            </DuolingoCard>

            {/* Input Words Card */}
            <DuolingoCard style={styles.sectionCard}>
              <View style={styles.inputHeaderRow}>
                <Text style={styles.cardLabel}>NHẬP TỪ HOẶC CÂU TIẾNG TRUNG</Text>
                <Text style={styles.wordCounter}>
                  {parsedCount}/{MAX_WORDS} từ
                </Text>
              </View>

              <TextInput
                style={styles.textArea}
                multiline
                numberOfLines={3}
                placeholder="Ví dụ: 苹果, 喜欢, 学习... (Phân cách bằng dấu phẩy hoặc xuống dòng)"
                placeholderTextColor={Colors.duolingo.textMuted}
                value={input}
                onChangeText={setInput}
              />

              {recentHistory.length > 0 && (
                <View style={styles.historyContainer}>
                  <Text style={styles.historyLabel}>Lịch sử tra gần đây:</Text>
                  <View style={styles.chipGrid}>
                    {recentHistory.map((word) => (
                      <TouchableOpacity
                        key={word}
                        style={styles.chip}
                        onPress={() => handleChipClick(word)}
                      >
                        <Text style={styles.chipText}>+ {word}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              <DuolingoButton
                title={analyzingBatch ? "ĐANG PHÂN TÍCH AI..." : `✨ TẠO THẺ AI (${parsedCount}/${MAX_WORDS}) ➜`}
                variant="primary"
                size="lg"
                disabled={analyzingBatch || parsedCount === 0}
                onPress={handleGenerateBatch}
                style={{ marginTop: Spacing.md }}
              />
            </DuolingoCard>

            {/* Generated Cards List Preview */}
            {wordItems.length > 0 && (
              <View style={styles.resultsContainer}>
                <View style={styles.resultsHeaderRow}>
                  <SectionTitle>KẾT QUẢ TỰ ĐỘNG TẠO ({wordItems.length})</SectionTitle>

                  {unsavedDoneCount > 0 && (
                    <DuolingoButton
                      title={bulkSaving ? "ĐANG LƯU..." : "LƯU TẤT CẢ ➜"}
                      variant="success"
                      size="md"
                      disabled={bulkSaving}
                      onPress={handleSaveAll}
                      style={{ width: "auto", paddingHorizontal: 14 }}
                    />
                  )}
                </View>

                {wordItems.map((item, idx) => (
                  <View key={`${item.word}-${idx}`} style={{ marginBottom: 12 }}>
                    {item.status === "loading" ? (
                      <DuolingoCard style={styles.loadingItemCard}>
                        <ActivityIndicator size="small" color={Colors.duolingo.blue} />
                        <Text style={styles.loadingItemText}>
                          Gemini đang phân tích "{item.word}"...
                        </Text>
                      </DuolingoCard>
                    ) : item.status === "error" ? (
                      <DuolingoCard style={styles.errorItemCard}>
                        <View style={styles.errorItemRow}>
                          <Text style={styles.errorItemTitle}>Chữ Hán: {item.word}</Text>
                          <TouchableOpacity onPress={() => handleRemoveItem(idx)}>
                            <Ionicons name="trash-outline" size={18} color={Colors.duolingo.red} />
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.errorItemDesc}>
                          {item.errorMsg || "Lỗi tạo từ."}
                        </Text>
                      </DuolingoCard>
                    ) : item.data ? (
                      <CardPreview
                        cardData={item.data}
                        saving={item.saving}
                        saved={item.saved}
                        onSave={() => handleSaveItem(idx)}
                        targetDeckName={currentDeck?.name}
                      />
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.duolingo.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.pageMargin,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.duolingo.cardBg,
    borderBottomWidth: 2,
    borderBottomColor: Colors.duolingo.border,
  },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: {
    fontSize: Typography.text.callout.fontSize,
    fontWeight: Typography.weight.extraBold,
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  closeBtn: { padding: Spacing.xs },
  scrollContent: { paddingHorizontal: Spacing.pageMargin, paddingTop: Spacing.md },
  sectionCard: { marginBottom: Spacing.md, padding: Spacing.md },
  cardLabel: {
    fontSize: Typography.text.caption2.fontSize,
    fontWeight: Typography.weight.extraBold,
    color: Colors.duolingo.textMuted,
    letterSpacing: 0.8,
    marginBottom: Spacing.xs,
  },
  inputHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  wordCounter: {
    fontSize: Typography.text.caption2.fontSize,
    fontWeight: Typography.weight.bold,
    color: Colors.duolingo.textMuted,
  },
  textArea: {
    backgroundColor: Colors.duolingo.bg,
    borderRadius: Radii.md,
    borderWidth: 2,
    borderColor: Colors.duolingo.border,
    color: "#FFFFFF",
    fontSize: Typography.text.body.fontSize,
    padding: Spacing.sm,
    minHeight: 80,
    textAlignVertical: "top",
  },
  historyContainer: { marginTop: Spacing.sm },
  historyLabel: {
    fontSize: Typography.text.caption2.fontSize,
    color: Colors.duolingo.textMuted,
    fontWeight: Typography.weight.semibold,
    marginBottom: Spacing.xs,
  },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    backgroundColor: Colors.duolingo.bg,
    borderRadius: Radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.duolingo.border,
  },
  chipText: { fontSize: Typography.text.caption2.fontSize, color: "#FFFFFF", fontWeight: Typography.weight.semibold },
  resultsContainer: { marginTop: Spacing.xs },
  resultsHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  loadingItemCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: Spacing.md,
  },
  loadingItemText: {
    fontSize: Typography.text.footnote.fontSize,
    color: Colors.duolingo.textMuted,
    fontWeight: Typography.weight.semibold,
  },
  errorItemCard: {
    padding: Spacing.md,
    borderColor: Colors.duolingo.redDark,
  },
  errorItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  errorItemTitle: {
    fontSize: Typography.text.subhead.fontSize,
    fontWeight: Typography.weight.extraBold,
    color: Colors.duolingo.red,
  },
  errorItemDesc: {
    fontSize: Typography.text.caption2.fontSize,
    color: Colors.duolingo.textMuted,
    marginTop: Spacing.xs,
  },
});
