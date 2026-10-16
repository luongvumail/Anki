import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  BorderWidths,
  Layout,
  Radii,
  Spacing,
  triggerHaptic,
  Typography,
} from "../../constants/theme";
import { useAICardGenerator } from "../../hooks/useAICardGenerator";
import { useTheme } from "../../hooks/useTheme";
import { AppButton } from "../ui/AppButton";
import { AppCard } from "../ui/AppCard";
import { CardPreview } from "./CardPreview";
import { DeckPicker } from "./DeckPicker";

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
    selectedImages,
    handleTakePhoto,
    handlePickImage,
    handleRemoveImage,
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
          styles.modalContainer,
          { paddingTop: Math.max(insets.top, Spacing.lg), backgroundColor: theme.bg },
        ]}
      >
        {/* Header - Styled identical to decks.tsx modalHeader */}
        <View style={styles.modalHeader}>
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
              Quét tối đa 5 ảnh & Tự động lọc từ trùng CSDL
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
            <View style={styles.inputLabelRow}>
              <Text style={[styles.inputLabel, { color: theme.textMuted, marginBottom: 0 }]}>
                1. Quét từ vựng từ Ảnh (Tối đa 5 ảnh):
              </Text>
              <Text
                style={[
                  styles.imageCountBadge,
                  { color: selectedImages.length >= 5 ? theme.yellow : theme.blue },
                ]}
              >
                {selectedImages.length}/5 ảnh
              </Text>
            </View>

            <View style={styles.imageActionsRow}>
              <TouchableOpacity
                style={[
                  styles.imageActionBtn,
                  {
                    backgroundColor: theme.blueDim,
                    borderColor: theme.blue,
                    opacity: selectedImages.length >= 5 ? 0.5 : 1,
                  },
                ]}
                activeOpacity={0.8}
                disabled={loading || selectedImages.length >= 5}
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
                    opacity: selectedImages.length >= 5 ? 0.5 : 1,
                  },
                ]}
                activeOpacity={0.8}
                disabled={loading || selectedImages.length >= 5}
                onPress={handlePickImage}
              >
                <Ionicons name="images" size={20} color={theme.textPrimary} />
                <Text style={[styles.imageActionText, { color: theme.textPrimary }]}>
                  Tải ảnh ({selectedImages.length}/5)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Selected Images Gallery Preview */}
            {selectedImages.length > 0 && (
              <View
                style={[
                  styles.selectedImagesContainer,
                  {
                    backgroundColor: theme.bgSoft,
                    borderColor: theme.blue,
                  },
                ]}
              >
                <View style={styles.selectedImagesHeader}>
                  <View style={styles.imageBadgeRow}>
                    <Ionicons name="scan-circle" size={18} color={theme.blue} />
                    <Text style={[styles.selectedImageTitle, { color: theme.textPrimary }]}>
                      Đã chọn {selectedImages.length} ảnh để phân tích
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.clearAllBtn, { backgroundColor: theme.redDim }]}
                    onPress={handleClearImage}
                    disabled={loading}
                  >
                    <Ionicons name="trash-outline" size={14} color={theme.red} />
                    <Text style={[styles.clearAllText, { color: theme.red }]}>Xóa tất cả</Text>
                  </TouchableOpacity>
                </View>

                {/* Horizontal thumbnail list */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.thumbnailsScroll}
                >
                  {selectedImages.map((img, index) => (
                    <View key={img.uri + index} style={styles.thumbnailWrapper}>
                      <Image source={{ uri: img.uri }} style={styles.imageThumb} />
                      <TouchableOpacity
                        style={styles.thumbnailRemoveBadge}
                        onPress={() => handleRemoveImage(index)}
                        disabled={loading}
                      >
                        <Ionicons name="close-circle" size={22} color={theme.red} />
                      </TouchableOpacity>
                      <View style={styles.imageIndexTag}>
                        <Text style={styles.imageIndexText}>#{index + 1}</Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>

                <Text style={[styles.selectedImageSub, { color: theme.textMuted }]}>
                  AI sẽ đọc văn bản trong tất cả các ảnh và tự động loại bỏ từ trùng lặp.
                </Text>
              </View>
            )}

            <Text style={[styles.inputLabel, { color: theme.textMuted, marginTop: Spacing.md }]}>
              {selectedImages.length > 0
                ? "2. Ghi chú thêm cho AI khi quét ảnh (Tuỳ chọn):"
                : "2. Hoặc nhập từ Hán, Pinyin, Chủ đề:"}
            </Text>
            <TextInput
              style={[
                styles.promptInput,
                { backgroundColor: theme.bgSoft, color: theme.textPrimary },
              ]}
              placeholder={
                selectedImages.length > 0
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
                  ? selectedImages.length > 0
                    ? `AI ĐANG PHÂN TÍCH ${selectedImages.length} ẢNH...`
                    : "AI ĐANG TẠO..."
                  : selectedImages.length > 0
                    ? `PHÂN TÍCH ${selectedImages.length} ẢNH & LỌC TỪ TRÙNG`
                    : "TẠO TỪ VỰNG BẰNG AI"
              }
              variant="blue"
              size="lg"
              loading={loading}
              disabled={loading || (selectedImages.length === 0 && !prompt.trim())}
              onPress={handleGenerate}
              style={{ marginTop: Spacing.md }}
              icon={
                loading ? (
                  <ActivityIndicator size="small" color={theme.blue} />
                ) : (
                  <Ionicons
                    name={selectedImages.length > 0 ? "scan" : "sparkles"}
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
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.pageMargin,
    paddingBottom: Spacing.cellPadding,
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
  inputLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  imageCountBadge: {
    fontSize: Typography.caption1.fontSize,
    fontWeight: Typography.weight.bold,
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
  selectedImagesContainer: {
    padding: Spacing.sm,
    borderRadius: Radii.lg,
    borderWidth: BorderWidths.thin,
    marginTop: Spacing.sm,
  },
  selectedImagesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  clearAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  clearAllText: {
    fontSize: Typography.caption2.fontSize,
    fontWeight: Typography.weight.bold,
  },
  thumbnailsScroll: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  thumbnailWrapper: {
    position: "relative",
    width: 68,
    height: 68,
  },
  imageThumb: {
    width: 68,
    height: 68,
    borderRadius: Radii.md,
    backgroundColor: "#E2E8F0",
  },
  thumbnailRemoveBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#FFFFFF",
    borderRadius: 11,
    zIndex: 5,
  },
  imageIndexTag: {
    position: "absolute",
    bottom: 2,
    left: 2,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  imageIndexText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: Typography.weight.bold,
  },
  imageBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  selectedImageTitle: {
    fontSize: Typography.caption.fontSize,
    fontWeight: Typography.weight.bold,
  },
  selectedImageSub: {
    fontSize: Typography.caption2.fontSize,
    lineHeight: 16,
    marginTop: Spacing.xs,
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
