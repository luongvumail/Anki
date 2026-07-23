import { Card } from "../store/slices/types";

export type QuestionType = "pinyin_choice" | "listening" | "cloze";

export interface QuizQuestion {
  card: Card;
  type: QuestionType;
  prompt: string;
  targetText?: string;
  subText?: string;
  audioText?: string;
  clozeSentence?: string;
  clozeTranslation?: string;
  options: string[]; // 4 choices
  correctAnswer: string;
}

/**
 * Array of fallback common Chinese characters if deck has < 4 cards
 */
const FALLBACK_CHARACTERS = ["好", "你", "学", "中", "国", "人", "爱", "生", "水", "大", "小", "日"];
const FALLBACK_PINYINS = ["hǎo", "nǐ", "xué", "zhōng", "guó", "rén", "ài", "shēng", "shuǐ", "dà"];

/**
 * Utility to shuffle an array randomly
 */
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Generate tone variations for a pinyin string if simple
 */
function generateToneVariations(pinyin: string): string[] {
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
  const pool = allCards
    .map((c) => c.character)
    .filter((ch) => ch && ch !== card.character);

  // Fill with fallback characters if pool is small
  for (const fallback of FALLBACK_CHARACTERS) {
    if (pool.length >= 10) break;
    if (fallback !== card.character && !pool.includes(fallback)) {
      pool.push(fallback);
    }
  }

  const shuffled = shuffleArray(pool);
  return shuffled.slice(0, 3);
}

/**
 * Generate 3 distractors for Pinyin options
 */
function getPinyinDistractors(card: Card, allCards: Card[]): string[] {
  const distractors: string[] = [];

  // Try tone variations first
  const toneVars = generateToneVariations(card.pinyin);
  for (const tv of shuffleArray(toneVars)) {
    if (tv !== card.pinyin && !distractors.includes(tv)) {
      distractors.push(tv);
    }
    if (distractors.length >= 3) break;
  }

  // If not enough, pick pinyins from other cards
  if (distractors.length < 3) {
    const otherPinyins = allCards
      .map((c) => c.pinyin)
      .filter((py) => py && py !== card.pinyin && !distractors.includes(py));
    
    for (const py of shuffleArray(otherPinyins)) {
      distractors.push(py);
      if (distractors.length >= 3) break;
    }
  }

  // Fallback pinyins if still < 3
  if (distractors.length < 3) {
    for (const fb of FALLBACK_PINYINS) {
      if (fb !== card.pinyin && !distractors.includes(fb)) {
        distractors.push(fb);
      }
      if (distractors.length >= 3) break;
    }
  }

  return distractors.slice(0, 3);
}

/**
 * Select question type adaptively based on SRS repetitions & available card data
 */
export function determineQuestionType(card: Card): QuestionType {
  const reps = card.srs?.repetitions ?? 0;
  const hasExamples = card.examples && card.examples.length > 0 && card.examples[0].chinese;

  if (reps >= 5 && hasExamples) {
    return "cloze";
  } else if (reps >= 3) {
    return "listening";
  } else {
    return "pinyin_choice";
  }
}

/**
 * Generate a complete QuizQuestion for a card given all deck cards
 */
export function generateQuizQuestion(card: Card, allCards: Card[], forcedType?: QuestionType): QuizQuestion {
  const type = forcedType || determineQuestionType(card);

  if (type === "cloze" && card.examples && card.examples.length > 0) {
    const ex = card.examples[0];
    const blankedChinese = ex.chinese.replaceAll(card.character, " [ _____ ] ");
    const distractors = getCharacterDistractors(card, allCards);
    const options = shuffleArray([card.character, ...distractors]);

    return {
      card,
      type: "cloze",
      prompt: "Điền từ thích hợp vào ô trống trong câu:",
      clozeSentence: blankedChinese,
      clozeTranslation: ex.vietnamese,
      options,
      correctAnswer: card.character,
    };
  }

  if (type === "listening") {
    const distractors = getCharacterDistractors(card, allCards);
    const options = shuffleArray([card.character, ...distractors]);

    return {
      card,
      type: "listening",
      prompt: "Nghe phát âm và chọn Chữ Hán đúng:",
      audioText: card.character,
      subText: card.translation ? `Nghĩa: ${card.translation}` : undefined,
      options,
      correctAnswer: card.character,
    };
  }

  // Default: Pinyin Choice
  const distractors = getPinyinDistractors(card, allCards);
  const options = shuffleArray([card.pinyin, ...distractors]);

  return {
    card,
    type: "pinyin_choice",
    prompt: "Chọn Phiên âm Pinyin & Thanh điệu đúng:",
    targetText: card.character,
    subText: card.translation,
    options,
    correctAnswer: card.pinyin,
  };
}
