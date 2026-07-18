import React, { useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { useStore } from "../../store/useStore";
import { generateCardData, CardData } from "../../lib/gemini";
import { DEFAULT_SRS_STATE } from "../../lib/srs";
import { getGeminiErrorMessage, getFirestoreErrorMessage } from "../../lib/errorHandler";
import {
  Colors,
  Typography,
  Spacing,
  Radii,
  VECTOR_DECK_ICONS,
  triggerHaptic,
} from "../../constants/theme";

export default function AddCardScreen() {
  const insets = useSafeAreaInsets();
  const { decks, addCard, updateCard, findExistingCard, fetchCards } =
    useStore();
  const [input, setInput] = useState("");
  const [selectedDeckId, setSelectedDeckId] = useState("");
  const [deckPickerOpen, setDeckPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cardData, setCardData] = useState<CardData | null>(null);
  const [existingCardId, setExistingCardId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
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
        existingCardId ||
        findExistingCard(cardData.character, selectedDeckId)?.id;

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
        Alert.alert(
          "Đã cập nhật",
          `Đã cập nhật từ vựng "${cardData.character}" thành công!`,
        );
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
        Alert.alert(
          "Đã lưu thẻ",
          `Đã thêm từ "${cardData.character}" vào bộ thẻ!`,
        );
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

  const renderVectorIcon = (
    iconName: string,
    size = 16,
    color = Colors.accent.blue,
  ) => {
    const validIcons = VECTOR_DECK_ICONS;
    const icon = validIcons.includes(iconName)
      ? (iconName as any)
      : "book-outline";
    return (
      <Ionicons
        name={icon}
        size={size}
        color={color}
        style={{ marginRight: 6 }}
      />
    );
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
        {/* iOS Header */}
        <View style={styles.header}>
          <Text style={styles.subhead}>TỰ ĐỘNG PHÂN TÍCH TỪ VỰNG</Text>
          <Text style={styles.largeTitle}>Thêm từ AI</Text>
        </View>

        {/* Section 1: Deck Selection */}
        <Text style={styles.sectionTitle}>BỘ THẺ LƯU TRỮ</Text>
        {decks.length === 0 ? (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              Chưa có bộ thẻ. Hãy tạo bộ thẻ trước trong tab "Bộ thẻ".
            </Text>
          </View>
        ) : (
          <View style={styles.insetGroup}>
            <TouchableOpacity
              style={styles.pickerCell}
              onPress={() => {
                triggerHaptic("selection");
                setDeckPickerOpen((o) => !o);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.cellLabel}>Bộ thẻ</Text>
              <View style={styles.pickerRight}>
                {selectedDeckId ? (
                  (() => {
                    const sel = decks.find((d) => d.id === selectedDeckId);
                    return (
                      <View style={styles.pickerSelectedRow}>
                        {renderVectorIcon(
                          sel?.icon || "",
                          16,
                          Colors.accent.blue,
                        )}
                        <Text style={styles.pickerValue}>{sel?.name}</Text>
                      </View>
                    );
                  })()
                ) : (
                  <Text style={styles.pickerPlaceholder}>Chọn bộ thẻ...</Text>
                )}
                <Ionicons
                  name={deckPickerOpen ? "chevron-up" : "chevron-forward"}
                  size={16}
                  color={Colors.accent.gray3}
                  style={{ marginLeft: 6 }}
                />
              </View>
            </TouchableOpacity>

            {deckPickerOpen && (
              <View style={styles.pickerList}>
                {decks.map((deck, idx) => (
                  <TouchableOpacity
                    key={deck.id}
                    style={[styles.pickerItem, idx > 0 && styles.cellBorderTop]}
                    onPress={() => {
                      triggerHaptic("selection");
                      setSelectedDeckId(deck.id);
                      setDeckPickerOpen(false);
                    }}
                  >
                    <View style={styles.pickerSelectedRow}>
                      {renderVectorIcon(deck.icon, 16, Colors.accent.blue)}
                      <Text style={styles.pickerItemText}>{deck.name}</Text>
                    </View>
                    {selectedDeckId === deck.id && (
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color={Colors.accent.blue}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Section 2: Input */}
        <Text style={styles.sectionTitle}>TỪ CẦN TẠO THẺ</Text>
        <View style={styles.insetGroup}>
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
                (loading || !input.trim() || !selectedDeckId) &&
                  styles.genBtnDisabled,
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
        </View>

        {/* Loading Indicator */}
        {loading && (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={Colors.accent.gray} size="small" />
            <Text style={styles.loadingText}>
              AI đang phân tích âm Hán Việt & ví dụ cho "{input}"...
            </Text>
          </View>
        )}

        {/* Preview Card */}
        {cardData && (
          <>
            <View style={styles.previewHeaderRow}>
              <Text style={styles.sectionTitle}>XEM TRƯỚC THẺ BÀI</Text>
              <TouchableOpacity onPress={() => handleGenerate(true)}>
                <Text style={styles.reGenLink}>Tạo lại ↻</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.previewCard}>
              {/* Hanzi Header */}
              <View style={styles.previewTop}>
                {cardData.hskLevel ? (
                  <View style={styles.hskBadge}>
                    <Text style={styles.hskText}>HSK {cardData.hskLevel}</Text>
                  </View>
                ) : null}
                <Text style={styles.characterBig}>{cardData.character}</Text>
                {cardData.traditional &&
                  cardData.traditional !== cardData.character && (
                    <Text style={styles.traditional}>
                      {cardData.traditional} (phồn thể)
                    </Text>
                  )}
              </View>

              {/* Data Rows */}
              <View style={styles.previewRows}>
                <InfoRow
                  label="Pinyin"
                  value={cardData.pinyin}
                  color={Colors.accent.blue}
                />
                <InfoRow label="Hán Việt" value={cardData.hanviet} />
                <InfoRow label="Nghĩa TV" value={cardData.translation} />
                {cardData.radical ? (
                  <InfoRow label="Bộ thủ" value={cardData.radical} />
                ) : null}
                {cardData.strokeCount ? (
                  <InfoRow
                    label="Số nét"
                    value={`${cardData.strokeCount} nét`}
                  />
                ) : null}
              </View>

              {/* Examples */}
              {cardData.examples && cardData.examples.length > 0 && (
                <View style={styles.exampleSection}>
                  <Text style={styles.exampleHeaderTitle}>CÂU VÍ DỤ</Text>
                  {cardData.examples.map((ex, i) => (
                    <View key={i} style={styles.exampleItem}>
                      <Text style={styles.exCn}>{ex.chinese}</Text>
                      <Text style={styles.exPy}>{ex.pinyin}</Text>
                      <Text style={styles.exVi}>{ex.vietnamese}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Save Button - Perfectly Centered Text */}
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Lưu vào bộ thẻ</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function InfoRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text
        style={[
          styles.infoValue,
          color ? { color, fontWeight: Typography.weight.semibold } : {},
        ]}
      >
        {value}
      </Text>
    </View>
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
    letterSpacing: -0.08,
    marginBottom: 2,
  },
  largeTitle: {
    fontSize: Typography.text.largeTitle.fontSize,
    lineHeight: Typography.text.largeTitle.lineHeight,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    letterSpacing: 0.37,
  },

  sectionTitle: {
    fontSize: Typography.text.caption1.fontSize,
    color: Colors.text.secondary,
    fontWeight: Typography.weight.semibold,
    letterSpacing: -0.08,
    marginBottom: Spacing.sectionBottom,
    marginTop: Spacing.sectionTop,
    marginLeft: 4,
  },
  warningBox: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radii.card,
    padding: Spacing.cellHorizontal,
    marginBottom: Spacing.lg,
  },
  warningText: {
    color: Colors.text.secondary,
    fontSize: Typography.text.footnote.fontSize,
  },

  // Inset Group
  insetGroup: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radii.card,
    overflow: "hidden",
  },

  pickerCell: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.cellHorizontal,
    paddingVertical: Spacing.cellVertical,
    minHeight: Spacing.cellMinHeight,
  },
  cellLabel: {
    fontSize: Typography.text.body.fontSize,
    color: Colors.text.primary,
    fontWeight: Typography.weight.medium,
  },
  pickerRight: { flexDirection: "row", alignItems: "center" },
  pickerSelectedRow: { flexDirection: "row", alignItems: "center" },
  pickerValue: {
    fontSize: Typography.text.body.fontSize,
    color: Colors.text.primary,
    fontWeight: Typography.weight.medium,
  },
  pickerPlaceholder: {
    fontSize: Typography.text.body.fontSize,
    color: Colors.text.secondary,
  },

  pickerList: {
    borderTopWidth: 0.5,
    borderTopColor: Colors.border.separator,
    backgroundColor: Colors.bg.tertiary,
  },
  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.cellHorizontal,
    paddingVertical: Spacing.cellVertical,
  },
  cellBorderTop: {
    borderTopWidth: 0.5,
    borderTopColor: Colors.border.separator,
  },
  pickerItemText: {
    fontSize: Typography.text.body.fontSize,
    color: Colors.text.primary,
  },

  // Input Cell
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
    backgroundColor: Colors.accent.blue,
    borderRadius: Radii.card,
    paddingHorizontal: 16,
    height: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  genBtnDisabled: { opacity: 0.5 },
  genBtnText: {
    color: "#FFFFFF",
    fontWeight: Typography.weight.semibold,
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
  },
  loadingText: {
    flex: 1,
    fontSize: Typography.text.footnote.fontSize,
    color: Colors.text.secondary,
  },

  // Preview Card
  previewHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.sectionTop,
    marginBottom: Spacing.sectionBottom,
    paddingHorizontal: 4,
  },
  reGenLink: {
    fontSize: Typography.text.footnote.fontSize,
    color: Colors.accent.blue,
  },
  previewCard: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radii.card,
    padding: Spacing.cellHorizontal,
  },
  previewTop: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border.separator,
    marginBottom: Spacing.md,
  },
  hskBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: Colors.accent.gray5,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  hskText: {
    fontSize: Typography.text.caption2.fontSize,
    color: Colors.text.secondary,
    fontWeight: Typography.weight.medium,
  },
  characterBig: {
    fontSize: Typography.hanzi.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  traditional: {
    fontSize: Typography.text.footnote.fontSize,
    color: Colors.text.secondary,
    marginTop: 4,
  },

  previewRows: {
    gap: 8,
    marginBottom: Spacing.lg,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  infoLabel: {
    width: 80,
    fontSize: Typography.text.subhead.fontSize,
    color: Colors.text.secondary,
  },
  infoValue: {
    flex: 1,
    fontSize: Typography.text.subhead.fontSize,
    color: Colors.text.primary,
  },

  exampleSection: {
    borderTopWidth: 0.5,
    borderTopColor: Colors.border.separator,
    paddingTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  exampleHeaderTitle: {
    fontSize: Typography.text.caption1.fontSize,
    color: Colors.text.secondary,
    fontWeight: Typography.weight.semibold,
    marginBottom: Spacing.xs,
  },
  exampleItem: {
    backgroundColor: Colors.bg.tertiary,
    borderRadius: 10,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
  },
  exCn: {
    fontSize: Typography.text.body.fontSize,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
  },
  exPy: {
    fontSize: Typography.text.footnote.fontSize,
    color: Colors.accent.blue,
    marginTop: 2,
  },
  exVi: {
    fontSize: Typography.text.footnote.fontSize,
    color: Colors.text.secondary,
    marginTop: 2,
  },

  saveBtn: {
    backgroundColor: Colors.accent.blue,
    borderRadius: Radii.card,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: Typography.text.body.fontSize,
    fontWeight: Typography.weight.semibold,
    textAlign: "center",
    textAlignVertical: "center",
    includeFontPadding: false,
  },
});
