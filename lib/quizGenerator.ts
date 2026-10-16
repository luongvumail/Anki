import { Card } from "../store/slices/types";
import { APP_CONFIG } from "../constants/config";
import { FSRSState } from "./srs";

export type QuestionType =
  | "meaning_choice"
  | "hanzi_from_meaning"
  | "pinyin_choice"
  | "hanzi_from_pinyin"
  | "listening"
  | "listening_meaning"
  | "cloze"
  | "type_pinyin"
  | "type_hanzi"
  | "listening_dictation"
  | "cloze_typing"
  | "speaking_check";

export type QuizInteractionMode = "choice" | "typing" | "speaking";

export interface QuizQuestion {
  card: Card;
  type: QuestionType;
  interactionMode?: QuizInteractionMode;
  prompt: string;
  targetText?: string;
  subText?: string;
  audioText?: string;
  clozeSentence?: string;
  clozeTranslation?: string;
  inputPlaceholder?: string;
  acceptedAnswers?: string[];
  options: string[]; // 4 choices (also used as fallback when skipping speaking/typing)
  correctAnswer: string;
  weakTag?: "pinyin" | "character" | "meaning";
}

/**
 * Quick tone-marked vowels for on-screen Android typing assistant bar
 */
export const PINYIN_TONE_VOWELS = [
  "ā",
  "á",
  "ǎ",
  "à",
  "ē",
  "é",
  "ě",
  "è",
  "ī",
  "í",
  "ǐ",
  "ì",
  "ō",
  "ó",
  "ǒ",
  "ò",
  "ū",
  "ú",
  "ǔ",
  "ù",
  "ǖ",
  "ǘ",
  "ǚ",
  "ǜ",
];

/**
 * Fallback distractor arrays if deck has < 4 cards
 */
const FALLBACK_CHARACTERS = APP_CONFIG.QUIZ_FALLBACKS.CHARACTERS;
const FALLBACK_PINYINS = APP_CONFIG.QUIZ_FALLBACKS.PINYINS;
const FALLBACK_TRANSLATIONS = APP_CONFIG.QUIZ_FALLBACKS.TRANSLATIONS;

/**
 * Utility to shuffle an array randomly using Fisher-Yates
 */
export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const TONE_MARK_TO_NUMBER: Record<string, [string, number]> = {
  ā: ["a", 1],
  á: ["a", 2],
  ǎ: ["a", 3],
  à: ["a", 4],
  ē: ["e", 1],
  é: ["e", 2],
  ě: ["e", 3],
  è: ["e", 4],
  ī: ["i", 1],
  í: ["i", 2],
  ǐ: ["i", 3],
  ì: ["i", 4],
  ō: ["o", 1],
  ó: ["o", 2],
  ǒ: ["o", 3],
  ò: ["o", 4],
  ū: ["u", 1],
  ú: ["u", 2],
  ǔ: ["u", 3],
  ù: ["u", 4],
  ǖ: ["v", 1],
  ǘ: ["v", 2],
  ǚ: ["v", 3],
  ǜ: ["v", 4],
  ü: ["v", 0],
};

/**
 * Strips tone marks and spaces/punctuation for base syllable comparison (e.g. "hē shuǐ" -> "heshui")
 */
export function stripPinyinTones(str: string): string {
  if (!str) return "";
  let out = "";
  for (const ch of str.toLowerCase()) {
    if (TONE_MARK_TO_NUMBER[ch]) {
      out += TONE_MARK_TO_NUMBER[ch][0];
    } else if (/[a-z]/.test(ch)) {
      out += ch;
    }
  }
  return out;
}

/**
 * Normalizes Pinyin with either tone marks ("māo", "hē shuǐ") or tone numbers ("mao1", "he1 shui3")
 * into a canonical tone-numbered form ("mao1", "he1shui3") for exact tone matching.
 */
