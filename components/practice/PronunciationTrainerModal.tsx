import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "../../store/slices/types";
import { Spacing, Radii, Typography, Layout, triggerHaptic } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import { AppButton } from "../ui/AppButton";
import { AudioButton } from "../ui/AudioButton";
import { ProgressBar } from "../ui/ProgressBar";
import { getPinyinToneColor } from "../../lib/pinyinColor";
import {
  usePronunciationTrainer,
  PronunciationTrainerMode,
} from "../../hooks/usePronunciationTrainer";

export interface PronunciationTrainerModalProps {
  visible: boolean;
  onClose: () => void;
  cards: Card[];
}

const TRAINER_MODES: {
  key: PronunciationTrainerMode;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: "word_guided", label: "Đọc Từ", icon: "book-outline" },
  { key: "word_blind", label: "Ẩn Pinyin", icon: "eye-off-outline" },
  { key: "sentence_shadowing", label: "Đọc Câu", icon: "chatbubbles-outline" },
];

export function PronunciationTrainerModal(props: PronunciationTrainerModalProps) {
  if (!props.visible) return null;
  return <PronunciationTrainerModalInner {...props} />;
}

function PronunciationTrainerModalInner({
  visible,
  onClose,
  cards,
}: PronunciationTrainerModalProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const {
    trainerMode,
    changeTrainerMode,
    pinyinRevealed,
    setPinyinRevealed,
    currentIndex,
    shuffledCards,
    isRecording,
    analyzing,
    speaking,
    score,
    feedback,
    errorDetail,
    pronunciationTip,
    recognizedText,
    isDone,
    userAudioUri,
    pulseAnim,
    drawerAnim,
    currentCard,
    playTTS,
    playUserRecording,
    handleStartRecording,
    handleStopRecording,
    handleNextWord,
    handleRetryWord,
  } = usePronunciationTrainer(visible, cards);

  const progress = shuffledCards.length > 0 ? (currentIndex + 1) / shuffledCards.length : 0;

  const isSentenceMode =
    trainerMode === "sentence_shadowing" &&
    currentCard?.examples &&
    currentCard.examples.length > 0 &&
    Boolean(currentCard.examples[0].chinese);

  const displayHanzi =
    isSentenceMode && currentCard ? currentCard.examples![0].chinese : currentCard?.character || "";
  const displayPinyin =
    isSentenceMode && currentCard
      ? currentCard.examples![0].pinyin || currentCard.pinyin
      : currentCard?.pinyin || "";
  const displayMeaning =
    isSentenceMode && currentCard
      ? currentCard.examples![0].vietnamese
      : currentCard?.translation || "";

  const hidePinyinAndAudio = trainerMode === "word_blind" && !pinyinRevealed && score === null;

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
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>LUYỆN PHÁT ÂM AI</Text>
            <Text style={[styles.headerSub, { color: theme.textMuted }]}>
              Chấm điểm Pinyin, Phản xạ & Ngữ điệu câu
            </Text>
          </View>

          <View style={{ width: Layout.avatarMd }} />
        </View>

        {/* Mode Selector Chips */}
        <View style={styles.modeChipsRow}>
          {TRAINER_MODES.map((m) => {
            const isSelected = trainerMode === m.key;
            return (
              <TouchableOpacity
                key={m.key}
                activeOpacity={0.75}
                onPress={() => {
                  triggerHaptic("selection");
                  changeTrainerMode(m.key);
                }}
                style={[
                  styles.modeChip,
                  { backgroundColor: isSelected ? theme.green : theme.bgSoft },
                ]}
              >
                <Ionicons
                  name={m.icon}
                  size={15}
                  color={isSelected ? "#FFFFFF" : theme.textMuted}
                />
                <Text
                  style={[
                    styles.modeChipText,
                    { color: isSelected ? "#FFFFFF" : theme.textPrimary },
                  ]}
                >
                  {m.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={{ flex: 1 }}>
            <ProgressBar progress={progress} height={Spacing.sm} fillColor={theme.green} />
          </View>
          <Text style={[styles.progressText, { color: theme.textMuted }]}>
            {shuffledCards.length > 0 ? `${currentIndex + 1}/${shuffledCards.length}` : "0/0"}
          </Text>
        </View>

        {isDone ? (
          /* Completion Screen */
          <View style={styles.doneContainer}>
            <View style={[styles.doneIconCircle, { backgroundColor: theme.yellowDim }]}>
              <Ionicons name="trophy" size={Layout.fabSize} color={theme.yellow} />
            </View>
            <Text style={[styles.doneTitle, { color: theme.textPrimary }]}>
              HOÀN THÀNH BÀI PHÁT ÂM!
            </Text>
            <Text style={[styles.doneSub, { color: theme.textMuted }]}>
              Bạn đã hoàn thành 5 mục luyện giọng nói với AI. Thêm 100 XP tích lũy!
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
        ) : currentCard ? (
          /* Active Card Screen */
          <View style={{ flex: 1 }}>
            <ScrollView
              contentContainerStyle={styles.scrollBody}
              showsVerticalScrollIndicator={false}
            >
              {/* Card Hero Box */}
              <View style={[styles.heroCard, { backgroundColor: theme.cardBg }]}>
                <Text
                  style={[
                    isSentenceMode ? styles.heroSentenceChar : styles.heroChar,
                    { color: theme.textPrimary },
                  ]}
                >
                  {displayHanzi}
                </Text>

                {hidePinyinAndAudio ? (
                  <TouchableOpacity
                    style={[styles.revealHintBtn, { backgroundColor: theme.bgSoft }]}
                    onPress={() => {
                      triggerHaptic("selection");
                      setPinyinRevealed(true);
                    }}
                  >
                    <Ionicons name="eye-outline" size={16} color={theme.blue} />
                    <Text style={[styles.revealHintText, { color: theme.blue }]}>
                      Đang ẩn Pinyin — Bấm nếu cần xem gợi ý
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text
                    style={[
                      styles.heroPinyin,
                      { color: getPinyinToneColor(displayPinyin), textAlign: "center" },
                    ]}
                  >
                    {displayPinyin}
                  </Text>
                )}

                <Text style={[styles.heroMeaning, { color: theme.textMuted, textAlign: "center" }]}>
                  {displayMeaning}
                </Text>

                {/* Listen Model Speaker */}
                {!hidePinyinAndAudio && (
                  <View style={[styles.speakerBox, { backgroundColor: theme.bgSoft }]}>
                    <AudioButton
                      onPress={() => playTTS(displayHanzi)}
                      isPlaying={speaking}
                      size="md"
                    />
                    <Text style={[styles.speakerLabel, { color: theme.textMuted }]}>
                      {isSentenceMode ? "Bấm để nghe câu mẫu" : "Bấm để nghe phát âm mẫu"}
                    </Text>
                  </View>
                )}
              </View>

              {/* Mic Action Section */}
              <View style={styles.micSection}>
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <TouchableOpacity
                    style={[
                      styles.micBtn,
                      { backgroundColor: theme.blue, shadowColor: theme.blue },
                      isRecording && { backgroundColor: theme.red, shadowColor: theme.red },
                      analyzing && { backgroundColor: theme.yellow, shadowColor: theme.yellow },
                    ]}
                    onPress={isRecording ? handleStopRecording : handleStartRecording}
                    disabled={analyzing}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={isRecording ? "stop" : analyzing ? "sparkles" : "mic"}
                      size={Layout.iconXl}
                      color="#FFFFFF"
                    />
                  </TouchableOpacity>
                </Animated.View>

                <Text style={[styles.micHint, { color: theme.textMuted }]}>
                  {isRecording
                    ? "Đang thu âm... Bấm dừng khi đọc xong"
                    : analyzing
                      ? "AI đang phân tích giọng nói..."
                      : isSentenceMode
                        ? "Bấm Micro và đọc trôi chảy cả câu"
                        : "Bấm Micro để bắt đầu đọc"}
                </Text>
              </View>
            </ScrollView>

            {/* Bottom Drawer Result Feedback */}
            {score !== null && (
              <Animated.View
                style={[
                  styles.resultDrawer,
                  {
                    backgroundColor: theme.cardBg,
                    borderColor: theme.cardBorder,
                    transform: [{ translateY: drawerAnim }],
                    paddingBottom: Math.max(insets.bottom + Spacing.sm, Spacing.lg),
                  },
                ]}
              >
                <View style={styles.resultHeader}>
                  <View
                    style={[
                      styles.scoreCircle,
                      {
                        backgroundColor:
                          score >= 90
                            ? theme.greenDim
                            : score >= 60
                              ? theme.yellowDim
                              : theme.redDim,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.scoreText,
                        {
                          color: score >= 90 ? theme.green : score >= 60 ? theme.yellow : theme.red,
                        },
                      ]}
                    >
                      {score}%
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.feedbackTitle, { color: theme.textPrimary }]}>
                      {feedback}
                    </Text>
                    {recognizedText ? (
                      <Text style={[styles.recognizedText, { color: theme.textMuted }]}>
                        Âm nhận diện: "
                        <Text style={{ color: theme.textPrimary }}>{recognizedText}</Text>"
                      </Text>
                    ) : null}
                  </View>
                </View>

                {errorDetail ? (
                  <View style={[styles.detailBox, { backgroundColor: theme.yellowDim }]}>
                    <Ionicons name="alert-circle" size={Layout.iconSm} color={theme.yellow} />
                    <Text style={[styles.detailText, { color: theme.yellow }]}>{errorDetail}</Text>
                  </View>
                ) : null}

                {pronunciationTip ? (
                  <View style={[styles.tipBox, { backgroundColor: theme.blueDim }]}>
                    <Ionicons name="bulb" size={Layout.iconSm} color={theme.blue} />
                    <Text style={[styles.tipText, { color: theme.blue }]}>{pronunciationTip}</Text>
                  </View>
                ) : null}

                {/* User Playback & Next Action Buttons */}
                <View style={styles.actionRow}>
                  {userAudioUri ? (
                    <TouchableOpacity
                      style={[styles.listenUserBtn, { backgroundColor: theme.blueDim }]}
                      onPress={playUserRecording}
                    >
                      <Ionicons name="play" size={Layout.iconSm} color={theme.blue} />
                      <Text style={[styles.listenUserText, { color: theme.blue }]}>
                        Nghe lại bản thu
                      </Text>
                    </TouchableOpacity>
                  ) : null}

                  {score < 90 ? (
                    <AppButton
                      title="ĐỌC LẠI"
                      variant="secondary"
                      size="md"
                      onPress={handleRetryWord}
                      style={{ flex: 1 }}
                    />
                  ) : null}

                  <AppButton
                    title="TỪ TIẾP THEO"
                    variant="primary"
                    size="md"
                    onPress={handleNextWord}
                    style={{ flex: 1 }}
                  />
                </View>
              </Animated.View>
            )}
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
  modeChipsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.pageMargin,
    marginBottom: Spacing.sm,
  },
  modeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radii.full,
  },
  modeChipText: {
    fontSize: Typography.caption1.fontSize,
    fontWeight: Typography.weight.extraBold,
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
    alignItems: "center",
    paddingBottom: Spacing.xl,
  },
  heroCard: {
    width: "100%",
    borderRadius: Radii.xl,
    borderWidth: 0,
    padding: Spacing.xl,
    alignItems: "center",
    marginVertical: Spacing.cellPadding,
  },
  heroChar: {
    fontSize: Typography.hanziHero.fontSize,
    fontWeight: Typography.weight.extraBold,
  },
  heroSentenceChar: {
    fontSize: Typography.title1.fontSize,
    fontWeight: Typography.weight.extraBold,
    textAlign: "center",
    lineHeight: 36,
  },
  revealHintBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radii.full,
    marginTop: Spacing.sm,
  },
  revealHintText: {
    fontSize: Typography.caption1.fontSize,
    fontWeight: Typography.weight.bold,
  },
  heroPinyin: {
    fontSize: Typography.titleMD.fontSize,
    fontWeight: Typography.weight.bold,
    marginTop: Spacing.sm,
  },
  heroMeaning: {
    fontSize: Typography.subhead.fontSize,
    marginTop: Spacing.xs,
    fontWeight: Typography.weight.semibold,
  },
  speakerBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.full,
  },
  speakerLabel: {
    fontSize: Typography.caption1.fontSize,
    fontWeight: Typography.weight.semibold,
  },
  micSection: {
    alignItems: "center",
    marginTop: Spacing.xxl,
  },
  micBtn: {
    width: Layout.avatarXl,
    height: Layout.avatarXl,
    borderRadius: Layout.avatarXl / 2,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  micHint: {
    fontSize: Typography.caption.fontSize,
    marginTop: Spacing.cellPadding,
    fontWeight: Typography.weight.semibold,
  },
  resultDrawer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  scoreCircle: {
    width: Layout.avatarLg,
    height: Layout.avatarLg,
    borderRadius: Layout.avatarLg / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreText: {
    fontSize: Typography.callout.fontSize,
    fontWeight: Typography.weight.extraBold,
  },
  feedbackTitle: {
    fontSize: Typography.subhead.fontSize,
    fontWeight: Typography.weight.extraBold,
  },
  recognizedText: {
    fontSize: Typography.caption1.fontSize,
    marginTop: 2,
  },
  detailBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    padding: Spacing.cellPadding,
    borderRadius: Radii.md,
  },
  detailText: {
    fontSize: Typography.caption1.fontSize,
    flex: 1,
    lineHeight: 16,
    fontWeight: Typography.weight.semibold,
  },
  tipBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    padding: Spacing.cellPadding,
    borderRadius: Radii.md,
  },
  tipText: {
    fontSize: Typography.caption1.fontSize,
    flex: 1,
    lineHeight: 16,
    fontWeight: Typography.weight.semibold,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.cellPadding,
    marginTop: Spacing.xs,
  },
  listenUserBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.cellPadding,
    borderRadius: Radii.md,
  },
  listenUserText: {
    fontSize: Typography.caption1.fontSize,
    fontWeight: Typography.weight.bold,
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
