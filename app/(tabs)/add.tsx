import React, { useState, useEffect } from "react";
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
import { InsetGroup } from "../../components/ui/InsetGroup";
import { DeckPicker } from "../../components/add/DeckPicker";
import { CardPreview } from "../../components/add/CardPreview";

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
  const { decks, cards, addCard, findExistingCard, fetchCards } = useStore();
  const [input, setInput] = useState("");
  const [selectedDeckId, setSelectedDeckId] = useState("");
  const [deckPickerOpen, setDeckPickerOpen] = useState(false);
  const [wordItems, setWordItems] = useState<WordItem[]>([]);
  const [skippedWords, setSkippedWords] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const parsedWords = parseWords(input);
  const wordCount = parsedWords.length;
  const isMulti = wordCount > 1;

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

  // Internal: kick off batch generation for a list of words (1 API request)
  const startGeneration = async (words: string[]) => {
    triggerHaptic("medium");
    setIsGenerating(true);

    // Show all as loading immediately
    setWordItems(
      words.map((word) => ({
        word,
        status: "loading" as WordItemStatus,
        data: null,
        saving: false,
        saved: false,
      })),
    );

    try {
      // Single API request for all words — much faster & cheaper than N separate calls
      const results = await generateCardDataBatch(words);
      setWordItems(
        words.map((word, i) => {
          const data = results[i] || null;
          return {
            word,
            status: data ? ("done" as WordItemStatus) : ("error" as WordItemStatus),
            data,
            saving: false,
            saved: false,
            errorMsg: data ? undefined : "Không nhận được dữ liệu từ AI",
          };
        }),
      );
      triggerHaptic("success");
    } catch (e: any) {
      triggerHaptic("error");
      // Mark all as error
      setWordItems((prev) =>
        prev.map((item) => ({
          ...item,
          status: "error" as WordItemStatus,
          errorMsg: getGeminiErrorMessage(e),
        })),
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerate = async () => {
    Keyboard.dismiss();
    setSkippedWords([]);

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

    const words = parsedWords;
    if (words.length === 0) return;

    // Always pre-fetch cards for the selected deck so findExistingCard has 100% accurate data
    await fetchCards(selectedDeckId);

    const selectedDeckName = decks.find((d) => d.id === selectedDeckId)?.name || "Bộ thẻ";

    // 1. Single Word Flow
    if (words.length === 1) {
      const existing = findExistingCard(words[0], selectedDeckId);
      if (existing) {
        triggerHaptic("warning");
        Alert.alert(
          "Từ vựng đã có sẵn!",
          `Từ "${existing.character}" (${existing.pinyin}) đã có sẵn trong bộ thẻ "${selectedDeckName}".`,
          [
            {
              text: "Đóng",
              style: "cancel",
              onPress: () => {
                setInput("");
              },
            },
            {
              text: "Học ngay 📚",
              onPress: () => {
                setInput("");
                router.push(`/study/${selectedDeckId}`);
              },
            },
          ],
        );
        return;
      }
      startGeneration([words[0]]);
      return;
    }

    // 2. Batch Words Flow: Filter out duplicate words that already exist in the deck
    const existingWords: string[] = [];
    const newWords: string[] = [];

    for (const w of words) {
      const match = findExistingCard(w, selectedDeckId);
      if (match) {
        existingWords.push(match.character || w);
      } else {
        newWords.push(w);
      }
    }

    // If ALL words already exist in deck
    if (newWords.length === 0) {
      triggerHaptic("warning");
      Alert.alert(
        "Tất cả từ vựng đã có sẵn!",
        `Tất cả ${words.length} từ vựng bạn nhập đều đã có sẵn trong bộ thẻ "${selectedDeckName}".`,
        [
          {
            text: "Đóng",
            style: "cancel",
            onPress: () => {
              setInput("");
            },
          },
          {
            text: "Học ngay 📚",
            onPress: () => {
              setInput("");
              router.push(`/study/${selectedDeckId}`);
            },
          },
        ],
      );
      return;
    }

    // If SOME words exist and SOME are new
    if (existingWords.length > 0) {
      setSkippedWords(existingWords);
    }

    // Generate AI ONLY for newWords!
    startGeneration(newWords);
  };

  const handleReGenerate = async (word: string) => {
    triggerHaptic("medium");
    setWordItems((prev) =>
      prev.map((item) => (item.word === word ? { ...item, status: "loading", data: null } : item)),
    );
    try {
      const data = await generateCardData(word);
      triggerHaptic("success");
      setWordItems((prev) =>
        prev.map((item) => (item.word === word ? { ...item, status: "done", data } : item)),
      );
    } catch (e: any) {
      triggerHaptic("error");
      setWordItems((prev) =>
        prev.map((item) =>
          item.word === word ? { ...item, status: "error", errorMsg: getGeminiErrorMessage(e) } : item,
        ),
      );
    }
  };

  const handleSaveOne = async (item: WordItem) => {
    if (!item.data || !selectedDeckId) return;

    setWordItems((prev) =>
      prev.map((i) => (i.word === item.word ? { ...i, saving: true } : i)),
    );
    triggerHaptic("medium");

    try {
      await addCard({
        deckId: selectedDeckId,
        character: item.data.character,
        traditional: item.data.traditional,
        pinyin: item.data.pinyin,
        hanviet: item.data.hanviet,
        translation: item.data.translation,
        examples: item.data.examples || [],
        radical: item.data.radical,
        strokeCount: item.data.strokeCount,
        hskLevel: item.data.hskLevel,
        tags: item.data.tags || [],
        srs: createDefaultSRSState(),
      });

      triggerHaptic("success");

      const remaining = wordItems.filter((i) => i.word !== item.word);
      setWordItems(remaining);
      if (remaining.length === 0) {
        setInput("");
        setSkippedWords([]);
      }

      Alert.alert(
        "Thành công",
        `Đã lưu từ "${item.data.character}" vào bộ thẻ thành công!`,
      );
    } catch (e: any) {
      triggerHaptic("error");
      Alert.alert("Lỗi lưu thẻ", getFirestoreErrorMessage(e));
      setWordItems((prev) =>
        prev.map((i) => (i.word === item.word ? { ...i, saving: false } : i)),
      );
    }
  };

  const handleSaveAll = async () => {
    const toSave = wordItems.filter((i) => i.status === "done" && !i.saved && i.data);
    if (toSave.length === 0) return;

    triggerHaptic("medium");
    setWordItems((prev) => prev.map((i) => ({ ...i, saving: true })));

    try {
      await Promise.all(
        toSave.map((item) =>
          addCard({
            deckId: selectedDeckId,
            character: item.data!.character,
            traditional: item.data!.traditional,
            pinyin: item.data!.pinyin,
            hanviet: item.data!.hanviet,
            translation: item.data!.translation,
            examples: item.data!.examples || [],
            radical: item.data!.radical,
            strokeCount: item.data!.strokeCount,
            hskLevel: item.data!.hskLevel,
            tags: item.data!.tags || [],
            srs: createDefaultSRSState(),
          }),
        ),
      );

      triggerHaptic("success");
      setInput("");
      setWordItems([]);
      setSkippedWords([]);

      Alert.alert(
        "Thành công",
        `Đã lưu tất cả ${toSave.length} từ vựng vào bộ thẻ thành công!`,
      );
    } catch (e: any) {
      triggerHaptic("error");
      Alert.alert("Lỗi lưu thẻ", getFirestoreErrorMessage(e));
      setWordItems((prev) => prev.map((i) => ({ ...i, saving: false })));
    }
  };

  const handleRemoveItem = (word: string) => {
    setWordItems((prev) => prev.filter((i) => i.word !== word));
  };

  const doneItems = wordItems.filter((i) => i.status === "done" && !i.saved);
  const anyLoading = wordItems.some((i) => i.status === "loading");

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
            setWordItems([]);
            setSkippedWords([]);
            AsyncStorage.setItem("lastSelectedDeckId", id);
          }}
        />

        {/* Section 2: Input */}
        <SectionTitle>
          {isMulti
            ? `TỪ CẦN TẠO THẺ  ·  ${wordCount}/${MAX_WORDS} TỪ`
            : `TỪ CẦN TẠO THẺ  ·  TỐI ĐA ${MAX_WORDS} TỪ`}
        </SectionTitle>
        <InsetGroup>
          <View style={styles.inputCell}>
            <TextInput
              style={styles.input}
              placeholder="VD: 学习  hoặc nhiều từ: 学习, 汉语, 工作 (ngăn cách bằng dấu phẩy)"
              placeholderTextColor={Colors.text.tertiary}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => handleGenerate()}
              returnKeyType="search"
            />
            <TouchableOpacity
              style={[
                styles.genBtn,
                (isGenerating || !input.trim() || !selectedDeckId) && styles.genBtnDisabled,
              ]}
              onPress={handleGenerate}
              disabled={isGenerating || !input.trim() || !selectedDeckId}
              activeOpacity={0.8}
            >
              {isGenerating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="sparkles" size={13} color="#FFFFFF" style={{ marginRight: 5 }} />
                  <Text style={styles.genBtnText}>
                    {isMulti ? `Tạo ${wordCount} từ` : "Tạo AI"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Word chips — show parsed words when multiple detected, before generation */}
          {isMulti && wordItems.length === 0 && (
            <View style={styles.chipsRow}>
              {parsedWords.map((w, i) => (
                <View key={i} style={styles.chip}>
                  <Text style={styles.chipText}>{w}</Text>
                </View>
              ))}
              {wordCount >= MAX_WORDS && (
                <View style={[styles.chip, styles.chipWarning]}>
                  <Text style={[styles.chipText, styles.chipWarningText]}>
                    tối đa {MAX_WORDS}
                  </Text>
                </View>
              )}
            </View>
          )}
        </InsetGroup>

        {/* Skipped duplicate words notice banner */}
        {skippedWords.length > 0 && !isGenerating && (
          <View style={styles.skippedBanner}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color={Colors.accent.indigoLight}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.skippedText}>
              Tự động bỏ qua {skippedWords.length} từ đã có sẵn trong bộ thẻ:{" "}
              <Text style={{ fontWeight: Typography.weight.bold }}>{skippedWords.join(", ")}</Text>
            </Text>
          </View>
        )}

        {/* Global Loading Indicator */}
        {(isGenerating || anyLoading) && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={Colors.accent.indigoLight} size="small" />
            <Text style={styles.loadingText}>AI đang phân tích...</Text>
          </View>
        )}

        {/* Per-word results */}
        {wordItems.map((item) => {
          if (item.status === "loading") {
            return null;
          }

          if (item.status === "error") {
            return (
              <View key={item.word} style={styles.errorRow}>
                <View style={styles.errorContent}>
                  <Ionicons name="alert-circle-outline" size={16} color={Colors.neon.coral} />
                  <Text style={styles.errorText}>
                    "{item.word}" — {item.errorMsg || "Lỗi tạo thẻ"}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.retryBtn}
                  onPress={() => handleReGenerate(item.word)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="refresh"
                    size={13}
                    color={Colors.accent.indigoLight}
                    style={{ marginRight: 3 }}
                  />
                  <Text style={styles.retryBtnText}>Thử lại</Text>
                </TouchableOpacity>
              </View>
            );
          }

          if (item.status === "done" && item.data && !item.saved) {
            return (
              <CardPreview
                key={item.word}
                cardData={item.data}
                targetDeckName={decks.find((d) => d.id === selectedDeckId)?.name}
                saving={item.saving}
                onReGenerate={() => handleReGenerate(item.word)}
                onSave={() => handleSaveOne(item)}
                onRemove={wordItems.length > 1 ? () => handleRemoveItem(item.word) : undefined}
              />
            );
          }

          return null;
        })}

        {/* Save All button — visible only when 2+ done cards, nothing still loading */}
        {doneItems.length > 1 && !anyLoading && (
          <TouchableOpacity style={styles.saveAllBtn} onPress={handleSaveAll} activeOpacity={0.85}>
            <Ionicons name="checkmark-done" size={16} color="#FFF" style={{ marginRight: 6 }} />
            <Text style={styles.saveAllText}>Lưu tất cả {doneItems.length} thẻ</Text>
          </TouchableOpacity>
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
    fontSize: Typography.text.subhead.fontSize,
    color: Colors.text.primary,
    paddingVertical: 8,
    marginRight: 8,
  },
  genBtn: {
    backgroundColor: Colors.accent.indigo,
    borderRadius: Radii.card,
    height: 36,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  genBtnDisabled: {
    opacity: 0.4,
  },
  genBtnText: {
    color: "#FFFFFF",
    fontSize: Typography.text.caption1.fontSize,
    fontWeight: Typography.weight.semibold,
  },

  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: 12,
    paddingBottom: 10,
    paddingTop: 2,
  },
  chip: {
    backgroundColor: Colors.bg.tertiary,
    borderRadius: Radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipText: {
    fontSize: Typography.text.caption2.fontSize,
    color: Colors.text.secondary,
    fontWeight: Typography.weight.medium,
  },
  chipWarning: {
    backgroundColor: "rgba(248, 81, 73, 0.15)",
  },
  chipWarningText: {
    color: Colors.neon.coral,
  },

  skippedBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(94, 106, 210, 0.12)",
    borderRadius: Radii.card,
    paddingHorizontal: Spacing.cellHorizontal,
    paddingVertical: 10,
    marginTop: Spacing.md,
  },
  skippedText: {
    flex: 1,
    fontSize: Typography.text.caption1.fontSize,
    color: Colors.accent.indigoLight,
    fontWeight: Typography.weight.medium,
  },

  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xl,
    gap: 10,
  },
  loadingText: {
    fontSize: Typography.text.footnote.fontSize,
    color: Colors.text.secondary,
  },

  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radii.card,
    padding: Spacing.md,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: "rgba(248, 81, 73, 0.2)",
  },
  errorContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  errorText: {
    fontSize: Typography.text.footnote.fontSize,
    color: Colors.neon.coral,
    marginLeft: 6,
    flex: 1,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.bg.tertiary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radii.sm,
  },
  retryBtnText: {
    fontSize: Typography.text.caption2.fontSize,
    color: Colors.accent.indigoLight,
    fontWeight: Typography.weight.medium,
  },

  savedRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radii.card,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  savedText: {
    fontSize: Typography.text.subhead.fontSize,
    color: Colors.neon.emerald,
    marginLeft: 8,
    fontWeight: Typography.weight.medium,
  },

  saveAllBtn: {
    backgroundColor: Colors.accent.indigo,
    borderRadius: Radii.card,
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.lg,
  },
  saveAllText: {
    color: "#FFFFFF",
    fontSize: Typography.text.callout.fontSize,
    fontWeight: Typography.weight.semibold,
  },
});
