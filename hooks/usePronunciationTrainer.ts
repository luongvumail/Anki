import { useState, useEffect, useRef, useCallback } from "react";
import { Animated } from "react-native";
import * as Speech from "expo-speech";
import * as FileSystem from "expo-file-system/legacy";
import {
  useAudioRecorder,
  useAudioPlayer,
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
} from "expo-audio";
import { Card } from "../store/slices/types";
import { triggerHaptic } from "../constants/theme";
import { APP_CONFIG } from "../constants/config";
import { awardArcadeXP, ARCADE_XP_REWARDS } from "../lib/arcadeScoring";
import { selectCardsByFSRSPriority } from "../lib/srs";
import { evaluateChineseSpeechAudio } from "../lib/gemini";
import { recordReviewToday } from "../lib/reviewTracker";

function stripDiacritics(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function getToneTip(pinyin?: string): string {
  if (!pinyin) return "Đọc rõ ràng từng âm tiết và giữ khẩu hình mở chuẩn.";
  const lower = pinyin.toLowerCase();
  if (/[āēīōūǖ]/.test(lower)) {
    return "Thanh 1 (ngang): Giữ cao độ giọng kéo dài và ổn định, không hạ giọng.";
  }
  if (/[áéíóúǘ]/.test(lower)) {
    return "Thanh 2 (dấu sắc): Đọc vút giọng từ trung bình lên cao (giống khi thắc mắc 'Hả?').";
  }
  if (/[ǎěǐǒǔǚ]/.test(lower)) {
    return "Thanh 3 (dấu hỏi): Hạ giọng xuống thấp nhất rồi hơi vút nhẹ lên.";
  }
  if (/[àèìòùǜ]/.test(lower)) {
    return "Thanh 4 (dấu huyền nghiêng): Dứt khoát hạ giọng từ cao xuống thấp (như ra lệnh).";
  }
  return "Chú ý giữ chuẩn thanh điệu và bật hơi rõ ràng.";
}

export type PronunciationTrainerMode = "word_guided" | "word_blind" | "sentence_shadowing";

export function usePronunciationTrainer(visible: boolean, cards: Card[]) {
  const [trainerMode, setTrainerMode] = useState<PronunciationTrainerMode>("word_guided");
  const [pinyinRevealed, setPinyinRevealed] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shuffledCards, setShuffledCards] = useState<Card[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [pronunciationTip, setPronunciationTip] = useState<string | null>(null);
  const [recognizedText, setRecognizedText] = useState<string>("");
  const [isDone, setIsDone] = useState(false);
  const [userAudioUri, setUserAudioUri] = useState<string | null>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const drawerAnim = useRef(new Animated.Value(300)).current;

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const userAudioPlayer = useAudioPlayer(userAudioUri);

  const resetState = useCallback(() => {
    setScore(null);
    setFeedback(null);
    setErrorDetail(null);
    setPronunciationTip(null);
    setRecognizedText("");
    setIsRecording(false);
    setAnalyzing(false);
    setUserAudioUri(null);
    setPinyinRevealed(false);
    drawerAnim.setValue(300);
  }, [drawerAnim]);

  const buildDeckForMode = useCallback(
    (mode: PronunciationTrainerMode) => {
      const pool =
        mode === "sentence_shadowing"
          ? cards.filter((c) => c.examples && c.examples.length > 0 && c.examples[0].chinese)
          : cards;
      const source = pool.length > 0 ? pool : cards;
      const list = selectCardsByFSRSPriority(source, 5);
      setShuffledCards(list);
      setCurrentIndex(0);
      setIsDone(false);
      resetState();
    },
    [cards, resetState],
  );

  const changeTrainerMode = useCallback(
    (mode: PronunciationTrainerMode) => {
      setTrainerMode(mode);
      buildDeckForMode(mode);
    },
    [buildDeckForMode],
  );

  const prevVisibleRef = useRef(false);

  useEffect(() => {
    if (visible && !prevVisibleRef.current && cards.length > 0) {
      buildDeckForMode(trainerMode);
    }
    prevVisibleRef.current = visible;
  }, [visible, cards, trainerMode, buildDeckForMode]);

  useEffect(() => {
    if (!visible) {
      try {
        audioRecorder.stop();
      } catch {
        // ignore if not recording
      }
    }
  }, [visible, audioRecorder]);

  // Pulse animation for recording
  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (isRecording) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      );
      animation.start();
    } else {
      pulseAnim.setValue(1);
    }
    return () => {
      if (animation) animation.stop();
    };
  }, [isRecording, pulseAnim]);

  const playTTS = useCallback((text: string) => {
    if (!text) return;
    setSpeaking(true);
    Speech.stop();
    Speech.speak(text, {
      language: "zh-CN",
      rate: APP_CONFIG.SPEECH_RATE,
      onDone: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  }, []);

  const playUserRecording = useCallback(async () => {
    if (!userAudioUri || !userAudioPlayer) return;
    triggerHaptic("selection");
    Speech.stop();
    setSpeaking(false);
    try {
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });
      userAudioPlayer.seekTo(0);
      userAudioPlayer.play();
    } catch (err) {
      console.warn("Error playing user recording:", err);
    }
  }, [userAudioUri, userAudioPlayer]);

  const evaluateSpeech = useCallback(
    (spokenText: string, aiErrorDetail?: string, aiPronunciationTip?: string) => {
      setAnalyzing(false);
      setIsRecording(false);
      setPinyinRevealed(true);
      const currentCard = shuffledCards[currentIndex];
      if (!currentCard) return;

      const isSentence =
        trainerMode === "sentence_shadowing" &&
        currentCard.examples &&
        currentCard.examples.length > 0 &&
        Boolean(currentCard.examples[0].chinese);

      const rawTargetText = isSentence ? currentCard.examples![0].chinese : currentCard.character;
      const rawTargetPinyin = isSentence
        ? currentCard.examples![0].pinyin || currentCard.pinyin
        : currentCard.pinyin;

      const targetChar = rawTargetText.trim().replace(/[.,/#!$%^&*;:{}=\-_`~()!?！。，？"']/g, "");
      const normalizedTarget = targetChar.replace(/\s+/g, "");
      const targetPinyinClean = stripDiacritics(rawTargetPinyin || "");

      const cleanSpoken = spokenText.trim().replace(/[.,/#!$%^&*;:{}=\-_`~()!?！。，？"']/g, "");
      const normalizedSpoken = cleanSpoken.replace(/\s+/g, "");
      const spokenPinyinClean = stripDiacritics(cleanSpoken);

      setRecognizedText(cleanSpoken);

      let calcScore = 0;
      let msg = "";
      let finalErrorDetail: string | null = null;
      let finalTip: string | null = null;

      const fallbackToneTip = getToneTip(rawTargetPinyin);

      if (!cleanSpoken) {
        calcScore = 0;
        msg = "Không nhận diện được giọng nói. Vui lòng bấm loa nghe âm mẫu và đọc rõ vào Micro.";
        finalErrorDetail = "AI không nghe thấy giọng đọc hoặc âm thanh quá nhỏ/bị nhiễu.";
        finalTip = "Ghé sát Micro hơn, bấm nghe âm mẫu và phát âm to rõ ràng.";
        triggerHaptic("error");
      } else {
        const hasExactChar =
          normalizedSpoken.includes(normalizedTarget) ||
          normalizedTarget.includes(normalizedSpoken) ||
          cleanSpoken.includes(targetChar);

        const hasExactPinyin =
          targetPinyinClean.length > 0 &&
          (spokenPinyinClean === targetPinyinClean ||
            spokenPinyinClean.includes(targetPinyinClean) ||
            targetPinyinClean.includes(spokenPinyinClean));

        let matchedCharsCount = 0;
        for (const ch of normalizedTarget) {
          if (normalizedSpoken.includes(ch)) {
            matchedCharsCount++;
          }
        }
        const overlapRatio =
          normalizedTarget.length > 0 ? matchedCharsCount / normalizedTarget.length : 0;

        if (hasExactChar || hasExactPinyin || (isSentence && overlapRatio >= 0.8)) {
          calcScore = 95;
          msg = isSentence
            ? "Tuyệt vời! Bạn đọc cả câu trôi chảy và chuẩn ngữ điệu."
            : "Hoàn hảo! Bạn phát âm Pinyin & Thanh điệu chính xác.";
          finalErrorDetail = null;
          finalTip = aiPronunciationTip || fallbackToneTip;
          triggerHaptic("success");
          awardArcadeXP(ARCADE_XP_REWARDS.PERFECT_PRONUNCIATION);
        } else if (overlapRatio > 0) {
          calcScore = Math.max(60, Math.min(88, Math.floor(overlapRatio * 100)));
          msg = `Gần chính xác! Âm nhận diện là "${cleanSpoken}".`;
          finalErrorDetail =
            aiErrorDetail ||
            `Chú ý cao độ thanh điệu hoặc âm tiết. Chuẩn là "${rawTargetText}" (${rawTargetPinyin}).`;
          finalTip = aiPronunciationTip || fallbackToneTip;
          triggerHaptic("warning");
          awardArcadeXP(ARCADE_XP_REWARDS.GOOD_PRONUNCIATION);
        } else {
          calcScore = 30;
          msg = `Chưa đúng! Âm nhận diện là "${cleanSpoken}".`;
          finalErrorDetail =
            aiErrorDetail ||
            `Âm đọc chưa khớp với "${rawTargetText}" (${rawTargetPinyin}). Hãy nghe âm chuẩn và thử lại!`;
          finalTip = aiPronunciationTip || fallbackToneTip;
          triggerHaptic("error");
        }
      }

      setScore(calcScore);
      setFeedback(msg);
      setErrorDetail(finalErrorDetail);
      setPronunciationTip(finalTip);

      Animated.spring(drawerAnim, {
        toValue: 0,
        tension: 65,
        friction: 8,
        useNativeDriver: true,
      }).start();
    },
    [shuffledCards, currentIndex, trainerMode, drawerAnim],
  );

  const transcribeAudioWithAI = useCallback(
    async (uri: string) => {
      const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "";
      const currentCard = shuffledCards[currentIndex];

      if (!apiKey || !currentCard) {
        evaluateSpeech("");
        return;
      }

      const isSentence =
        trainerMode === "sentence_shadowing" &&
        currentCard.examples &&
        currentCard.examples.length > 0 &&
        Boolean(currentCard.examples[0].chinese);

      const targetHanzi = isSentence ? currentCard.examples![0].chinese : currentCard.character;
      const targetPinyin = isSentence
        ? currentCard.examples![0].pinyin || currentCard.pinyin
        : currentCard.pinyin;
      const targetMeaning = isSentence
        ? currentCard.examples![0].vietnamese
        : currentCard.translation;

      try {
        const base64Audio = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const parsed = await evaluateChineseSpeechAudio(
          base64Audio,
          targetHanzi,
          targetPinyin || "",
          targetMeaning,
        );
        await recordReviewToday();
        evaluateSpeech(parsed.transcript || "", parsed.errorDetail, parsed.pronunciationTip);
      } catch (err) {
        console.warn("[transcribeAudioWithAI] Failed:", err);
        evaluateSpeech("");
      }
    },
    [shuffledCards, currentIndex, trainerMode, evaluateSpeech],
  );

  const handleStartRecording = useCallback(async () => {
    try {
      Speech.stop();
      setSpeaking(false);
      resetState();
      triggerHaptic("medium");

      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        setFeedback("Cần cấp quyền truy cập Micro để luyện phát âm.");
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setIsRecording(true);
    } catch (err) {
      console.warn("Failed to start recording:", err);
      setIsRecording(false);
    }
  }, [audioRecorder, resetState]);

  const handleStopRecording = useCallback(async () => {
    if (!isRecording) return;
    try {
      triggerHaptic("heavy");
      setIsRecording(false);
      setAnalyzing(true);
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      setUserAudioUri(uri);

      if (uri) {
        await transcribeAudioWithAI(uri);
      } else {
        evaluateSpeech("");
      }
    } catch (err) {
      console.warn("Failed to stop recording:", err);
      evaluateSpeech("");
    }
  }, [audioRecorder, evaluateSpeech, isRecording, transcribeAudioWithAI]);

  const handleNextWord = useCallback(() => {
    triggerHaptic("selection");
    if (currentIndex < shuffledCards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      resetState();
    } else {
      setIsDone(true);
    }
  }, [currentIndex, shuffledCards.length, resetState]);

  const handleRetryWord = useCallback(() => {
    resetState();
    triggerHaptic("selection");
  }, [resetState]);

  return {
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
    currentCard: shuffledCards[currentIndex],
    playTTS,
    playUserRecording,
    handleStartRecording,
    handleStopRecording,
    handleNextWord,
    handleRetryWord,
    resetState,
  };
}
