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
import {
  Spacing,
  Radii,
  Typography,
  Layout,
  triggerHaptic,
} from "../../constants/theme";
import { APP_CONFIG } from "../../constants/config";
import { useTheme } from "../../hooks/useTheme";
import { AppButton } from "../ui/AppButton";
import { AudioButton } from "../ui/AudioButton";
import { ProgressBar } from "../ui/ProgressBar";
import { getPinyinToneColor } from "../../lib/pinyinColor";
import {
  PINYIN_TONE_VOWELS,
  normalizePinyinWithTones,
  stripPinyinTones,
} from "../../lib/quizGenerator";
import { selectCardsByFSRSPriority } from "../../lib/srs";
import { recordReviewToday } from "../../lib/reviewTracker";
import { awardArcadeXP, ARCADE_XP_REWARDS } from "../../lib/arcadeScoring";

export interface ListeningDictationModalProps {
  visible: boolean;
  onClose: () => void;
  cards: Card[];
}

type DictationMode = "word" | "sentence";

export function ListeningDictationModal({
  visible,
  onClose,
  cards,
}: ListeningDictationModalProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [mode, setMode] = useState<DictationMode>("word");
  const [queue, setQueue] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [toneFeedback, setToneFeedback] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [speakingSlow, setSpeakingSlow] = useState(false);

  const playAudio = useCallback((text: string, slow = false) => {
    if (!text) return;
    Speech.stop();
    if (slow) {
      setSpeaking(false);
      setSpeakingSlow(true);
      Speech.speak(text, {
        language: "zh-CN",
        rate: 0.5,
        onDone: () => setSpeakingSlow(false),
        onError: () => setSpeakingSlow(false),
      });
    } else {
      setSpeakingSlow(false);
      setSpeaking(true);
      Speech.speak(text, {
        language: "zh-CN",
        rate: APP_CONFIG.SPEECH_RATE,
        onDone: () => setSpeaking(false),
        onError: () => setSpeaking(false),
      });
    }
  }, []);

  const initSession = useCallback(
    (targetMode: DictationMode) => {
      const pool =
        targetMode === "sentence"
          ? cards.filter((c) => c.examples && c.examples.length > 0 && c.examples[0].chinese)
          : cards;
      const source = pool.length > 0 ? pool : cards;
      const selected = selectCardsByFSRSPriority(source, 8);
      setQueue(selected);
      setCurrentIndex(0);
      setTypedText("");
      setShowHint(false);
      setIsChecked(false);
      setIsCorrect(false);
      setToneFeedback(null);
      setCorrectCount(0);
      setIsDone(false);

      if (selected.length > 0) {
        const first = selected[0];
        const firstAudio =
          targetMode === "sentence" && first.examples?.[0]?.chinese
            ? first.examples[0].chinese
            : first.character;
        setTimeout(() => playAudio(firstAudio, false), 250);
      }
    },
    [cards, playAudio],
  );

  useEffect(() => {
    if (visible && cards.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      initSession(mode);
    }
    return () => {
      Speech.stop();
    };
  }, [visible, cards, mode, initSession]);

  if (!visible) return null;

  const currentCard = queue[currentIndex];
  const isSentence =
    mode === "sentence" &&
    currentCard?.examples &&
    currentCard.examples.length > 0 &&
    Boolean(currentCard.examples[0].chinese);

  const targetHanzi =
    isSentence && currentCard ? currentCard.examples![0].chinese : currentCard?.character || "";
  const targetPinyin =
    isSentence && currentCard
      ? currentCard.examples![0].pinyin || currentCard.pinyin
      : currentCard?.pinyin || "";
  const targetMeaning =
    isSentence && currentCard
      ? currentCard.examples![0].vietnamese
      : currentCard?.translation || "";

  const progress = queue.length > 0 ? (currentIndex + 1) / queue.length : 0;

  const handleCheck = () => {
    if (isChecked || !typedText.trim() || !currentCard) return;
    Keyboard.dismiss();

    const cleanUser = typedText
      .trim()
      .replace(/[.,/#!$%^&*;:{}=\-_`~()!?！。，？"'\s]/g, "")
      .toLowerCase();
    const cleanTargetHanzi = targetHanzi
      .trim()
      .replace(/[.,/#!$%^&*;:{}=\-_`~()!?！。，？"'\s]/g, "")
      .toLowerCase();

    let matched = false;
    let hintMsg: string | null = null;

    if (cleanTargetHanzi && cleanUser === cleanTargetHanzi) {
      matched = true;
    } else if (targetPinyin) {
      const userTone = normalizePinyinWithTones(typedText);
      const targetTone = normalizePinyinWithTones(targetPinyin);
      if (userTone && userTone === targetTone) {
        matched = true;
      } else {
        const userBase = stripPinyinTones(typedText);
        const targetBase = stripPinyinTones(targetPinyin);
        if (userBase && userBase === targetBase) {
          matched = true;
          hintMsg = `Đúng âm tiết! Chú ý thanh điệu chuẩn: ${targetPinyin}`;
        }
      }
    }

    setIsCorrect(matched);
    setToneFeedback(hintMsg);
    setIsChecked(true);
    recordReviewToday();

    if (matched) {
      triggerHaptic("success");
      setCorrectCount((c) => c + 1);
      awardArcadeXP(ARCADE_XP_REWARDS.SENTENCE_BUILDER_BASE);
    } else {
      triggerHaptic("error");
    }
  };

  const handleNext = () => {
    triggerHaptic("selection");
    if (currentIndex + 1 < queue.length) {
      const nextIdx = currentIndex + 1;
      const nextCard = queue[nextIdx];
      setCurrentIndex(nextIdx);
      setTypedText("");
      setShowHint(false);
      setIsChecked(false);
      setIsCorrect(false);
      setToneFeedback(null);

      const nextAudio =
        mode === "sentence" && nextCard.examples?.[0]?.chinese
          ? nextCard.examples[0].chinese
          : nextCard.character;
      playAudio(nextAudio, false);
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
              NGHE CHÉP CHÍNH TẢ
            </Text>
            <Text style={[styles.headerSub, { color: theme.purple }]}>
              Luyện tai nghe & gõ chuẩn Hán tự / Pinyin
            </Text>
          </View>

          <View style={{ width: Layout.avatarMd }} />
        </View>

        {/* Mode Selector Chips */}
        <View style={styles.modeChipsRow}>
          <TouchableOpacity
            style={[
              styles.modeChip,
              { backgroundColor: mode === "word" ? theme.purple : theme.bgSoft },
            ]}
            onPress={() => {
              triggerHaptic("selection");
              setMode("word");
            }}
          >
            <Ionicons
              name="ear-outline"
              size={15}
              color={mode === "word" ? "#FFFFFF" : theme.textMuted}
            />
            <Text
              style={[
                styles.modeChipText,
                { color: mode === "word" ? "#FFFFFF" : theme.textPrimary },
              ]}
            >
              Nghe Từ Vựng
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeChip,
              { backgroundColor: mode === "sentence" ? theme.purple : theme.bgSoft },
            ]}
            onPress={() => {
              triggerHaptic("selection");
              setMode("sentence");
            }}
          >
            <Ionicons
              name="chatbox-ellipses-outline"
              size={15}
              color={mode === "sentence" ? "#FFFFFF" : theme.textMuted}
            />
            <Text
              style={[
                styles.modeChipText,
                { color: mode === "sentence" ? "#FFFFFF" : theme.textPrimary },
              ]}
            >
              Nghe Cả Câu
            </Text>
          </TouchableOpacity>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={{ flex: 1 }}>
            <ProgressBar progress={progress} height={Spacing.sm} fillColor={theme.purple} />
          </View>
          <Text style={[styles.progressText, { color: theme.textMuted }]}>
            {queue.length > 0 ? `${currentIndex + 1}/${queue.length}` : "0/0"}
          </Text>
        </View>

        {isDone ? (
          <View style={styles.doneContainer}>
            <View style={[styles.doneIconCircle, { backgroundColor: theme.purpleDim }]}>
              <Ionicons name="headset" size={Layout.fabSize} color={theme.purple} />
            </View>
            <Text style={[styles.doneTitle, { color: theme.textPrimary }]}>
              HOÀN THÀNH NGHE CHÉP CHÍNH TẢ!
            </Text>
            <Text style={[styles.doneSub, { color: theme.textMuted }]}>
              Bạn đã nghe và gõ đúng {correctCount}/{queue.length} câu. Kỹ năng phản xạ nghe của bạn đang tiến bộ vượt bậc!
            </Text>
            <AppButton
              title="LUYỆN LẠI LƯỢT MỚI"
              variant="primary"
              size="lg"
              onPress={() => initSession(mode)}
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
        ) : currentCard ? (
          <ScrollView
            contentContainerStyle={styles.scrollBody}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Audio Prompt Card */}
            <View style={[styles.promptCard, { backgroundColor: theme.cardBg }]}>
              <Text style={[styles.instructionText, { color: theme.textMuted }]}>
                {isSentence
                  ? "Nghe câu ví dụ và gõ lại bằng Chữ Hán hoặc Pinyin:"
                  : "Nghe từ vựng và gõ lại bằng Chữ Hán hoặc Pinyin:"}
              </Text>

              <View style={styles.audioRow}>
                <AudioButton
                  onPress={() => playAudio(targetHanzi, false)}
                  isPlaying={speaking}
                  size="lg"
                />
                <TouchableOpacity
                  style={[
                    styles.slowBtn,
                    { backgroundColor: speakingSlow ? theme.purple : theme.purpleDim },
                  ]}
                  onPress={() => playAudio(targetHanzi, true)}
                >
                  <Ionicons
                    name="speedometer-outline"
                    size={Layout.iconMd}
                    color={speakingSlow ? "#FFFFFF" : theme.purple}
                  />
                  <Text
                    style={[
                      styles.slowBtnText,
                      { color: speakingSlow ? "#FFFFFF" : theme.purple },
                    ]}
                  >
                    0.5x Chậm
                  </Text>
                </TouchableOpacity>
              </View>

              {showHint ? (
                <View style={[styles.hintBox, { backgroundColor: theme.bgSoft }]}>
                  <Text style={[styles.hintText, { color: theme.textPrimary }]}>
                    Gợi ý nghĩa: "{targetMeaning}" ({targetHanzi.length} ký tự)
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.hintToggleBtn}
                  onPress={() => {
                    triggerHaptic("selection");
                    setShowHint(true);
                  }}
                >
                  <Ionicons name="bulb-outline" size={16} color={theme.purple} />
                  <Text style={[styles.hintToggleText, { color: theme.purple }]}>
                    Xem gợi ý nghĩa Tiếng Việt
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Input Box */}
            <TextInput
              style={[
                styles.inputBox,
                {
                  backgroundColor: theme.cardBg,
                  color: theme.textPrimary,
                  borderColor: isChecked
                    ? isCorrect
                      ? theme.green
                      : theme.red
                    : theme.purple,
                },
              ]}
              placeholder="Gõ Chữ Hán hoặc Pinyin bạn nghe được..."
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
                  <Text style={[styles.toneKeyText, { color: theme.purple }]}>{v}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {!isChecked ? (
              <AppButton
                title="KIỂM TRA CHÍNH TẢ"
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
                    {isCorrect ? "CHÍNH XÁC!" : "CHƯA CHÍNH XÁC"}
                  </Text>
                </View>

                {toneFeedback ? (
                  <Text style={[styles.toneHintText, { color: theme.blue }]}>
                    💡 {toneFeedback}
                  </Text>
                ) : null}

                <View style={[styles.answerDetailBox, { backgroundColor: theme.bgSoft }]}>
                  <Text style={[styles.answerHanzi, { color: theme.textPrimary }]}>
                    {targetHanzi}
                  </Text>
                  <Text
                    style={[styles.answerPinyin, { color: getPinyinToneColor(targetPinyin) }]}
                  >
                    {targetPinyin}
                  </Text>
                  <Text style={[styles.answerMeaning, { color: theme.textMuted }]}>
                    Nghĩa: {targetMeaning}
                  </Text>
                </View>

                <AppButton
                  title="CÂU TIẾP THEO"
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
  modeChipsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.pageMargin,
    marginBottom: Spacing.sm,
  },
  modeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
  instructionText: {
    fontSize: Typography.subhead.fontSize,
    fontWeight: Typography.weight.bold,
    textAlign: "center",
  },
  audioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginVertical: Spacing.xs,
  },
  slowBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.full,
  },
  slowBtnText: {
    fontSize: Typography.caption1.fontSize,
    fontWeight: Typography.weight.extraBold,
  },
  hintToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  hintToggleText: {
    fontSize: Typography.caption1.fontSize,
    fontWeight: Typography.weight.bold,
  },
  hintBox: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  hintText: {
    fontSize: Typography.caption.fontSize,
    fontWeight: Typography.weight.bold,
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

