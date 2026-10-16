import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Speech from "expo-speech";
import { Card } from "../../store/slices/types";
import { Spacing, Radii, Typography, Layout, triggerHaptic } from "../../constants/theme";
import { APP_CONFIG } from "../../constants/config";
import { useTheme } from "../../hooks/useTheme";
import { AppButton } from "../ui/AppButton";
import { AudioButton } from "../ui/AudioButton";
import { ProgressBar } from "../ui/ProgressBar";
import { getPinyinToneColor } from "../../lib/pinyinColor";
import {
  PINYIN_TONE_VOWELS,
  generateQuizQuestion,
  evaluateTypedAnswer,
  QuizQuestion,
} from "../../lib/quizGenerator";
import { selectCardsByFSRSPriority } from "../../lib/srs";
import { recordReviewToday } from "../../lib/reviewTracker";
import { awardArcadeXP, ARCADE_XP_REWARDS } from "../../lib/arcadeScoring";

export interface TypingRecallModalProps {
  visible: boolean;
  onClose: () => void;
  cards: Card[];
}

type RecallDrillMode = "mixed" | "type_pinyin" | "type_hanzi" | "cloze_typing";

const DRILL_MODES: {
  key: RecallDrillMode;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: "mixed", label: "Tổng Hợp", icon: "shuffle" },
  { key: "type_pinyin", label: "Gõ Pinyin", icon: "text-outline" },
  { key: "type_hanzi", label: "Nghĩa ➔ Từ", icon: "language-outline" },
  { key: "cloze_typing", label: "Điền Khuyết", icon: "document-text-outline" },
];

