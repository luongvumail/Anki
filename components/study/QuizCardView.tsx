import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { QuizQuestion, PINYIN_TONE_VOWELS } from "../../lib/quizGenerator";
import { Spacing, Radii, Typography, Layout } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import { AppButton } from "../ui/AppButton";
import { AudioButton } from "../ui/AudioButton";
import { getPinyinToneColor } from "../../lib/pinyinColor";
import { useQuizCard, WeakTagType } from "../../hooks/useQuizCard";
import { calculateQuizFSRS } from "../../lib/srs";

export { WeakTagType };

interface QuizCardViewProps {
  question: QuizQuestion;
  onAnswer: (isCorrect: boolean, responseTimeMs: number, weakTag?: WeakTagType) => void;
  isFastRepairMode?: boolean;
}

const OPTION_LETTERS = ["A", "B", "C", "D"];

export function QuizCardView({ question, onAnswer, isFastRepairMode }: QuizCardViewProps) {
  const { width } = useWindowDimensions();
  const { theme } = useTheme();
  const cardWidth = width - Spacing.pageMargin * 2;

  const {
    activeMode,
    selectedIndex,
    typedText,
    setTypedText,
    toneHint,
    isCorrect,
    isChecked,
    speaking,
    speakingSlow,
    speakingSentence,
    isRecording,
    analyzingSpeech,
    spokenTranscript,
    timeLeft,
    responseTimeMs,
    drawerAnim,
    shakeAnim,
    bounceAnim,
    micPulseAnim,
    playTTS,
    playSlowTTS,
    playSentenceTTS,
    handleSelectOption,
    handleAppendToneVowel,
    handleSubmitTyped,
    handleSwitchToChoice,
    handleStartSpeaking,
    handleStopSpeaking,
    handleContinue,
  } = useQuizCard(question, onAnswer, isFastRepairMode);

  const fsrsEval = isChecked
    ? calculateQuizFSRS(
        isCorrect,
        Boolean(isFastRepairMode),
        responseTimeMs,
        question.card.srs,
        activeMode,
      )
    : null;

  const primaryExample =
    question.card.examples && question.card.examples.length > 0 && question.card.examples[0].chinese
      ? question.card.examples[0]
      : null;

  const isListeningType =
    question.type === "listening" ||
    question.type === "listening_meaning" ||
    question.type === "listening_dictation";

  const isClozeType = question.type === "cloze" || question.type === "cloze_typing";

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: isChecked ? 280 : 120 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Fast Repair Mode Countdown Header */}
        {isFastRepairMode && (
          <View style={[styles.timerHeader, { backgroundColor: theme.cardBg }]}>
            <Ionicons name="flash" size={Layout.iconMd} color={theme.yellow} />
            <Text style={[styles.timerTitle, { color: theme.yellow }]}>
              SỬA LỖI PHẢN XẠ NHANH (5s):
            </Text>
            <View style={[styles.timerBadge, { backgroundColor: theme.yellowDim }]}>
              <Text style={[styles.timerText, { color: theme.yellow }]}>{timeLeft}s</Text>
            </View>
          </View>
        )}

        {/* Question Prompt Card */}
        <Animated.View
          style={[
            styles.questionCard,
            {
              width: cardWidth,
              backgroundColor: theme.cardBg,
            },
            { transform: [{ translateX: shakeAnim }, { scale: bounceAnim }] },
          ]}
        >
          <Text style={[styles.questionPromptText, { color: theme.textMuted }]}>
            {question.prompt}
          </Text>

          {/* Dynamic Question Target Display */}
          {isClozeType ? (
            <View style={styles.clozeContainer}>
              <Text style={[styles.clozeSentenceText, { color: theme.textPrimary }]}>
                {question.clozeSentence}
              </Text>
              {question.clozeTranslation ? (
                <Text style={[styles.clozeTranslationText, { color: theme.textMuted }]}>
                  "{question.clozeTranslation}"
                </Text>
              ) : null}
            </View>
          ) : isListeningType ? (
            <View style={styles.listeningContainer}>
              <View style={styles.dualAudioRow}>
                <AudioButton
                  onPress={() => playTTS(question.audioText || question.card.character)}
                  isPlaying={speaking}
                  size="lg"
                />
                <TouchableOpacity
                  style={[
                    styles.slowAudioBtn,
                    {
                      backgroundColor: speakingSlow ? theme.blue : theme.blueDim,
                    },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => playSlowTTS(question.audioText || question.card.character)}
                >
                  <Ionicons
                    name="speedometer-outline"
                    size={Layout.iconMd}
                    color={speakingSlow ? "#FFFFFF" : theme.blue}
                  />
                  <Text
                    style={[
                      styles.slowAudioBtnText,
                      { color: speakingSlow ? "#FFFFFF" : theme.blue },
                    ]}
                  >
                    0.5x Chậm
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.listeningHintText, { color: theme.textMuted }]}>
                Bấm loa lớn nghe chuẩn (1.0x) hoặc nút nghe chậm (0.5x)
              </Text>
            </View>
          ) : question.type === "hanzi_from_meaning" || question.type === "type_hanzi" ? (
            <View style={styles.targetCharContainer}>
              <Text style={[styles.targetMeaningText, { color: theme.textPrimary }]}>
                "{question.card.translation}"
              </Text>
              {question.subText ? (
                <Text style={[styles.targetSubText, { color: theme.textMuted }]}>
                  {question.subText}
                </Text>
              ) : null}
            </View>
          ) : question.type === "hanzi_from_pinyin" ? (
            <View style={styles.targetCharContainer}>
              <Text
                style={[
                  styles.targetPinyinBigText,
                  { color: getPinyinToneColor(question.card.pinyin) },
                ]}
              >
                {question.card.pinyin}
              </Text>
              {question.card.translation ? (
                <Text style={[styles.targetSubText, { color: theme.textMuted }]}>
                  Nghĩa: {question.card.translation}
                </Text>
              ) : null}
            </View>
          ) : (
            <View style={styles.targetCharContainer}>
              <Text style={[styles.targetCharText, { color: theme.textPrimary }]}>
                {question.card.character}
              </Text>
              {question.type === "pinyin_choice" ||
              question.type === "type_pinyin" ||
              question.type === "speaking_check" ? (
                <Text style={[styles.targetSubText, { color: theme.textMuted }]}>
                  {question.card.translation}
                </Text>
              ) : question.card.pinyin ? (
                <Text
                  style={[
                    styles.targetSubText,
                    { color: getPinyinToneColor(question.card.pinyin) },
                  ]}
                >
                  {question.card.pinyin}
                </Text>
              ) : null}
            </View>
          )}
        </Animated.View>

        {/* MODE 1: ACTIVE RECALL TYPING */}
        {activeMode === "typing" ? (
          <View style={[styles.typingSection, { width: cardWidth }]}>
            <TextInput
              style={[
                styles.typingInput,
                {
                  backgroundColor: theme.cardBg,
                  color: theme.textPrimary,
                  borderColor: isChecked
                    ? isCorrect
                      ? theme.green
                      : theme.red
                    : theme.blue,
                },
              ]}
              placeholder={question.inputPlaceholder || "Nhập Chữ Hán hoặc Pinyin..."}
              placeholderTextColor={theme.textMuted}
              value={typedText}
              onChangeText={setTypedText}
              editable={!isChecked}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSubmitTyped}
            />

            {/* Quick Tone Marks Helper Bar for Android Keyboards */}
            <View style={styles.toneBarWrapper}>
              <Text style={[styles.toneBarLabel, { color: theme.textMuted }]}>
                Chèn nhanh nguyên âm có dấu thanh (hoặc gõ số 1-4):
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="always"
                contentContainerStyle={styles.toneBarScroll}
              >
                {PINYIN_TONE_VOWELS.map((v) => (
                  <TouchableOpacity
                    key={v}
                    style={[styles.toneKeyBtn, { backgroundColor: theme.cardBg }]}
                    onPress={() => handleAppendToneVowel(v)}
                    disabled={isChecked}
                  >
                    <Text style={[styles.toneKeyText, { color: theme.blue }]}>{v}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <AppButton
              title="KIỂM TRA ĐÁP ÁN"
              variant="primary"
              size="lg"
              disabled={isChecked || !typedText.trim()}
              onPress={handleSubmitTyped}
              style={{ width: "100%", marginTop: Spacing.xs }}
            />

            {!isChecked && (
              <TouchableOpacity
                style={styles.switchModeBtn}
                onPress={handleSwitchToChoice}
                activeOpacity={0.7}
              >
                <Ionicons name="help-buoy-outline" size={16} color={theme.textMuted} />
                <Text style={[styles.switchModeText, { color: theme.textMuted }]}>
                  Gợi ý: Chuyển sang chọn 4 đáp án A/B/C/D
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : activeMode === "speaking" ? (
          /* MODE 2: SPEAKING CHECK */
          <View style={[styles.speakingSection, { width: cardWidth }]}>
            <View style={[styles.speakingCard, { backgroundColor: theme.cardBg }]}>
              <View style={styles.speakerHintRow}>
                <AudioButton
                  onPress={() => playTTS(question.card.character)}
                  isPlaying={speaking}
                  size="sm"
                />
                <Text style={[styles.speakerHintLabel, { color: theme.textMuted }]}>
                  Nghe mẫu ({question.card.pinyin})
                </Text>
              </View>

              <Animated.View style={{ transform: [{ scale: micPulseAnim }], marginVertical: Spacing.md }}>
                <TouchableOpacity
                  style={[
                    styles.micCircleBtn,
                    { backgroundColor: isRecording ? theme.red : analyzingSpeech ? theme.yellow : theme.green },
                  ]}
                  onPress={isRecording ? handleStopSpeaking : handleStartSpeaking}
                  disabled={isChecked || analyzingSpeech}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name={isRecording ? "stop" : analyzingSpeech ? "sparkles" : "mic"}
                    size={Layout.iconXl}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              </Animated.View>

              <Text style={[styles.micStatusText, { color: theme.textPrimary }]}>
                {isRecording
                  ? "Đang thu âm... Bấm lần nữa khi đọc xong"
                  : analyzingSpeech
                    ? "AI đang chấm phát âm..."
                    : "Chạm vào Micro và đọc to từ trên"}
              </Text>

              {spokenTranscript ? (
                <Text style={[styles.transcriptPreview, { color: theme.blue }]}>
                  AI nghe được: "{spokenTranscript}"
                </Text>
              ) : null}
            </View>

            {!isChecked && (
              <TouchableOpacity
                style={styles.switchModeBtn}
                onPress={handleSwitchToChoice}
                activeOpacity={0.7}
              >
                <Ionicons name="volume-mute-outline" size={16} color={theme.textMuted} />
                <Text style={[styles.switchModeText, { color: theme.textMuted }]}>
                  Không tiện nói lúc này (Chuyển sang Trắc nghiệm)
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          /* MODE 3: MULTIPLE CHOICE 4 OPTIONS */
          <View style={[styles.optionsGrid, { width: cardWidth }]}>
            {question.options.map((opt, idx) => {
              const isSelected = selectedIndex === idx;
              let cardBg = theme.cardBg;
              let letterBg = theme.bgSoft;
              let letterColor = theme.textMuted;

              if (isSelected) {
                cardBg = theme.blueDim;
                letterBg = theme.blue;
                letterColor = "#FFFFFF";
              }

              if (isChecked) {
                if (opt === question.correctAnswer) {
                  cardBg = theme.greenDim;
                  letterBg = theme.green;
                  letterColor = "#FFFFFF";
                } else if (isSelected && !isCorrect) {
                  cardBg = theme.redDim;
                  letterBg = theme.red;
                  letterColor = "#FFFFFF";
                }
              }

              return (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.8}
                  disabled={isChecked}
                  onPress={() => handleSelectOption(idx)}
                  style={[
                    styles.optionCard,
                    {
                      backgroundColor: cardBg,
                    },
                  ]}
                >
                  <View style={[styles.letterBox, { backgroundColor: letterBg }]}>
                    <Text style={[styles.letterText, { color: letterColor }]}>
                      {OPTION_LETTERS[idx]}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.optionText,
                      {
                        color:
                          isChecked && opt === question.correctAnswer
                            ? theme.green
                            : theme.textPrimary,
                      },
                    ]}
                    numberOfLines={2}
                  >
                    {opt}
                  </Text>

                  {isChecked && opt === question.correctAnswer && (
                    <Ionicons name="checkmark-circle" size={Layout.iconLg} color={theme.green} />
                  )}
                  {isChecked && isSelected && !isCorrect && (
                    <Ionicons name="close-circle" size={Layout.iconLg} color={theme.red} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Bottom Drawer Result: Comprehensive Deep Learning Flashcard */}
      {isChecked && (
        <Animated.View
          style={[
            styles.resultDrawer,
            {
              backgroundColor: theme.cardBg,
              transform: [{ translateY: drawerAnim }],
            },
          ]}
        >
          <ScrollView
            style={styles.drawerScroll}
            contentContainerStyle={styles.drawerScrollContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          >
            {/* Result Header Row */}
            <View style={styles.resultHeaderRow}>
              <View
                style={[
                  styles.resultIconWrap,
                  { backgroundColor: isCorrect ? theme.greenDim : theme.redDim },
                ]}
              >
                <Ionicons
                  name={isCorrect ? "checkmark-circle" : "close-circle"}
                  size={Layout.iconLg}
                  color={isCorrect ? theme.green : theme.red}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.resultTitleText, { color: isCorrect ? theme.green : theme.red }]}
                >
                  {isCorrect ? "CHÍNH XÁC! XUẤT SẮC!" : "RẤT TIẾC, CHƯA ĐÚNG!"}
                </Text>
                {!isCorrect && (
                  <Text style={[styles.correctAnswerLabelText, { color: theme.textMuted }]}>
                    Đáp án đúng:{" "}
                    <Text style={{ fontWeight: "800", color: theme.textPrimary }}>
                      {question.correctAnswer}
                    </Text>
                  </Text>
                )}
                {toneHint ? (
                  <Text style={[styles.correctAnswerLabelText, { color: theme.blue, fontWeight: "700" }]}>
                    💡 {toneHint}
                  </Text>
                ) : null}
                {fsrsEval && (
                  <View style={[styles.speedBadgeRow, { backgroundColor: theme.bgSoft }]}>
                    <Ionicons
                      name="timer-outline"
                      size={12}
                      color={isCorrect ? theme.green : theme.red}
                    />
                    <Text style={[styles.speedBadgeText, { color: theme.textPrimary }]}>
                      {(responseTimeMs / 1000).toFixed(1)}s • {fsrsEval.feedbackLabel}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Word Knowledge Card Box */}
            <View style={[styles.wordKnowledgeBox, { backgroundColor: theme.bgSoft }]}>
              <View style={styles.wordInfoRow}>
                <View style={{ flex: 1 }}>
                  <View style={styles.wordCharRow}>
                    <Text style={[styles.drawerHanziText, { color: theme.textPrimary }]}>
                      {question.card.character}
                    </Text>
                    {question.card.pinyin ? (
                      <Text
                        style={[
                          styles.drawerPinyinText,
                          { color: getPinyinToneColor(question.card.pinyin) },
                        ]}
                      >
                        {question.card.pinyin}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={[styles.drawerTranslationText, { color: theme.textPrimary }]}>
                    {question.card.translation}
                  </Text>
                </View>

                {/* Audio Button for Card Pronunciation */}
                <AudioButton
                  onPress={() => playTTS(question.card.character)}
                  isPlaying={speaking}
                  size="md"
                />
              </View>

              {/* Radical & Chiết tự Breakdown */}
              {question.card.radical ? (
                <View style={[styles.radicalBox, { backgroundColor: theme.cardBg }]}>
                  <Ionicons name="sparkles-outline" size={14} color={theme.blue} />
                  <Text style={[styles.radicalText, { color: theme.textMuted }]}>
                    {question.card.radical}
                  </Text>
                </View>
              ) : null}

              {/* Example Sentence Section */}
              {primaryExample ? (
                <View style={[styles.exampleBox, { backgroundColor: theme.cardBg }]}>
                  <View style={styles.exampleHeaderRow}>
                    <View style={styles.exampleTag}>
                      <Text style={[styles.exampleTagText, { color: theme.blue }]}>CÂU VÍ DỤ</Text>
                    </View>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => playSentenceTTS(primaryExample.chinese)}
                      style={[styles.miniAudioBtn, { backgroundColor: theme.blueDim }]}
                    >
                      <Ionicons
                        name={speakingSentence ? "volume-high" : "volume-medium-outline"}
                        size={14}
                        color={theme.blue}
                      />
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.exampleChineseText, { color: theme.textPrimary }]}>
                    {primaryExample.chinese}
                  </Text>
                  {primaryExample.pinyin ? (
                    <Text style={[styles.examplePinyinText, { color: theme.textMuted }]}>
                      {primaryExample.pinyin}
                    </Text>
                  ) : null}
                  <Text style={[styles.exampleVietnameseText, { color: theme.textMuted }]}>
                    "{primaryExample.vietnamese}"
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Action Continue Button */}
            <AppButton
              title="TIẾP THEO"
              variant={isCorrect ? "primary" : "error"}
              size="lg"
              onPress={handleContinue}
              style={{ marginTop: Spacing.md, width: "100%" }}
            />
          </ScrollView>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.pageMargin,
    paddingTop: Spacing.md,
    alignItems: "center",
  },
  timerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.cellPadding,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.full,
    marginBottom: Spacing.cellPadding,
  },
  timerTitle: {
    fontSize: Typography.caption1.fontSize,
    fontWeight: Typography.weight.extraBold,
  },
  timerBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
    borderRadius: Radii.sm,
  },
  timerText: {
    fontSize: Typography.caption.fontSize,
    fontWeight: Typography.weight.extraBold,
  },
  questionCard: {
    borderRadius: Radii.xl,
    padding: Spacing.xl,
    alignItems: "center",
    marginBottom: Spacing.md,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  questionPromptText: {
    fontSize: Typography.subhead.fontSize,
    fontWeight: Typography.weight.extraBold,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    textAlign: "center",
  },
  targetCharContainer: {
    alignItems: "center",
    marginTop: Spacing.cellPadding,
  },
  targetCharText: {
    fontSize: Typography.hanziCard?.fontSize || 44,
    fontWeight: Typography.weight.extraBold,
  },
  targetMeaningText: {
    fontSize: Typography.titleLG.fontSize,
    fontWeight: Typography.weight.extraBold,
    textAlign: "center",
  },
  targetPinyinBigText: {
    fontSize: Typography.title1?.fontSize || 32,
    fontWeight: Typography.weight.extraBold,
    textAlign: "center",
  },
  targetSubText: {
    fontSize: Typography.titleMD.fontSize,
    fontWeight: Typography.weight.bold,
    marginTop: Spacing.xs,
    textAlign: "center",
  },
  listeningContainer: {
    alignItems: "center",
    marginTop: Spacing.lg,
    gap: Spacing.cellPadding,
  },
  dualAudioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  slowAudioBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.full,
  },
  slowAudioBtnText: {
    fontSize: Typography.caption1.fontSize,
    fontWeight: Typography.weight.extraBold,
  },
  listeningHintText: {
    fontSize: Typography.caption.fontSize,
    fontWeight: Typography.weight.semibold,
    textAlign: "center",
  },
  clozeContainer: {
    alignItems: "center",
    marginTop: Spacing.lg,
  },
  clozeSentenceText: {
    fontSize: Typography.titleLG.fontSize,
    fontWeight: Typography.weight.extraBold,
    textAlign: "center",
    lineHeight: 30,
  },
  clozeTranslationText: {
    fontSize: Typography.subhead.fontSize,
    marginTop: Spacing.sm,
    fontWeight: Typography.weight.semibold,
    textAlign: "center",
  },
  typingSection: {
    gap: Spacing.sm,
  },
  typingInput: {
    borderWidth: 2,
    borderRadius: Radii.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: Typography.titleMD.fontSize,
    fontWeight: Typography.weight.bold,
    textAlign: "center",
  },
  toneBarWrapper: {
    marginTop: Spacing.xs,
  },
  toneBarLabel: {
    fontSize: Typography.caption2.fontSize,
    fontWeight: Typography.weight.semibold,
    marginBottom: Spacing.xs,
  },
  toneBarScroll: {
    gap: Spacing.xs,
    paddingVertical: 2,
  },
  toneKeyBtn: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  toneKeyText: {
    fontSize: Typography.callout.fontSize,
    fontWeight: Typography.weight.extraBold,
  },
  switchModeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.xs,
  },
  switchModeText: {
    fontSize: Typography.caption1.fontSize,
    fontWeight: Typography.weight.bold,
    textDecorationLine: "underline",
  },
  speakingSection: {
    gap: Spacing.sm,
  },
  speakingCard: {
    borderRadius: Radii.xl,
    padding: Spacing.lg,
    alignItems: "center",
  },
  speakerHintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  speakerHintLabel: {
    fontSize: Typography.caption1.fontSize,
    fontWeight: Typography.weight.bold,
  },
  micCircleBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },
  micStatusText: {
    fontSize: Typography.subhead.fontSize,
    fontWeight: Typography.weight.bold,
    textAlign: "center",
  },
  transcriptPreview: {
    fontSize: Typography.caption.fontSize,
    fontWeight: Typography.weight.bold,
    marginTop: Spacing.xs,
  },
  optionsGrid: {
    gap: Spacing.cellPadding,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Radii.lg,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  letterBox: {
    width: Layout.avatarSm,
    height: Layout.avatarSm,
    borderRadius: Radii.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  letterText: {
    fontSize: Typography.subhead.fontSize,
    fontWeight: Typography.weight.extraBold,
    color: "#FFFFFF",
  },
  optionText: {
    fontSize: Typography.bodyMD.fontSize,
    fontWeight: Typography.weight.bold,
    flex: 1,
  },
  resultDrawer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: "75%",
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
  },
  drawerScroll: {
    flexGrow: 0,
  },
  drawerScrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  resultHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.cellPadding,
    marginBottom: Spacing.sm,
  },
  resultIconWrap: {
    width: Layout.avatarMd,
    height: Layout.avatarMd,
    borderRadius: Radii.full,
    alignItems: "center",
    justifyContent: "center",
  },
  resultTitleText: {
    fontSize: Typography.titleMD.fontSize,
    fontWeight: Typography.weight.extraBold,
  },
  correctAnswerLabelText: {
    fontSize: Typography.caption.fontSize,
    marginTop: 2,
  },
  speedBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radii.sm,
    marginTop: Spacing.xs,
  },
  speedBadgeText: {
    fontSize: Typography.caption2.fontSize,
    fontWeight: Typography.weight.bold,
  },
  wordKnowledgeBox: {
    borderRadius: Radii.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    width: "100%",
    alignSelf: "stretch",
    marginTop: Spacing.xs,
  },
  wordInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  wordCharRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: Spacing.sm,
  },
  drawerHanziText: {
    fontSize: Typography.titleXL?.fontSize || 24,
    fontWeight: Typography.weight.extraBold,
  },
  drawerPinyinText: {
    fontSize: Typography.titleMD.fontSize,
    fontWeight: Typography.weight.bold,
  },
  drawerTranslationText: {
    fontSize: Typography.bodyMD.fontSize,
    fontWeight: Typography.weight.bold,
    marginTop: 2,
  },
  radicalBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radii.md,
  },
  radicalText: {
    fontSize: Typography.caption.fontSize,
    fontWeight: Typography.weight.semibold,
    flex: 1,
    lineHeight: 16,
  },
  exampleBox: {
    borderRadius: Radii.md,
    padding: Spacing.sm,
    gap: 2,
  },
  exampleHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  exampleTag: {
    alignSelf: "flex-start",
  },
  exampleTagText: {
    fontSize: Typography.caption2.fontSize,
    fontWeight: Typography.weight.extraBold,
    letterSpacing: 0.5,
  },
  miniAudioBtn: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  exampleChineseText: {
    fontSize: Typography.bodyMD.fontSize,
    fontWeight: Typography.weight.bold,
    lineHeight: 20,
  },
  examplePinyinText: {
    fontSize: Typography.caption.fontSize,
    fontWeight: Typography.weight.semibold,
  },
  exampleVietnameseText: {
    fontSize: Typography.caption.fontSize,
    fontStyle: "italic",
    marginTop: 2,
  },
});
