import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  Spacing,
  Radii,
  Typography,
  Layout,
  triggerHaptic,
} from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import { AppButton } from "../ui/AppButton";
import { AppCard } from "../ui/AppCard";
import { DeckPicker } from "./DeckPicker";
import { CardPreview } from "./CardPreview";
import { useAICardGenerator } from "../../hooks/useAICardGenerator";

export interface AIAddCardModalProps {
  visible: boolean;
  onClose: () => void;
  initialDeckId?: string;
}

export function AIAddCardModal(props: AIAddCardModalProps) {
  if (!props.visible) return null;
  return <AIAddCardModalInner {...props} />;
}

function AIAddCardModalInner({ visible, onClose, initialDeckId }: AIAddCardModalProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const {
    prompt,
    setPrompt,
    selectedDeckId,
    setSelectedDeckId,
    isDeckPickerOpen,
    setIsDeckPickerOpen,
    loading,
    generatedCards,
    selectedIndices,
    errorMessage,
    decks,
    handleGenerate,
    toggleSelectCard,
    handleSaveSelected,
  } = useAICardGenerator(initialDeckId, onClose);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.container,
          { paddingTop: Math.max(insets.top, Spacing.lg), backgroundColor: theme.bg },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => {
              triggerHaptic("selection");
              onClose();
            }}
          >
            <Ionicons name="close" size={Layout.iconLg} color={theme.textMuted} />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
              THÊM TỪ VỰNG BẰNG AI
            </Text>
            <Text style={[styles.headerSub, { color: theme.textMuted }]}>
              Tự động tạo Pinyin, Nghĩa & Ví dụ
            </Text>
          </View>

          <View style={{ width: Layout.avatarMd }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
          {/* Deck Picker */}
          <DeckPicker
            decks={decks}
            selectedDeckId={selectedDeckId}
            isOpen={isDeckPickerOpen}
            onToggleOpen={() => setIsDeckPickerOpen((v) => !v)}
            onSelectDeck={setSelectedDeckId}
          />

          {/* AI Prompt Input Section */}
          <AppCard style={styles.inputCard}>
            <Text style={[styles.inputLabel, { color: theme.textMuted }]}>
              Nhập từ Hán, Pinyin hoặc chủ đề:
            </Text>
            <TextInput
              style={[
                styles.promptInput,
                { backgroundColor: theme.bgSoft, color: theme.textPrimary },
              ]}
              placeholder="Ví dụ: 苹果, Du lịch, Ăn uống, HSK 3..."
              placeholderTextColor={theme.textMuted}
              value={prompt}
              onChangeText={setPrompt}
              autoCapitalize="none"
            />

            <AppButton
              title={loading ? "AI ĐANG TẠO..." : "TẠO TỪ VỰNG BẰNG AI"}
              variant="blue"
              size="lg"
              loading={loading}
              disabled={loading || !prompt.trim()}
              onPress={handleGenerate}
              style={{ marginTop: Spacing.md }}
              icon={
                loading ? (
                  <ActivityIndicator size="small" color={theme.blue} />
                ) : (
                  <Ionicons name="sparkles" size={Layout.iconMd} color="#FFFFFF" />
                )
              }
            />
          </AppCard>

          {/* Error Banner */}
          {errorMessage ? (
            <View style={[styles.errorBox, { backgroundColor: theme.redDim }]}>
              <Ionicons name="alert-circle" size={Layout.iconMd} color={theme.red} />
              <Text style={[styles.errorText, { color: theme.red }]}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Generated Cards Result List */}
          {generatedCards.length > 0 && (
            <View style={styles.resultSection}>
              <Text style={[styles.resultTitle, { color: theme.textPrimary }]}>
                Kết quả AI ({selectedIndices.size}/{generatedCards.length} từ chọn):
              </Text>

              {generatedCards.map((card, idx) => (
                <CardPreview key={idx} cardData={card} onRemove={() => toggleSelectCard(idx)} />
              ))}

              <AppButton
                title={`NẠP ${selectedIndices.size} TỪ VÀO BỘ THẺ`}
                variant="primary"
                size="lg"
                disabled={loading || selectedIndices.size === 0}
                onPress={handleSaveSelected}
                style={{ marginTop: Spacing.md }}
              />
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.pageMargin,
    paddingBottom: Spacing.cellPadding,
    borderBottomWidth: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
    zIndex: 10,
  },

  closeBtn: {
    padding: Spacing.sm,
  },
  headerTitleContainer: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: Typography.callout.fontSize,
    fontWeight: Typography.weight.extraBold,
  },
  headerSub: {
    fontSize: Typography.caption1.fontSize,
    marginTop: 2,
    fontWeight: Typography.weight.semibold,
  },
  scrollBody: {
    paddingHorizontal: Spacing.pageMargin,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  inputCard: {
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },

  inputLabel: {
    fontSize: Typography.caption.fontSize,
    fontWeight: Typography.weight.bold,
    marginBottom: Spacing.sm,
  },
  promptInput: {
    borderRadius: Radii.lg,
    borderWidth: 0,
    paddingHorizontal: Spacing.cellPadding,
    paddingVertical: Spacing.cellPadding,
    fontSize: Typography.bodyMD.fontSize,
    fontWeight: Typography.weight.semibold,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
    marginBottom: Spacing.md,
  },
  errorText: {
    fontSize: Typography.caption.fontSize,
    flex: 1,
    fontWeight: Typography.weight.semibold,
  },
  resultSection: {
    marginTop: Spacing.cellPadding,
  },
  resultTitle: {
    fontSize: Typography.caption.fontSize,
    fontWeight: Typography.weight.extraBold,
    marginBottom: Spacing.cellPadding,
  },
});
