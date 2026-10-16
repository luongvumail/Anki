import { useState, useEffect, useRef, useCallback } from "react";
import { Animated, Keyboard } from "react-native";
import * as Speech from "expo-speech";
import * as FileSystem from "expo-file-system/legacy";
import { useAudioRecorder, AudioModule, RecordingPresets, setAudioModeAsync } from "expo-audio";
import { QuizQuestion, evaluateTypedAnswer, stripPinyinTones } from "../lib/quizGenerator";
import { evaluateChineseSpeechAudio } from "../lib/gemini";
import { triggerHaptic } from "../constants/theme";
import { APP_CONFIG } from "../constants/config";

export type WeakTagType = "pinyin" | "character" | "meaning";

export function useQuizCard(
  question: QuizQuestion,
  onAnswer: (isCorrect: boolean, responseTimeMs: number, weakTag?: WeakTagType) => void,
  isFastRepairMode?: boolean,
) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [typedText, setTypedText] = useState("");
  const [toneHint, setToneHint] = useState<string | null>(null);
  const [isCorrectState, setIsCorrectState] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [speakingSlow, setSpeakingSlow] = useState(false);
  const [speakingSentence, setSpeakingSentence] = useState(false);
  const [timeLeft, setTimeLeft] = useState(5);

  // Mode override when user clicks "Chuyển sang Trắc nghiệm" or "Không tiện nói lúc này"
  const [modeOverride, setModeOverride] = useState<"choice" | "typing" | null>(null);

  // Speaking check states
  const [isRecording, setIsRecording] = useState(false);
  const [analyzingSpeech, setAnalyzingSpeech] = useState(false);
  const [spokenTranscript, setSpokenTranscript] = useState<string | null>(null);

  const startTimeRef = useRef<number>(0);
  const responseTimeMsRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const drawerAnim = useRef(new Animated.Value(300)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;
  const micPulseAnim = useRef(new Animated.Value(1)).current;

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const activeMode = isFastRepairMode
    ? "choice"
    : modeOverride || question.interactionMode || "choice";

  const playTTS = useCallback((text: string) => {
    if (!text) return;
    Speech.stop();
    setSpeakingSlow(false);
    setSpeaking(true);
    Speech.speak(text, {
      language: "zh-CN",
      rate: APP_CONFIG.SPEECH_RATE,
      onDone: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  }, []);

  const playSlowTTS = useCallback((text: string) => {
    if (!text) return;
    Speech.stop();
    setSpeaking(false);
    setSpeakingSlow(true);
    Speech.speak(text, {
      language: "zh-CN",
      rate: 0.5,
      onDone: () => setSpeakingSlow(false),
      onError: () => setSpeakingSlow(false),
    });
  }, []);

  const playSentenceTTS = useCallback((sentence: string) => {
    if (!sentence) return;
    Speech.stop();
    setSpeakingSentence(true);
    Speech.speak(sentence, {
      language: "zh-CN",
      rate: APP_CONFIG.SPEECH_RATE,
      onDone: () => setSpeakingSentence(false),
      onError: () => setSpeakingSentence(false),
    });
  }, []);

  useEffect(() => {
    startTimeRef.current = Date.now();
    responseTimeMsRef.current = 0;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedIndex(null);
    setTypedText("");
    setToneHint(null);
    setIsCorrectState(false);
    setIsChecked(false);
    setModeOverride(null);
    setIsRecording(false);
    setAnalyzingSpeech(false);
    setSpokenTranscript(null);
    setTimeLeft(5);
    drawerAnim.setValue(300);
    shakeAnim.setValue(0);
    bounceAnim.setValue(1);

    if (timerRef.current) clearInterval(timerRef.current);

    if (isFastRepairMode) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    if (
      question.type === "listening" ||
      question.type === "listening_meaning" ||
      question.type === "listening_dictation"
    ) {
      playTTS(question.audioText || question.card.character);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [question, playTTS, drawerAnim, shakeAnim, bounceAnim, isFastRepairMode]);

  useEffect(() => {
    let anim: Animated.CompositeAnimation | null = null;
    if (isRecording) {
      anim = Animated.loop(
        Animated.sequence([
          Animated.timing(micPulseAnim, { toValue: 1.2, duration: 450, useNativeDriver: true }),
          Animated.timing(micPulseAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
        ]),
      );
      anim.start();
    } else {
      micPulseAnim.setValue(1);
    }
    return () => {
      if (anim) anim.stop();
    };
  }, [isRecording, micPulseAnim]);

  const revealResultDrawer = useCallback(
    (correct: boolean) => {
      setIsCorrectState(correct);
      setIsChecked(true);

      if (correct) {
        triggerHaptic("success");
        Animated.sequence([
          Animated.timing(bounceAnim, { toValue: 1.04, duration: 120, useNativeDriver: true }),
          Animated.timing(bounceAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
        ]).start();
      } else {
        triggerHaptic("error");
        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start();
      }

      Animated.spring(drawerAnim, {
        toValue: 0,
        tension: 65,
        friction: 8,
        useNativeDriver: true,
      }).start();
    },
    [bounceAnim, shakeAnim, drawerAnim],
  );

  useEffect(() => {
    if (isFastRepairMode && timeLeft === 0 && !isChecked) {
      responseTimeMsRef.current = 5000;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      revealResultDrawer(false);
    }
  }, [isFastRepairMode, timeLeft, isChecked, revealResultDrawer]);

  const handleSelectOption = useCallback(
    (index: number) => {
      if (isChecked) return;
      setSelectedIndex(index);

      if (timerRef.current) clearInterval(timerRef.current);

      const elapsed = Date.now() - startTimeRef.current;
      responseTimeMsRef.current = elapsed;

      const chosenOption = question.options[index];
      const isCorrect =
        chosenOption === question.correctAnswer ||
        (question.acceptedAnswers ? question.acceptedAnswers.includes(chosenOption) : false);

      revealResultDrawer(isCorrect);
    },
    [isChecked, question, revealResultDrawer],
  );

  const handleAppendToneVowel = useCallback(
    (vowel: string) => {
      if (isChecked) return;
      triggerHaptic("selection");
      setTypedText((prev) => prev + vowel);
    },
    [isChecked],
  );

  const handleSubmitTyped = useCallback(() => {
    if (isChecked || !typedText.trim()) return;
    Keyboard.dismiss();

    if (timerRef.current) clearInterval(timerRef.current);
    responseTimeMsRef.current = Date.now() - startTimeRef.current;

    const evalResult = evaluateTypedAnswer(typedText, question);
    if (evalResult.toneHint) {
      setToneHint(evalResult.toneHint);
    }
    revealResultDrawer(evalResult.isCorrect);
  }, [isChecked, typedText, question, revealResultDrawer]);

  const handleSwitchToChoice = useCallback(() => {
    if (isChecked) return;
    Keyboard.dismiss();
    triggerHaptic("selection");
    setModeOverride("choice");
  }, [isChecked]);

  const handleStartSpeaking = useCallback(async () => {
    if (isChecked || analyzingSpeech) return;
    try {
      Speech.stop();
      setSpeaking(false);
      triggerHaptic("medium");

      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        setModeOverride("typing");
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setIsRecording(true);
    } catch {
      setIsRecording(false);
      setModeOverride("typing");
    }
  }, [audioRecorder, isChecked, analyzingSpeech]);

  const handleStopSpeaking = useCallback(async () => {
    if (!isRecording) return;
    try {
      triggerHaptic("heavy");
      setIsRecording(false);
      setAnalyzingSpeech(true);
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      responseTimeMsRef.current = Date.now() - startTimeRef.current;

      const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "";
      if (!uri || !apiKey) {
        setAnalyzingSpeech(false);
        revealResultDrawer(true);
        return;
      }

      const base64Audio = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const speechEval = await evaluateChineseSpeechAudio(
        base64Audio,
        question.card.character,
        question.card.pinyin || "",
        question.card.translation,
      );
      const transcript = (speechEval.transcript || "").trim();
      setSpokenTranscript(transcript || null);
      setAnalyzingSpeech(false);

      const targetChar = question.card.character.trim();
      const targetBase = stripPinyinTones(question.card.pinyin || "");
      const spokenBase = stripPinyinTones(transcript);

      const matched =
        Boolean(transcript) &&
        (transcript.includes(targetChar) ||
          targetChar.includes(transcript) ||
          (targetBase.length > 0 &&
            (spokenBase.includes(targetBase) || targetBase.includes(spokenBase))));

      revealResultDrawer(matched);
    } catch {
      setAnalyzingSpeech(false);
      setModeOverride("choice");
    }
  }, [audioRecorder, isRecording, question, revealResultDrawer]);

  const handleContinue = useCallback(() => {
    triggerHaptic("selection");

    let weakTag: WeakTagType | undefined;
    if (!isCorrectState) {
      if (
        question.type === "pinyin_choice" ||
        question.type === "type_pinyin" ||
        question.type === "speaking_check"
      ) {
        weakTag = "pinyin";
      } else if (question.type === "meaning_choice" || question.type === "listening_meaning") {
        weakTag = "meaning";
      } else {
        weakTag = "character";
      }
    }

    onAnswer(isCorrectState, responseTimeMsRef.current, weakTag);
  }, [isCorrectState, question, onAnswer]);

  return {
    activeMode,
    selectedIndex,
    typedText,
    setTypedText,
    toneHint,
    isCorrect: isCorrectState,
    isChecked,
    speaking,
    speakingSlow,
    speakingSentence,
    isRecording,
    analyzingSpeech,
    spokenTranscript,
    timeLeft,
    responseTimeMs: responseTimeMsRef.current,
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
  };
}