export function TypingRecallModal({ visible, onClose, cards }: TypingRecallModalProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [drillMode, setDrillMode] = useState<RecallDrillMode>("mixed");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [isChecked, setIsChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [toneHint, setToneHint] = useState<string | null>(null);
  const [combo, setCombo] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const playTTS = useCallback((text: string) => {
    if (!text) return;
    Speech.stop();
    setSpeaking(true);
    Speech.speak(text, {
      language: "zh-CN",
      rate: APP_CONFIG.SPEECH_RATE,
      onDone: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  }, []);

  const buildDrillQuestions = useCallback(
    (selectedMode: RecallDrillMode) => {
      const pool =
        selectedMode === "cloze_typing"
          ? cards.filter((c) => c.examples && c.examples.length > 0 && c.examples[0].chinese)
          : cards;
      const source = pool.length > 0 ? pool : cards;
      const picked = selectCardsByFSRSPriority(source, 8);

      const typingTypes = ["type_pinyin", "type_hanzi", "cloze_typing"] as const;
      const generated = picked.map((card, idx) => {
        const hasEx = Boolean(
          card.examples && card.examples.length > 0 && card.examples[0].chinese,
        );
        let qType = selectedMode === "mixed" ? typingTypes[idx % typingTypes.length] : selectedMode;
        if (qType === "cloze_typing" && !hasEx) {
          qType = "type_hanzi";
        }
        return generateQuizQuestion(card, cards, qType);
      });

      setQuestions(generated);
      setCurrentIndex(0);
      setTypedText("");
      setIsChecked(false);
      setIsCorrect(false);
      setToneHint(null);
      setCombo(0);
      setCorrectCount(0);
      setIsDone(false);
    },
    [cards],
  );

  useEffect(() => {
    if (visible && cards.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      buildDrillQuestions(drillMode);
    }
    return () => {
      Speech.stop();
    };
  }, [visible, cards, drillMode, buildDrillQuestions]);

  if (!visible) return null;

  const currentQuestion = questions[currentIndex];
  const progress = questions.length > 0 ? (currentIndex + 1) / questions.length : 0;

  const handleCheck = () => {
    if (isChecked || !typedText.trim() || !currentQuestion) return;
    Keyboard.dismiss();

    const evalRes = evaluateTypedAnswer(typedText, currentQuestion);
    setIsCorrect(evalRes.isCorrect);
    setToneHint(evalRes.toneHint || null);
    setIsChecked(true);
    recordReviewToday();

    if (evalRes.isCorrect) {
      triggerHaptic("success");
      setCombo((c) => c + 1);
      setCorrectCount((c) => c + 1);
      awardArcadeXP(ARCADE_XP_REWARDS.SENTENCE_BUILDER_BASE);
      playTTS(currentQuestion.card.character);
    } else {
      triggerHaptic("error");
      setCombo(0);
    }
  };

  const handleNext = () => {
    triggerHaptic("selection");
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((i) => i + 1);
      setTypedText("");
      setIsChecked(false);
      setIsCorrect(false);
      setToneHint(null);
    } else {
      setIsDone(true);
    }
  };

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
              Speech.stop();
              triggerHaptic("selection");
              onClose();
            }}
          >
            <Ionicons name="close" size={Layout.iconLg} color={theme.textMuted} />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
              THỬ THÁCH TỰ GÕ TỪ
            </Text>
            <Text style={[styles.headerSub, { color: theme.blue }]}>
              Nhớ chủ động 100% không cần gợi ý A/B/C/D
            </Text>
          </View>

          <View style={[styles.comboBadge, { backgroundColor: theme.yellowDim }]}>
            <Ionicons name="flame" size={14} color={theme.yellow} />
            <Text style={[styles.comboText, { color: theme.yellow }]}>{combo}x</Text>
          </View>
        </View>

        {/* Mode Selector Chips */}
        <View style={styles.modeChipsRow}>
          {DRILL_MODES.map((m) => {
            const isSelected = drillMode === m.key;
            return (
              <TouchableOpacity
                key={m.key}
                style={[
                  styles.modeChip,
                  { backgroundColor: isSelected ? theme.blue : theme.bgSoft },
                ]}
                onPress={() => {
                  triggerHaptic("selection");
                  setDrillMode(m.key);
                }}
              >
                <Ionicons
                  name={m.icon}
                  size={14}
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
            <ProgressBar progress={progress} height={Spacing.sm} fillColor={theme.blue} />
          </View>
          <Text style={[styles.progressText, { color: theme.textMuted }]}>
            {questions.length > 0 ? `${currentIndex + 1}/${questions.length}` : "0/0"}
          </Text>
        </View>

        {isDone ? (
          <View style={styles.doneContainer}>
            <View style={[styles.doneIconCircle, { backgroundColor: theme.blueDim }]}>
              <Ionicons name="keypad" size={Layout.fabSize} color={theme.blue} />
            </View>
            <Text style={[styles.doneTitle, { color: theme.textPrimary }]}>
              HOÀN THÀNH THỬ THÁCH GÕ TỪ!
            </Text>
            <Text style={[styles.doneSub, { color: theme.textMuted }]}>
              Bạn đã tự nhớ và gõ chính xác {correctCount}/{questions.length} từ vựng mà không cần
              nhìn đáp án trắc nghiệm!
            </Text>
            <AppButton
              title="LUYỆN LẠI LƯỢT MỚI"
              variant="primary"
              size="lg"
              onPress={() => buildDrillQuestions(drillMode)}
              style={{ marginTop: Spacing.xl, width: "100%" }}
            />
            <AppButton
              title="ĐÓNG"
              variant="secondary"
              size="md"
              onPress={onClose}
              style={{ marginTop: Spacing.sm, width: "100%" }}
            />
          </View>
        ) : currentQuestion ? (
          <ScrollView
            contentContainerStyle={styles.scrollBody}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Question Card */}
            <View style={[styles.promptCard, { backgroundColor: theme.cardBg }]}>
              <Text style={[styles.promptLabel, { color: theme.textMuted }]}>
                {currentQuestion.prompt}
              </Text>

              {currentQuestion.type === "cloze_typing" ? (
                <View style={{ alignItems: "center", gap: Spacing.xs }}>
                  <Text style={[styles.clozeSentence, { color: theme.textPrimary }]}>
                    {currentQuestion.clozeSentence}
                  </Text>
                  {currentQuestion.clozeTranslation ? (
                    <Text style={[styles.subLabel, { color: theme.textMuted }]}>
                      "{currentQuestion.clozeTranslation}"
                    </Text>
                  ) : null}
                </View>
              ) : currentQuestion.type === "type_hanzi" ? (
                <View style={{ alignItems: "center", gap: Spacing.xs }}>
                  <Text style={[styles.meaningTarget, { color: theme.textPrimary }]}>
                    "{currentQuestion.card.translation}"
                  </Text>
                  {currentQuestion.subText ? (
                    <Text style={[styles.subLabel, { color: theme.textMuted }]}>
                      {currentQuestion.subText}
                    </Text>
                  ) : null}
                </View>
              ) : (
                <View style={{ alignItems: "center", gap: Spacing.xs }}>
                  <Text style={[styles.hanziTarget, { color: theme.textPrimary }]}>
                    {currentQuestion.card.character}
                  </Text>
                  <Text style={[styles.subLabel, { color: theme.textMuted }]}>
                    Nghĩa: {currentQuestion.card.translation}
                  </Text>
                </View>
              )}
            </View>

            {/* Input Field */}
            <TextInput
              style={[
                styles.inputBox,
                {
                  backgroundColor: theme.cardBg,
                  color: theme.textPrimary,
                  borderColor: isChecked ? (isCorrect ? theme.green : theme.red) : theme.blue,
                },
              ]}
              placeholder={currentQuestion.inputPlaceholder || "Nhập Chữ Hán hoặc Pinyin..."}
              placeholderTextColor={theme.textMuted}
              value={typedText}
              onChangeText={setTypedText}
              editable={!isChecked}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleCheck}
            />

            {/* Tone Helper Bar */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="always"
              contentContainerStyle={styles.toneScroll}
            >
              {PINYIN_TONE_VOWELS.map((v) => (
                <TouchableOpacity
                  key={v}
                  style={[styles.toneKey, { backgroundColor: theme.cardBg }]}
                  disabled={isChecked}
                  onPress={() => {
                    triggerHaptic("selection");
                    setTypedText((prev) => prev + v);
                  }}
                >
                  <Text style={[styles.toneKeyText, { color: theme.blue }]}>{v}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {!isChecked ? (
              <AppButton
                title="KIỂM TRA ĐÁP ÁN"
                variant="primary"
                size="lg"
                disabled={!typedText.trim()}
                onPress={handleCheck}
                style={{ width: "100%", marginTop: Spacing.sm }}
              />
            ) : (
              <View style={[styles.resultCard, { backgroundColor: theme.cardBg }]}>
                <View style={styles.resultTopRow}>
                  <Ionicons
                    name={isCorrect ? "checkmark-circle" : "close-circle"}
                    size={Layout.iconLg}
                    color={isCorrect ? theme.green : theme.red}
                  />
                  <Text
                    style={[
                      styles.resultStatusTitle,
                      { color: isCorrect ? theme.green : theme.red },
                    ]}
                  >
                    {isCorrect ? "CHÍNH XÁC!" : "CHƯA ĐÚNG"}
                  </Text>
                </View>

                {toneHint ? (
                  <Text style={[styles.toneHintText, { color: theme.blue }]}>💡 {toneHint}</Text>
                ) : null}

                <View style={[styles.answerDetailBox, { backgroundColor: theme.bgSoft }]}>
                  <View style={styles.answerHeaderRow}>
                    <Text style={[styles.answerHanzi, { color: theme.textPrimary }]}>
                      {currentQuestion.card.character}
                    </Text>
                    <AudioButton
                      onPress={() => playTTS(currentQuestion.card.character)}
                      isPlaying={speaking}
                      size="sm"
                    />
                  </View>
                  <Text
                    style={[
                      styles.answerPinyin,
                      { color: getPinyinToneColor(currentQuestion.card.pinyin) },
                    ]}
                  >
                    {currentQuestion.card.pinyin}
                  </Text>
                  <Text style={[styles.answerMeaning, { color: theme.textMuted }]}>
                    {currentQuestion.card.translation}
                  </Text>
                </View>

                <AppButton
                  title="TỪ TIẾP THEO"
                  variant={isCorrect ? "primary" : "error"}
                  size="lg"
                  onPress={handleNext}
                  style={{ width: "100%", marginTop: Spacing.md }}
                />
              </View>
            )}
          </ScrollView>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.pageMargin,
    paddingBottom: Spacing.cellPadding,
  },
  closeBtn: { padding: Spacing.sm },
  headerTitleContainer: { alignItems: "center" },
  headerTitle: {
    fontSize: Typography.callout.fontSize,
    fontWeight: Typography.weight.extraBold,
  },
  headerSub: {
    fontSize: Typography.caption1.fontSize,
    marginTop: 2,
    fontWeight: Typography.weight.bold,
  },
  comboBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.full,
  },
  comboText: {
    fontSize: Typography.caption1.fontSize,
    fontWeight: Typography.weight.extraBold,
  },
  modeChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.pageMargin,
    marginBottom: Spacing.sm,
  },
  modeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radii.full,
  },
  modeChipText: {
    fontSize: Typography.caption2.fontSize,
    fontWeight: Typography.weight.extraBold,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.cellPadding,
    paddingHorizontal: Spacing.pageMargin,
    marginBottom: Spacing.md,
  },
  progressText: {
    fontSize: Typography.caption1.fontSize,
    fontWeight: Typography.weight.extraBold,
  },
  scrollBody: {
    paddingHorizontal: Spacing.pageMargin,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  promptCard: {
    borderRadius: Radii.xl,
    padding: Spacing.xl,
    alignItems: "center",
    gap: Spacing.md,
  },
  promptLabel: {
    fontSize: Typography.caption.fontSize,
    fontWeight: Typography.weight.extraBold,
    textTransform: "uppercase",
    textAlign: "center",
  },
  hanziTarget: {
    fontSize: Typography.hanziCard.fontSize,
    fontWeight: Typography.weight.extraBold,
  },
  meaningTarget: {
    fontSize: Typography.title2.fontSize,
    fontWeight: Typography.weight.extraBold,
    textAlign: "center",
  },
  clozeSentence: {
    fontSize: Typography.titleLG.fontSize,
    fontWeight: Typography.weight.extraBold,
    textAlign: "center",
    lineHeight: 30,
  },
  subLabel: {
    fontSize: Typography.subhead.fontSize,
    fontWeight: Typography.weight.semibold,
    textAlign: "center",
  },
  inputBox: {
    borderWidth: 2,
    borderRadius: Radii.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: Typography.titleMD.fontSize,
    fontWeight: Typography.weight.bold,
    textAlign: "center",
  },
  toneScroll: {
    gap: Spacing.xs,
    paddingVertical: 2,
  },
  toneKey: {
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
  resultCard: {
    borderRadius: Radii.xl,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  resultTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  resultStatusTitle: {
    fontSize: Typography.titleMD.fontSize,
    fontWeight: Typography.weight.extraBold,
  },
  toneHintText: {
    fontSize: Typography.caption.fontSize,
    fontWeight: Typography.weight.bold,
  },
  answerDetailBox: {
    borderRadius: Radii.lg,
    padding: Spacing.md,
    alignItems: "center",
    gap: 4,
  },
  answerHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  answerHanzi: {
    fontSize: Typography.title1.fontSize,
    fontWeight: Typography.weight.extraBold,
  },
  answerPinyin: {
    fontSize: Typography.titleMD.fontSize,
    fontWeight: Typography.weight.bold,
  },
  answerMeaning: {
    fontSize: Typography.subhead.fontSize,
    fontWeight: Typography.weight.semibold,
    textAlign: "center",
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
