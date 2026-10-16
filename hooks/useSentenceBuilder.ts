import { useState, useEffect, useCallback, useRef } from "react";
import * as Speech from "expo-speech";
import { Card } from "../store/slices/types";
import { triggerHaptic } from "../constants/theme";
import { APP_CONFIG } from "../constants/config";
import { awardArcadeXP, ARCADE_XP_REWARDS } from "../lib/arcadeScoring";
import { selectCardsByFSRSPriority } from "../lib/srs";
import { recordReviewToday } from "../lib/reviewTracker";

export interface ExampleQuestion {
  card: Card;
  chinese: string;
  pinyin?: string;
  vietnamese: string;
  words: string[];
}

const DISTRACTOR_WORDS = [
  "的", "了", "在", "是", "我", "有", "和", "就", "不", "人",
  "很", "也", "要", "会", "到", "说", "去", "你", "会", "好",
];

function segmentChineseSentence(sentence: string): string[] {
  const clean = sentence.trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()!?！。，？"']/g, "");
  const chars = clean.split("").filter((c) => c.trim().length > 0);
  if (chars.length <= 4) {
    return chars;
  }
  const chunks: string[] = [];
  let i = 0;
  while (i < chars.length) {
    if (i + 1 < chars.length && Math.random() > 0.4) {
      chunks.push(chars[i] + chars[i + 1]);
      i += 2;
    } else {
      chunks.push(chars[i]);
      i += 1;
    }
  }
  return chunks;
}

export function useSentenceBuilder(visible: boolean, cards: Card[]) {
  const [questions, setQuestions] = useState<ExampleQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [wordBank, setWordBank] = useState<{ id: string; text: string }[]>([]);
  const [userSentence, setUserSentence] = useState<{ id: string; text: string }[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const prevVisibleRef = useRef(false);

  const currentQuestion = questions[currentIndex];

  const prepareQuestion = useCallback((q: ExampleQuestion) => {
    const segmented = segmentChineseSentence(q.chinese);
    const extraCount = Math.min(3, Math.max(1, Math.floor(segmented.length / 2)));
    const extraDistractors = [...DISTRACTOR_WORDS]
      .sort(() => 0.5 - Math.random())
      .slice(0, extraCount);

    const combined = [...segmented, ...extraDistractors];
    const shuffled = combined
      .sort(() => 0.5 - Math.random())
      .map((w, idx) => ({ id: `${w}_${idx}_${Date.now()}`, text: w }));

    setWordBank(shuffled);
    setUserSentence([]);
    setIsSubmitted(false);
    setIsCorrect(false);
  }, []);

  useEffect(() => {
    if (visible && !prevVisibleRef.current && cards.length > 0) {
      const valid = cards.filter(
        (c) => c.examples && c.examples.length > 0 && c.examples[0].chinese
      );

      const qs: ExampleQuestion[] = selectCardsByFSRSPriority(valid, 5).map((card) => {
        const ex = card.examples![0];
        return {
          card,
          chinese: ex.chinese,
          pinyin: ex.pinyin,
          vietnamese: ex.vietnamese,
          words: [],
        };
      });

      setQuestions(qs);
      setCurrentIndex(0);
      setIsDone(false);

      if (qs.length > 0) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        prepareQuestion(qs[0]);
      }
    }
    prevVisibleRef.current = visible;
  }, [visible, cards, prepareQuestion]);

  const handleSelectWord = useCallback(
    (item: { id: string; text: string }) => {
      if (isSubmitted) return;
      triggerHaptic("selection");
      setUserSentence((prev) => {
        if (prev.some((w) => w.id === item.id)) return prev;
        return [...prev, item];
      });
    },
    [isSubmitted]
  );

  const handleRemoveWord = useCallback(
    (item: { id: string; text: string }) => {
      if (isSubmitted) return;
      triggerHaptic("selection");
      setUserSentence((prev) => prev.filter((w) => w.id !== item.id));
    },
    [isSubmitted]
  );


  const playTTS = useCallback((text: string) => {
    if (!text) return;
    Speech.stop();
    Speech.speak(text, {
      language: "zh-CN",
      rate: APP_CONFIG.SPEECH_RATE,
    });
  }, []);

  const handleCheck = useCallback(() => {
    if (!currentQuestion || isSubmitted) return;
    setIsSubmitted(true);
    recordReviewToday();

    const builtText = userSentence.map((w) => w.text).join("");
    const targetClean = currentQuestion.chinese
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()!?！。，？"']/g, "")
      .replace(/\s+/g, "");

    const correct = builtText === targetClean;
    setIsCorrect(correct);

    if (correct) {
      triggerHaptic("success");
      awardArcadeXP(ARCADE_XP_REWARDS.SENTENCE_BUILDER_BASE);
      playTTS(currentQuestion.chinese);
    } else {
      triggerHaptic("error");
    }
  }, [currentQuestion, isSubmitted, userSentence, playTTS]);

  const handleNext = useCallback(() => {
    triggerHaptic("selection");
    if (currentIndex < questions.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      prepareQuestion(questions[nextIdx]);
    } else {
      setIsDone(true);
    }
  }, [currentIndex, questions, prepareQuestion]);

  return {
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
  };
}
