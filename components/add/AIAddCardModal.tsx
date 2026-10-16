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
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  Spacing,
  Radii,
  Typography,
  Layout,
  BorderWidths,
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
    selectedImage,
    handleTakePhoto,
    handlePickImage,
    handleClearImage,
    selectedDeckId,
    setSelectedDeckId,
    isDeckPickerOpen,
    setIsDeckPickerOpen,
    loading,
    generatedCards,
    selectedIndices,
    errorMessage,
    infoMessage,
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
      statusBarTranslucent
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
              Quét ảnh / Từ khóa & Tự động lọc từ trùng CSDL
            </Text>
          </View>

          <View style={{ width: Layout.avatarMd }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollBody}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Deck Picker */}
          <DeckPicker
            decks={decks}
            selectedDeckId={selectedDeckId}
            isOpen={isDeckPickerOpen}
            onToggleOpen={() => setIsDeckPickerOpen((v) => !v)}
            onSelectDeck={setSelectedDeckId}
          />

          {/* AI Vision & Prompt Input Section */}
          <AppCard style={styles.inputCard}>
            <Text style={[styles.inputLabel, { color: theme.textMuted }]}>
              1. Quét từ vựng từ Ảnh chụp / Thư viện:
            </Text>

            <View style={styles.imageActionsRow}>
              <TouchableOpacity
                style={[
                  styles.imageActionBtn,
                  {
                    backgroundColor: theme.blueDim,
                    borderColor: theme.blue,
                  },
                ]}
                activeOpacity={0.8}
                disabled={loading}
                onPress={handleTakePhoto}
              >
                <Ionicons name="camera" size={20} color={theme.blue} />
                <Text style={[styles.imageActionText, { color: theme.blue }]}>Chụp ảnh</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.imageActionBtn,
                  {
                    backgroundColor: theme.bgSoft,
                    borderColor: theme.cardBorder,
                  },
                ]}
                activeOpacity={0.8}
                disabled={loading}
                onPress={handlePickImage}
              >
                <Ionicons name="images" size={20} color={theme.textPrimary} />
                <Text style={[styles.imageActionText, { color: theme.textPrimary }]}>
                  Tải ảnh lên
                </Text>
              </TouchableOpacity>
            </View>

            {/* Selected Image Preview */}
            {selectedImage && (
              <View
                style={[
                  styles.selectedImageBox,
                  {
                    backgroundColor: theme.bgSoft,
                    borderColor: theme.blue,
                  },
                ]}
              >
                <Image source={{ uri: selectedImage.uri }} style={styles.imageThumb} />
                <View style={styles.selectedImageInfo}>
                  <View style={styles.imageBadgeRow}>
                    <Ionicons name="scan-circle" size={16} color={theme.blue} />
                    <Text style={[styles.selectedImageTitle, { color: theme.textPrimary }]}>
                      Đã sẵn sàng phân tích ảnh
                    </Text>
                  </View>
                  <Text style={[styles.selectedImageSub, { color: theme.textMuted }]}>
                    AI sẽ tự động nhận diện từ vựng & loại bỏ các từ đã có trong CSDL.
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.clearImageBtn, { backgroundColor: theme.redDim }]}
                  onPress={handleClearImage}
                  disabled={loading}
                >
                  <Ionicons name="trash-outline" size={18} color={theme.red} />
                </TouchableOpacity>
              </View>
            )}

            <Text style={[styles.inputLabel, { color: theme.textMuted, marginTop: Spacing.md }]}>
              {selectedImage
                ? "2. Ghi chú thêm cho AI khi quét ảnh (Tuỳ chọn):"
                : "2. Hoặc nhập từ Hán, Pinyin, Chủ đề:"}
            </Text>
            <TextInput
              style={[
                styles.promptInput,
                { backgroundColor: theme.bgSoft, color: theme.textPrimary },
              ]}
              placeholder={
                selectedImage
                  ? "Ví dụ: Chỉ lấy từ mới HSK 3, lấy tên món ăn..."
                  : "Ví dụ: 苹果, Du lịch, Ăn uống, HSK 3..."
              }
              placeholderTextColor={theme.textMuted}
              value={prompt}
              onChangeText={setPrompt}
              autoCapitalize="none"
            />

            <AppButton
              title={
                loading
                  ? selectedImage
                    ? "AI ĐANG PHÂN TÍCH ẢNH..."
                    : "AI ĐANG TẠO..."
                  : selectedImage
                    ? "PHÂN TÍCH ẢNH & LỌC TỪ TRÙNG"
                    : "TẠO TỪ VỰNG BẰNG AI"
              }
              variant="blue"
              size="lg"
              loading={loading}
              disabled={loading || (!selectedImage && !prompt.trim())}
              onPress={handleGenerate}
              style={{ marginTop: Spacing.md }}
              icon={
                loading ? (
                  <ActivityIndicator size="small" color={theme.blue} />
                ) : (
                  <Ionicons
                    name={selectedImage ? "scan" : "sparkles"}
                    size={Layout.iconMd}
                    color="#FFFFFF"
                  />
                )
              }
            />
          </AppCard>

          {/* Deduplication / Info Banner */}
          {infoMessage ? (
            <View style={[styles.infoBox, { backgroundColor: theme.greenDim }]}>
              <Ionicons name="checkmark-circle" size={Layout.iconMd} color={theme.green} />
              <Text style={[styles.infoText, { color: theme.green }]}>{infoMessage}</Text>
            </View>
          ) : null}

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
                Kết quả AI ({selectedIndices.size}/{generatedCards.length} từ chọn nạp):
              </Text>

              {generatedCards.map((card, idx) => {
                const isSelected = selectedIndices.has(idx);
                return (
                  <View
                    key={`${card.character}-${idx}`}
                    style={!isSelected ? styles.deselectedCardWrapper : undefined}
                  >
                    <CardPreview cardData={card} onRemove={() => toggleSelectCard(idx)} />
                  </View>
                );
              })}

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
  imageActionsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  imageActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.cellPadding,
    borderRadius: Radii.lg,
    borderWidth: BorderWidths.thin,
  },
  imageActionText: {
    fontSize: Typography.bodyMD.fontSize,
    fontWeight: Typography.weight.bold,
  },
  selectedImageBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    borderRadius: Radii.lg,
    borderWidth: BorderWidths.thin,
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  imageThumb: {
    width: 60,
    height: 60,
    borderRadius: Radii.md,
    backgroundColor: "#E2E8F0",
  },
  selectedImageInfo: {
    flex: 1,
  },
  imageBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  selectedImageTitle: {
    fontSize: Typography.caption.fontSize,
    fontWeight: Typography.weight.bold,
  },
  selectedImageSub: {
    fontSize: Typography.caption2.fontSize,
    lineHeight: 16,
  },
  clearImageBtn: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    alignItems: "center",
    justifyContent: "center",
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
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
    marginBottom: Spacing.md,
  },
  infoText: {
    fontSize: Typography.caption.fontSize,
    flex: 1,
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
  deselectedCardWrapper: {
    opacity: 0.45,
  },
});