export function normalizePinyinWithTones(str: string): string {
  if (!str) return "";
  const tokens = str
    .toLowerCase()
    .trim()
    .replace(/ü/g, "v")
    .split(/[\s,.'"-]+/)
    .filter(Boolean);

  const normalizedTokens = tokens.map((token) => {
    let detectedTone = 0;
    let base = "";
    for (const ch of token) {
      if (TONE_MARK_TO_NUMBER[ch]) {
        base += TONE_MARK_TO_NUMBER[ch][0];
        if (TONE_MARK_TO_NUMBER[ch][1] > 0) {
          detectedTone = TONE_MARK_TO_NUMBER[ch][1];
        }
      } else if (/[1-5]/.test(ch)) {
        const t = Number(ch);
        detectedTone = t === 5 ? 0 : t;
      } else if (/[a-z]/.test(ch)) {
        base += ch;
      }
    }
    return detectedTone > 0 ? `${base}${detectedTone}` : base;
  });

  return normalizedTokens.join("");
}

/**
 * Evaluates a user's typed answer for typing/dictation/cloze_typing questions.
 * Accepts exact Hanzi, exact Pinyin (with tone marks or tone numbers 1-4),
 * or base Pinyin without tones (returning a helpful tone reminder).
 */
export function evaluateTypedAnswer(
  userInput: string,
  question: QuizQuestion,
): { isCorrect: boolean; toneHint?: string } {
  const raw = userInput.trim();
  if (!raw) return { isCorrect: false };

  const cleanInput = raw.replace(/[.,/#!$%^&*;:{}=\-_`~()!?！。，？"'\s]/g, "").toLowerCase();
  const targetChar = (question.card.character || "")
    .replace(/[.,/#!$%^&*;:{}=\-_`~()!?！。，？"'\s]/g, "")
    .toLowerCase();
  const targetPinyin = question.card.pinyin || "";

  // 1. Direct match with Hanzi character
  if (targetChar && cleanInput === targetChar) {
    return { isCorrect: true };
  }

  // 2. Direct match with any explicitly accepted answers
  if (question.acceptedAnswers) {
    for (const ans of question.acceptedAnswers) {
      const cleanAns = ans.replace(/[.,/#!$%^&*;:{}=\-_`~()!?！。，？"'\s]/g, "").toLowerCase();
      if (cleanAns && cleanInput === cleanAns) {
        return { isCorrect: true };
      }
    }
  }

  // 3. Match with Pinyin (with tone marks or tone numbers like "mao1" / "māo")
  if (targetPinyin) {
    const userToneNorm = normalizePinyinWithTones(raw);
    const targetToneNorm = normalizePinyinWithTones(targetPinyin);
    if (userToneNorm && userToneNorm === targetToneNorm) {
      return { isCorrect: true };
    }

    // 4. Base syllable match (user typed "he shui" without tone marks)
    const userBase = stripPinyinTones(raw);
    const targetBase = stripPinyinTones(targetPinyin);
    if (userBase.length > 0 && userBase === targetBase) {
      return {
        isCorrect: true,
        toneHint: `Đúng âm tiết! Chú ý dấu thanh chuẩn: ${targetPinyin}`,
      };
    }
  }

  return { isCorrect: false };
}

/**
 * Generate tone variations for a pinyin string
 */
function generateToneVariations(pinyin: string): string[] {
  if (!pinyin) return [];

  const toneMap: Record<string, string[]> = {
    a: ["ā", "á", "ǎ", "à"],
    e: ["ē", "é", "ě", "è"],
    i: ["ī", "í", "ǐ", "ì"],
    o: ["ō", "ó", "ǒ", "ò"],
    u: ["ū", "ú", "ǔ", "ù"],
    ā: ["á", "ǎ", "à"],
    á: ["ā", "ǎ", "à"],
    ǎ: ["ā", "á", "à"],
    à: ["ā", "á", "ǎ"],
    ē: ["é", "ě", "è"],
    é: ["ē", "ě", "è"],
    ě: ["ē", "é", "è"],
    è: ["ē", "é", "ě"],
    ī: ["í", "ǐ", "ì"],
    í: ["ī", "ǐ", "ì"],
    ǐ: ["ī", "í", "ì"],
    ì: ["ī", "í", "ǐ"],
    ō: ["ó", "ǒ", "ò"],
    ó: ["ō", "ǒ", "ò"],
    ǒ: ["ō", "ó", "ò"],
    ò: ["ō", "ó", "ǒ"],
    ū: ["ú", "ǔ", "ù"],
    ú: ["ū", "ǔ", "ù"],
    ǔ: ["ū", "ú", "ù"],
    ù: ["ū", "ú", "ǔ"],
  };

  const variations: string[] = [];
  for (const [vowel, altTones] of Object.entries(toneMap)) {
    if (pinyin.includes(vowel)) {
      for (const alt of altTones) {
        const replaced = pinyin.replace(vowel, alt);
        if (replaced !== pinyin && !variations.includes(replaced)) {
          variations.push(replaced);
        }
      }
    }
  }
  return variations;
}

/**
 * Generate 3 distractors for Character options
 */
function getCharacterDistractors(card: Card, allCards: Card[]): string[] {
  const target = card.character || "";
  const uniquePool = Array.from(
    new Set(allCards.map((c) => c.character).filter((ch) => ch && ch !== target)),
  );

  for (const fallback of FALLBACK_CHARACTERS) {
    if (uniquePool.length >= 10) break;
    if (fallback !== target && !uniquePool.includes(fallback)) {
      uniquePool.push(fallback);
    }
  }

  const shuffled = shuffleArray(uniquePool);
  return shuffled.slice(0, 3);
}

/**
 * Generate 3 distractors for Vietnamese Translation options
 */
function getTranslationDistractors(card: Card, allCards: Card[]): string[] {
  const target = card.translation || "";
  const uniquePool = Array.from(
    new Set(allCards.map((c) => c.translation).filter((tr) => tr && tr !== target)),
  );

  for (const fallback of FALLBACK_TRANSLATIONS) {
    if (uniquePool.length >= 10) break;
    if (fallback !== target && !uniquePool.includes(fallback)) {
      uniquePool.push(fallback);
    }
  }

  const shuffled = shuffleArray(uniquePool);
  return shuffled.slice(0, 3);
}

/**
 * Generate 3 distractors for Pinyin options
 */
function getPinyinDistractors(card: Card, allCards: Card[]): string[] {
  const target = card.pinyin || "";
  const distractors: string[] = [];

  const toneVars = generateToneVariations(target);
  for (const tv of shuffleArray(toneVars)) {
    if (tv && tv !== target && !distractors.includes(tv)) {
      distractors.push(tv);
    }
    if (distractors.length >= 3) break;
  }

  if (distractors.length < 3) {
    const otherPinyins = Array.from(
      new Set(
        allCards
          .map((c) => c.pinyin)
          .filter((py) => py && py !== target && !distractors.includes(py)),
      ),
    );

    for (const py of shuffleArray(otherPinyins)) {
      distractors.push(py);
      if (distractors.length >= 3) break;
    }
  }

  if (distractors.length < 3) {
    for (const fb of FALLBACK_PINYINS) {
      if (fb !== target && !distractors.includes(fb)) {
        distractors.push(fb);
      }
      if (distractors.length >= 3) break;
    }
  }

  return distractors.slice(0, 3);
}

/**
 * Select question type adaptively based on FSRS state, weak tag, and optional variety index:
 * - When `varietyIndex` is omitted, returns the canonical primary type for deterministic tests.
 * - When `varietyIndex` is provided, rotates across all 12 diverse exercise formats!
 */
export function determineQuestionType(
  card: Card,
  weakTag?: "pinyin" | "character" | "meaning",
  varietyIndex?: number,
): QuestionType {
  if (weakTag === "pinyin") {
    if (varietyIndex !== undefined && varietyIndex % 2 === 1) return "type_pinyin";
    return "pinyin_choice";
  }
  if (weakTag === "meaning") {
    if (varietyIndex !== undefined && varietyIndex % 2 === 1) return "listening_meaning";
    return "meaning_choice";
  }
  if (weakTag === "character") {
    if (varietyIndex !== undefined && varietyIndex % 2 === 1) return "hanzi_from_meaning";
    return "listening";
  }

  const state = card.srs?.state ?? FSRSState.New;
  const reps = card.srs?.repetitions ?? 0;
  const hasExamples = Boolean(
    card.examples && card.examples.length > 0 && card.examples[0].chinese,
  );

  // Preserve exact canonical defaults when varietyIndex is not passed
  if (varietyIndex === undefined) {
    if (state === FSRSState.New) {
      return "meaning_choice";
    } else if (state === FSRSState.Learning || state === FSRSState.Relearning) {
      return "pinyin_choice";
    } else if (state === FSRSState.Review) {
      if (hasExamples && reps >= 3) {
        return "cloze";
      }
      return "listening";
    }
    return "meaning_choice";
  }

  // Diverse multi-skill rotation when varietyIndex is provided
  if (state === FSRSState.New) {
    const newPool: QuestionType[] = [
      "meaning_choice",
      "hanzi_from_meaning",
      "listening_meaning",
      "pinyin_choice",
      "listening",
    ];
    return newPool[Math.abs(varietyIndex) % newPool.length];
  }

  if (state === FSRSState.Learning || state === FSRSState.Relearning) {
    const learningPool: QuestionType[] = [
      "pinyin_choice",
      "hanzi_from_pinyin",
      "type_pinyin",
      "listening",
      "hanzi_from_meaning",
      "listening_dictation",
      "speaking_check",
    ];
    return learningPool[Math.abs(varietyIndex) % learningPool.length];
  }

  // Review state: prioritize active recall (typing, dictation, speaking, cloze)
  const reviewPool: QuestionType[] = hasExamples
    ? [
        "cloze",
        "cloze_typing",
        "listening_dictation",
        "type_pinyin",
        "type_hanzi",
        "speaking_check",
        "listening",
        "hanzi_from_meaning",
      ]
    : [
        "listening_dictation",
        "type_pinyin",
        "type_hanzi",
        "speaking_check",
        "listening",
        "hanzi_from_meaning",
        "hanzi_from_pinyin",
      ];

  return reviewPool[Math.abs(varietyIndex) % reviewPool.length];
}

/**
 * Generate a complete QuizQuestion for a card given all deck cards
 */
export function generateQuizQuestion(
  card: Card,
  allCards: Card[],
  forcedType?: QuestionType,
  weakTag?: "pinyin" | "character" | "meaning",
  varietyIndex?: number,
): QuizQuestion {
  const type = forcedType || determineQuestionType(card, weakTag, varietyIndex);

  // 1. Chữ Hán -> Chọn nghĩa Tiếng Việt
  if (type === "meaning_choice") {
    const distractors = getTranslationDistractors(card, allCards);
    const options = shuffleArray(Array.from(new Set([card.translation, ...distractors])));

    return {
      card,
      type: "meaning_choice",
      interactionMode: "choice",
      prompt: "Chọn nghĩa Tiếng Việt của từ Hán tự này:",
      targetText: card.character,
      subText: card.pinyin || undefined,
      options,
      correctAnswer: card.translation,
    };
  }

  // 2. Nghĩa Tiếng Việt -> Chọn Chữ Hán
  if (type === "hanzi_from_meaning") {
    const distractors = getCharacterDistractors(card, allCards);
    const options = shuffleArray(Array.from(new Set([card.character, ...distractors])));

    return {
      card,
      type: "hanzi_from_meaning",
      interactionMode: "choice",
      prompt: "Chọn Chữ Hán tương ứng với nghĩa Tiếng Việt:",
      targetText: card.translation,
      subText: card.pinyin ? `Pinyin: ${card.pinyin}` : undefined,
      options,
      correctAnswer: card.character,
    };
  }

  // 3. Pinyin -> Chọn Chữ Hán
  if (type === "hanzi_from_pinyin") {
    const distractors = getCharacterDistractors(card, allCards);
    const options = shuffleArray(Array.from(new Set([card.character, ...distractors])));

    return {
      card,
      type: "hanzi_from_pinyin",
      interactionMode: "choice",
      prompt: "Chọn Chữ Hán tương ứng với phiên âm Pinyin:",
      targetText: card.pinyin,
      subText: card.translation ? `Nghĩa: ${card.translation}` : undefined,
      options,
      correctAnswer: card.character,
    };
  }

  // 4. Nghe âm thanh -> Chọn nghĩa Tiếng Việt
  if (type === "listening_meaning") {
    const distractors = getTranslationDistractors(card, allCards);
    const options = shuffleArray(Array.from(new Set([card.translation, ...distractors])));

    return {
      card,
      type: "listening_meaning",
      interactionMode: "choice",
      prompt: "Nghe phát âm và chọn Nghĩa Tiếng Việt đúng:",
      audioText: card.character,
      options,
      correctAnswer: card.translation,
    };
  }

  // 5. Điền khuyết câu ví dụ - Trắc nghiệm hoặc Tự gõ (Cloze / Cloze Typing)
  if (
    (type === "cloze" || type === "cloze_typing") &&
    card.examples &&
    card.examples.length > 0
  ) {
    const ex = card.examples[0];
    if (ex.chinese) {
      let targetToReplace = "";
      if (ex.chinese.includes(card.character)) {
        targetToReplace = card.character;
      } else {
        for (const char of card.character) {
          if (char.trim() && ex.chinese.includes(char)) {
            targetToReplace = char;
            break;
          }
        }
      }

      if (targetToReplace) {
        const blankedChinese = ex.chinese.replaceAll(targetToReplace, "（___）");
        const distractors = getCharacterDistractors(card, allCards);
        const options = shuffleArray(Array.from(new Set([card.character, ...distractors])));

        if (type === "cloze_typing") {
          return {
            card,
            type: "cloze_typing",
            interactionMode: "typing",
            prompt: "Gõ từ tiếng Trung (Chữ Hán hoặc Pinyin) còn thiếu vào chỗ trống:",
            clozeSentence: blankedChinese,
            clozeTranslation: ex.vietnamese,
            inputPlaceholder: "Nhập Chữ Hán hoặc Pinyin...",
            acceptedAnswers: [card.character, card.pinyin, targetToReplace].filter(Boolean),
            options,
            correctAnswer: card.character,
          };
        }

        return {
          card,
          type: "cloze",
          interactionMode: "choice",
          prompt: "Điền từ thích hợp vào ô trống trong câu:",
          clozeSentence: blankedChinese,
          clozeTranslation: ex.vietnamese,
          options,
          correctAnswer: card.character,
        };
      }
    }
  }

  // 6. Nghe phát âm -> Chọn Chữ Hán (Ẩn nghĩa Tiếng Việt để kiểm tra nghe thực chất)
  if (type === "listening") {
    const distractors = getCharacterDistractors(card, allCards);
    const options = shuffleArray(Array.from(new Set([card.character, ...distractors])));

    return {
      card,
      type: "listening",
      interactionMode: "choice",
      prompt: "Nghe phát âm và chọn Chữ Hán đúng:",
      audioText: card.character,
      options,
      correctAnswer: card.character,
    };
  }

  // 7. Tự nhập Pinyin (Active Recall Typing Pinyin)
  if (type === "type_pinyin") {
    const distractors = getPinyinDistractors(card, allCards);
    const options = shuffleArray(Array.from(new Set([card.pinyin, ...distractors])));

    return {
      card,
      type: "type_pinyin",
      interactionMode: "typing",
      prompt: "Tự gõ phiên âm Pinyin cho từ Hán tự này:",
      targetText: card.character,
      subText: `Nghĩa: ${card.translation}`,
      inputPlaceholder: "Gõ Pinyin (VD: nihao, ni3 hao3 hoặc nǐ hǎo)...",
      acceptedAnswers: [card.pinyin, card.character].filter(Boolean),
      options,
      correctAnswer: card.pinyin,
    };
  }

  // 8. Tự nhập Chữ Hán / Từ vựng từ Nghĩa Tiếng Việt (Active Recall Typing Hanzi)
  if (type === "type_hanzi") {
    const distractors = getCharacterDistractors(card, allCards);
    const options = shuffleArray(Array.from(new Set([card.character, ...distractors])));

    return {
      card,
      type: "type_hanzi",
      interactionMode: "typing",
      prompt: "Nhìn nghĩa Tiếng Việt và gõ lại Chữ Hán (hoặc Pinyin):",
      targetText: card.translation,
      subText: card.radical ? `Gợi ý bộ thủ: ${card.radical}` : undefined,
      inputPlaceholder: "Nhập Chữ Hán hoặc Pinyin...",
      acceptedAnswers: [card.character, card.pinyin].filter(Boolean),
      options,
      correctAnswer: card.character,
    };
  }

  // 9. Nghe chép chính tả (Listening Dictation)
  if (type === "listening_dictation") {
    const distractors = getCharacterDistractors(card, allCards);
    const options = shuffleArray(Array.from(new Set([card.character, ...distractors])));

    return {
      card,
      type: "listening_dictation",
      interactionMode: "typing",
      prompt: "Nghe phát âm và gõ lại Chữ Hán hoặc Pinyin bạn nghe được:",
      audioText: card.character,
      inputPlaceholder: "Gõ Chữ Hán hoặc Pinyin nghe được...",
      acceptedAnswers: [card.character, card.pinyin].filter(Boolean),
      options,
      correctAnswer: `${card.character} (${card.pinyin})`,
    };
  }

  // 10. Kiểm tra phát âm nhanh trong phiên ôn tập (Speaking Check)
  if (type === "speaking_check") {
    const distractors = getPinyinDistractors(card, allCards);
    const options = shuffleArray(Array.from(new Set([card.pinyin, ...distractors])));

    return {
      card,
      type: "speaking_check",
      interactionMode: "speaking",
      prompt: "Bấm Micro và đọc to từ Tiếng Trung dưới đây:",
      targetText: card.character,
      subText: `Nghĩa: ${card.translation}`,
      options,
      correctAnswer: card.pinyin,
    };
  }

  // 11. Default: Chọn Pinyin & thanh điệu
  const distractors = getPinyinDistractors(card, allCards);
  const options = shuffleArray(Array.from(new Set([card.pinyin, ...distractors])));

  return {
    card,
    type: "pinyin_choice",
    interactionMode: "choice",
    prompt: "Chọn Phiên âm Pinyin & Thanh điệu đúng:",
    targetText: card.character,
    subText: card.translation,
    options,
    correctAnswer: card.pinyin,
  };
}

