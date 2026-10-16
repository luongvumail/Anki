import React, { useMemo, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  BackHandler,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useStore } from "../../store/useStore";
import { Spacing, Radii, Typography, Layout, triggerHaptic } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import { FlashcardView } from "../../components/study/FlashcardView";
import { QuizCardView } from "../../components/study/QuizCardView";
import { SessionDoneScreen } from "../../components/study/SessionDoneScreen";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { AppButton } from "../../components/ui/AppButton";
import { useStudySession } from "../../hooks/useStudySession";

export default function StudyScreen() {
  const insets = useSafeAreaInsets();
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  const { theme } = useTheme();
  const decks = useStore((s) => s.decks);

  const deck = useMemo(
    () => (Array.isArray(decks) ? decks.find((d) => d.id === deckId) : undefined),
    [decks, deckId],
  );

  const {
    stage,
    session,
    isLoading,
    deckCards,
    previewIndex,
    targetCards,
    questions,
    repairQuestions,
    repairIndex,
    revealedCardIds,
    markCardRevealed,
    handleNextPreview,
    handlePrevPreview,
    handleQuizAnswer,
    handleRepairAnswer,
  } = useStudySession(deckId || "");

  const handleExitSession = useCallback(() => {
    if (session && session.reviewedCount > 0) {
      Alert.alert(
        "Thoát phiên học?",
        "Tiến trình FSRS của các thẻ đã làm Quiz đã được tự động lưu. Bạn có muốn thoát không?",
        [
          { text: "Tiếp tục học", style: "cancel" },
          { text: "Thoát", style: "destructive", onPress: () => router.back() },
        ],
      );
    } else {
      router.back();
    }
  }, [session]);

  useEffect(() => {
    const backSub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (stage !== "done" && session && session.reviewedCount > 0) {
        handleExitSession();
        return true;
      }
      return false;
    });
    return () => backSub.remove();
  }, [stage, session, handleExitSession]);

  if (!isLoading && deckCards.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.bg }]}>
        <Ionicons
          name="book-outline"
          size={Layout.avatarLg}
          color={theme.textMuted}
          style={{ marginBottom: Spacing.md }}
        />
        <Text
          style={{
            fontSize: Typography.titleMD.fontSize,
            fontWeight: Typography.weight.extraBold,
            color: theme.textPrimary,
            marginBottom: Spacing.xs,
          }}
        >
          Bộ thẻ này chưa có từ vựng!
        </Text>
        <Text
          style={{
            fontSize: Typography.caption.fontSize,
            color: theme.textMuted,
            textAlign: "center",
            marginBottom: Spacing.xl,
            paddingHorizontal: Spacing.xl,
          }}
        >
          Vui lòng quay lại danh sách bộ thẻ và thêm thẻ từ vựng trước khi bắt đầu học.
        </Text>
        <AppButton
          title="QUAY LẠI"
          variant="primary"
          size="md"
          onPress={() => router.back()}
          style={{ width: 160 }}
        />
      </View>
    );
  }

  if (isLoading || (!session && stage !== "done")) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="small" color={theme.green} />
      </View>
    );
  }

  if (stage === "done" || !session) {
    return (
      <SessionDoneScreen
        session={
          session || {
            deckId: deckId || "",
            queue: [],
            currentIndex: 0,
            correctCount: 0,
            reviewedCount: 0,
            startTime: new Date(),
          }
        }
        onDone={() => router.back()}
      />
    );
  }

  const previewProgress = targetCards.length > 0 ? (previewIndex + 1) / targetCards.length : 0;
  const validationProgress =
    questions.length > 0 ? (session.currentIndex + 1) / questions.length : 0;
  const repairProgress =
    repairQuestions.length > 0 ? (repairIndex + 1) / repairQuestions.length : 0;

  const currentValidationQuestion = questions[session.currentIndex];
  const currentRepairQuestion = repairQuestions[repairIndex];

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Dynamic Top Header with Progress Bar */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top + Spacing.sm, Spacing.cellMinHeight),
            backgroundColor: theme.bg,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.closeHeaderBtn}
          onPress={() => {
            triggerHaptic("selection");
            handleExitSession();
          }}
        >
          <Ionicons name="close" size={Layout.iconLg} color={theme.textMuted} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.deckHeaderTitle, { color: theme.textMuted }]}>
            {deck?.name || "BỘ THẺ HỌC TẬP"} •{" "}
            {stage === "preview"
              ? "XEM THẺ CHUẨN BỊ"
              : stage === "validation"
                ? "BÀI KIỂM TRA PHẢN XẠ"
                : "SỬA LỖI NHANH"}
          </Text>
          <ProgressBar
            progress={
              stage === "preview"
                ? previewProgress
                : stage === "validation"
                  ? validationProgress
                  : repairProgress
            }
            height={Spacing.sm}
            fillColor={
              stage === "preview" ? theme.blue : stage === "validation" ? theme.green : theme.yellow
            }
          />
        </View>

        {/* Header Stage Badge */}
        <View
          style={[
            styles.stageBadge,
            stage === "preview"
              ? { backgroundColor: theme.blueDim }
              : stage === "validation"
                ? { backgroundColor: theme.greenDim }
                : { backgroundColor: theme.yellowDim },
          ]}
        >
          <Ionicons
            name={
              stage === "preview"
                ? "eye-outline"
                : stage === "validation"
                  ? "checkmark-circle-outline"
                  : "flash-outline"
            }
            size={Layout.iconSm}
            color={
              stage === "preview" ? theme.blue : stage === "validation" ? theme.green : theme.yellow
            }
          />
          <Text
            style={[
              styles.stageBadgeText,
              {
                color:
                  stage === "preview"
                    ? theme.blue
                    : stage === "validation"
                      ? theme.green
                      : theme.yellow,
              },
            ]}
          >
            {stage === "preview"
              ? `${previewIndex + 1}/${targetCards.length}`
              : stage === "validation"
                ? `${session.currentIndex + 1}/${questions.length}`
                : `${repairIndex + 1}/${repairQuestions.length}`}
          </Text>
        </View>
      </View>

      {/* Main Interactive Stage Body */}
      <View style={styles.stageContentContainer}>
        {stage === "preview" ? (
          targetCards.length > 0 && targetCards[previewIndex] ? (
            <FlashcardView
              key={`fc-${targetCards[previewIndex]?.id || previewIndex}`}
              card={targetCards[previewIndex]}
              currentIndex={previewIndex}
              totalCards={targetCards.length}
              showNextButton={true}
              isRevealedInitially={
                targetCards[previewIndex]?.id
                  ? revealedCardIds.has(targetCards[previewIndex].id)
                  : false
              }
              onReveal={() => {
                if (targetCards[previewIndex]?.id) {
                  markCardRevealed(targetCards[previewIndex].id);
                }
              }}
              onNext={handleNextPreview}
              onPrev={handlePrevPreview}
            />
          ) : null
        ) : stage === "validation" ? (
          currentValidationQuestion ? (
            <QuizCardView
              key={`qz-${currentValidationQuestion.card.id}-${session.currentIndex}`}
              question={currentValidationQuestion}
              onAnswer={handleQuizAnswer}
            />
          ) : null
        ) : stage === "repair" ? (
          currentRepairQuestion ? (
            <QuizCardView
              key={`rp-${currentRepairQuestion.card.id}-${repairIndex}`}
              question={currentRepairQuestion}
              isFastRepairMode={true}
              onAnswer={handleRepairAnswer}
            />
          ) : null
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.pageMargin,
    paddingBottom: Spacing.xs,
    gap: Spacing.sm,
  },
  closeHeaderBtn: { padding: Spacing.xs },
  headerCenter: { flex: 1, paddingHorizontal: Spacing.xs },
  deckHeaderTitle: {
    fontSize: Typography.text.caption2.fontSize,
    fontWeight: Typography.weight.extraBold,
    letterSpacing: 0.8,
    marginBottom: Spacing.xs,
    textAlign: "center",
  },
  stageBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.cellPadding,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.full,
  },
  stageBadgeText: {
    fontSize: Typography.caption2.fontSize,
    fontWeight: Typography.weight.extraBold,
    letterSpacing: 0.5,
  },
  stageContentContainer: { flex: 1, overflow: "hidden" },
});
