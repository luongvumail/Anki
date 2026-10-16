import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "../../store/slices/types";
import {
  Spacing,
  Radii,
  Typography,
  Layout,
  BorderWidths,
  triggerHaptic,
} from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";

import { AudioButton } from "../ui/AudioButton";
import { ProgressBar } from "../ui/ProgressBar";
import { useSentenceBuilder } from "../../hooks/useSentenceBuilder";
import { AppButton } from "../ui/AppButton";

export interface SentenceBuilderModalProps {
  visible: boolean;
  onClose: () => void;
  cards: Card[];
}

export function SentenceBuilderModal({ visible, onClose, cards }: SentenceBuilderModalProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const {
    questions,
    currentIndex,
    currentQuestion,
    wordBank,
    userSentence,
    isSubmitted,
    isCorrect,
    isDone,
    handleSelectWord,
    handleRemoveWord,
    handleCheck,
    handleNext,
    playTTS,
  } = useSentenceBuilder(visible, cards);

  if (!visible) return null;

  const progress = questions.length > 0 ? (currentIndex + 1) / questions.length : 0;

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
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>XẾP TỪ THÀNH CÂU</Text>
            <Text style={[styles.headerSub, { color: theme.textMuted }]}>
              Rèn luyện ngữ pháp & phản xạ câu
            </Text>
          </View>

          <View style={{ width: Layout.avatarMd }} />
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={{ flex: 1 }}>
            <ProgressBar progress={progress} height={Spacing.sm} fillColor={theme.blue} />
          </View>
          <Text style={[styles.progressText, { color: theme.textMuted }]}>
            {questions.length > 0 ? `${currentIndex + 1}/${questions.length}` : "0/0"}
          </Text>
        </View>

        {isDone ? (
          /* Completion Screen */
          <View style={styles.doneContainer}>
            <View style={[styles.doneIconCircle, { backgroundColor: theme.yellowDim }]}>
              <Ionicons name="trophy" size={Layout.fabSize} color={theme.yellow} />
            </View>
            <Text style={[styles.doneTitle, { color: theme.textPrimary }]}>
              XUẤT SẮC! HOÀN THÀNH BÀI XẾP CÂU
            </Text>
            <Text style={[styles.doneSub, { color: theme.textMuted }]}>
              Bạn đã xếp đúng các câu ví dụ mẫu. Thêm XP tích lũy vào tài khoản!
            </Text>

            <AppButton
              title="HOÀN THÀNH"
              variant="primary"
              size="lg"
              onPress={() => {
                triggerHaptic("success");
                onClose();
              }}
              style={{ marginTop: Spacing.xl, width: "100%" }}
            />
          </View>
        ) : currentQuestion ? (
          /* Active Question Screen */
          <View style={{ flex: 1 }}>
            <ScrollView
              contentContainerStyle={styles.scrollBody}
              showsVerticalScrollIndicator={false}
            >
              {/* Vietnamese Meaning Prompt */}
              <View style={[styles.promptCard, { backgroundColor: theme.cardBg }]}>
                <Text style={[styles.promptTitle, { color: theme.textMuted }]}>
                  DỊCH CÂU SAU SANG TIẾNG TRUNG:
                </Text>
                <Text style={[styles.promptVietnamese, { color: theme.textPrimary }]}>
                  "{currentQuestion.vietnamese}"
                </Text>
                {currentQuestion.pinyin ? (
                  <Text style={[styles.promptPinyin, { color: theme.blue }]}>
                    {currentQuestion.pinyin}
                  </Text>
                ) : null}
              </View>

              {/* User Drop Area */}
              <View
                style={[
                  styles.userDropArea,
                  {
                    backgroundColor: theme.bgSoft,
                    borderColor: isSubmitted
                      ? isCorrect
                        ? theme.green
                        : theme.red
                      : "transparent",
                  },
                ]}
              >
                {userSentence.length === 0 ? (
                  <Text style={[styles.dropPlaceholder, { color: theme.textMuted }]}>
                    Chạm các từ bên dưới để ghép thành câu...
                  </Text>
                ) : (
                  <View style={styles.wordWrapRow}>
                    {userSentence.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.wordTileSelected,
                          { backgroundColor: theme.blue, borderColor: theme.blueDark },
                        ]}
                        onPress={() => handleRemoveWord(item)}
                        disabled={isSubmitted}
                      >
                        <Text style={styles.wordTileTextSelected}>{item.text}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Available Word Bank */}
              <View style={styles.wordBankArea}>
                <Text style={[styles.wordBankTitle, { color: theme.textMuted }]}>KHO TỪ VỰNG:</Text>
                <View style={styles.wordWrapRow}>
                  {wordBank.map((item) => {
                    const isSelected = userSentence.some((w) => w.id === item.id);
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.wordTile,
                          {
                            backgroundColor: isSelected ? theme.bgSoft : theme.cardBg,
                            opacity: isSelected ? 0.25 : 1,
                          },
                        ]}
                        onPress={() => handleSelectWord(item)}
                        disabled={isSubmitted || isSelected}
                      >
                        <Text
                          style={[
                            styles.wordTileText,
                            { color: isSelected ? theme.textMuted : theme.textPrimary },
                          ]}
                        >
                          {item.text}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            {/* Bottom Footer Actions */}
            <View
              style={[
                styles.footer,
                {
                  backgroundColor: theme.bg,
                  borderTopColor: theme.cardBorder,
                  paddingBottom: Math.max(insets.bottom + Spacing.sm, Spacing.lg),
                },
              ]}
            >
              {isSubmitted ? (
                <View
                  style={[
                    styles.resultBox,
                    {
                      backgroundColor: isCorrect ? theme.greenDim : theme.redDim,
                    },
                  ]}
                >
                  <View style={styles.resultHeader}>
                    <Ionicons
                      name={isCorrect ? "checkmark-circle" : "close-circle"}
                      size={Layout.iconLg}
                      color={isCorrect ? theme.green : theme.red}
                    />
                    <Text
                      style={[styles.resultTitle, { color: isCorrect ? theme.green : theme.red }]}
                    >
                      {isCorrect ? "CHÍNH XÁC! CÂU ĐÚNG NGHỮ PHÁP." : "CHƯA CHÍNH XÁC!"}
                    </Text>
                    <AudioButton onPress={() => playTTS(currentQuestion.chinese)} size="sm" />
                  </View>
                  {!isCorrect ? (
                    <Text style={[styles.correctAnswerText, { color: theme.textMuted }]}>
                      Đáp án đúng:{" "}
                      <Text style={{ color: theme.textPrimary, fontWeight: "800" }}>
                        {currentQuestion.chinese}
                      </Text>
                    </Text>
                  ) : null}
                  <AppButton
                    title="CÂU TIẾP THEO"
                    variant={isCorrect ? "primary" : "secondary"}
                    size="lg"
                    onPress={handleNext}
                    style={{ marginTop: Spacing.md }}
                  />
                </View>
              ) : (
                <AppButton
                  title="KIỂM TRA ĐÁP ÁN"
                  variant="primary"
                  size="lg"
                  disabled={userSentence.length === 0}
                  onPress={handleCheck}
                />
              )}
            </View>
          </View>
        ) : null}
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
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.cellPadding,
    paddingHorizontal: Spacing.pageMargin,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },

  progressText: {
    fontSize: Typography.caption1.fontSize,
    fontWeight: Typography.weight.extraBold,
  },
  scrollBody: {
    paddingHorizontal: Spacing.pageMargin,
    paddingBottom: Spacing.xl,
  },
  promptCard: {
    borderRadius: Radii.xl,
    borderWidth: 0,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  promptTitle: {
    fontSize: Typography.caption1.fontSize,
    fontWeight: Typography.weight.bold,
    textTransform: "uppercase",
  },
  promptVietnamese: {
    fontSize: Typography.titleMD.fontSize,
    fontWeight: Typography.weight.extraBold,
    marginTop: Spacing.sm,
  },
  promptPinyin: {
    fontSize: Typography.caption.fontSize,
    marginTop: Spacing.xs,
    fontWeight: Typography.weight.semibold,
  },
  userDropArea: {
    minHeight: 110,
    borderRadius: Radii.lg,
    borderWidth: 0,
    padding: Spacing.md,
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  dropPlaceholder: {
    fontSize: Typography.caption.fontSize,
    textAlign: "center",
    fontWeight: Typography.weight.medium,
  },
  wordBankArea: {
    marginTop: Spacing.cellPadding,
  },
  wordBankTitle: {
    fontSize: Typography.caption1.fontSize,
    fontWeight: Typography.weight.bold,
    marginBottom: Spacing.cellPadding,
  },
  wordWrapRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.cellPadding,
  },
  wordTile: {
    borderWidth: 0,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.cellPadding,
    borderRadius: Radii.md,
  },
  wordTileText: {
    fontSize: Typography.callout.fontSize,
    fontWeight: Typography.weight.extraBold,
  },
  wordTileSelected: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.cellPadding,
    borderRadius: Radii.md,
  },
  wordTileTextSelected: {
    fontSize: Typography.callout.fontSize,
    fontWeight: Typography.weight.extraBold,
    color: "#FFFFFF",
  },
  footer: {
    paddingHorizontal: Spacing.pageMargin,
    paddingTop: Spacing.md,
    borderTopWidth: BorderWidths.thin,
  },
  resultBox: {
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderWidth: 0,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  resultTitle: {
    fontSize: Typography.callout.fontSize,
    fontWeight: Typography.weight.extraBold,
    flex: 1,
  },
  correctAnswerText: {
    fontSize: Typography.caption.fontSize,
    marginTop: Spacing.sm,
  },
  doneContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  doneIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  doneTitle: {
    fontSize: Typography.title3.fontSize,
    fontWeight: Typography.weight.extraBold,
    textAlign: "center",
  },
  doneSub: {
    fontSize: Typography.subhead.fontSize,
    textAlign: "center",
    marginTop: Spacing.sm,
    lineHeight: 20,
  },
});
