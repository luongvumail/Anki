import { APP_CONFIG } from "../constants/config";

/**
 * ================================================================
 * ANKI CHINESE - SRS & FSRS MEMORY ENGINE
 * ================================================================
 *
 * Concepts:
 * 1. SRS (Spaced Repetition System): The overall learning system and card data model.
 *    - Model: `SRSState` (`card.srs`)
 *    - Database column: `srs` (JSONB) and `srs_next_review` (TIMESTAMPTZ)
 *
 * 2. FSRS (Free Spaced Repetition Scheduler): The modern algorithm replacing legacy SM-2.
 *    - Uses Memory Stability `stability` (S) in days and Card Difficulty `difficulty` (D)
 *    - Enum: `FSRSState` (0: New, 1: Learning, 2: Review, 3: Relearning)
 */

// ----------------------------------------------------------------
// 1. SRS Grades / User Ratings
// ----------------------------------------------------------------
export const SRS_GRADES = {
  AGAIN: 1, // Quên / Trả lời sai — reset stability, tăng difficulty
  HARD: 2, // Khó / Phản xạ chậm (>5s) — stability tăng nhẹ
  GOOD: 3, // Tốt / Phản xạ vừa (2.5s - 5s) — stability tăng chuẩn FSRS
  EASY: 4, // Dễ / Phản xạ nhanh (<=2.5s) — stability tăng đột phá
} as const;

export type SRSGrade = (typeof SRS_GRADES)[keyof typeof SRS_GRADES];

// ----------------------------------------------------------------
// 2. FSRS Card Learning State Enum
// ----------------------------------------------------------------
export enum FSRSState {
  New = 0,
  Learning = 1,
  Review = 2,
  Relearning = 3,
}

// ----------------------------------------------------------------
// 3. Card SRS Data Model Interface
// ----------------------------------------------------------------
export interface SRSState {
  repetitions: number; // Total successful review count
  interval: number; // Next review interval in days
  easeFactor: number; // Legacy SM-2 factor retained for backward compatibility
  dueDate: string; // ISO date string when card is next due
  lastReviewedDate?: string; // ISO date string of last review

  // FSRS Specific Parameters
  stability: number; // S: Memory stability in days (time for retention to reach 90%)
  difficulty: number; // D: Card difficulty rating (1.0 to 10.0)
  state: FSRSState; // Current FSRS card state (0..3)
}

// ----------------------------------------------------------------
// 4. Default FSRS Weights (w15 parameter vector)
// ----------------------------------------------------------------
export const FSRS_DEFAULT_PARAMS = {
  w: [
    0.4025, 1.1838, 3.173, 15.691, 7.1949, 0.5345, 1.4604, 0.0046, 1.5457, 0.1192, 1.0192, 1.9395,
    0.11, 0.296, 2.2698, 0.2315, 2.9898,
  ],
  requestRetention: 0.9, // Target 90% memory retention rate
  maximumInterval: 36500, // Max 100 years
} as const;

// ----------------------------------------------------------------
// 5. Helper Functions
// ----------------------------------------------------------------

/**
 * Creates default SRSState for new cards.
 */
export function createDefaultSRSState(): SRSState {
  return {
    repetitions: 0,
    interval: 0,
    easeFactor: APP_CONFIG.DEFAULT_EASE_FACTOR || 2.5,
    dueDate: new Date().toISOString(),
    lastReviewedDate: undefined,
    stability: FSRS_DEFAULT_PARAMS.w[0],
    difficulty: 5.0,
    state: FSRSState.New,
  };
}

/**
 * Ensures legacy SRSState objects (missing FSRS fields) are properly filled with FSRS defaults.
 */
export function normalizeSRSState(current?: Partial<SRSState>): SRSState {
  const defaults = createDefaultSRSState();
  if (!current) return defaults;

  return {
    repetitions: current.repetitions ?? defaults.repetitions,
    interval: current.interval ?? defaults.interval,
    easeFactor: current.easeFactor ?? defaults.easeFactor,
    dueDate: current.dueDate || defaults.dueDate,
    lastReviewedDate: current.lastReviewedDate,
    stability:
      current.stability && current.stability > 0
        ? current.stability
        : current.interval || defaults.stability,
    difficulty:
      current.difficulty && current.difficulty >= 1 ? current.difficulty : defaults.difficulty,
    state:
      current.state !== undefined
        ? current.state
        : current.repetitions && current.repetitions > 0
          ? FSRSState.Review
          : FSRSState.New,
  };
}

/**
 * Calculates current Retrievability R(t, S) based on elapsed days t and stability S.
 * R = (1 + t / (9 * S)) ^ -1
 */
export function calculateRetrievability(elapsedDays: number, stability: number): number {
  if (stability <= 0) return 0;
  return Math.pow(1 + elapsedDays / (9 * stability), -1);
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

/**
 * FSRS Core Algorithm: Calculates the next SRS state based on user grade (1..4).
 */
export function calculateSRS(grade: SRSGrade, currentInput?: Partial<SRSState>): SRSState {
  const current = normalizeSRSState(currentInput);
  const w = FSRS_DEFAULT_PARAMS.w;
  const now = new Date();

  let elapsedDays = 0;
  if (current.lastReviewedDate) {
    const lastDate = new Date(current.lastReviewedDate);
    const diffMs = now.getTime() - lastDate.getTime();
    elapsedDays = Math.max(0, diffMs / (1000 * 60 * 60 * 24));
  } else if (current.repetitions > 0 && current.interval > 0) {
    elapsedDays = current.interval;
  }

  const retrievability =
    current.state === FSRSState.New ? 1.0 : calculateRetrievability(elapsedDays, current.stability);

  let newStability: number;
  let newDifficulty: number;
  let newState: FSRSState;
  let newInterval: number;

  if (current.state === FSRSState.New) {
    // Initial Review
    newStability = w[grade - 1];
    const d0 = w[4] - Math.exp(w[5] * (grade - 1)) + 1;
    newDifficulty = clamp(d0, 1.0, 10.0);
    newState = grade === SRS_GRADES.AGAIN ? FSRSState.Learning : FSRSState.Review;
  } else {
    // Subsequent Review
    // 1. Difficulty Update
    const rawDiff = current.difficulty - w[6] * (grade - 3);
    const meanReversionDiff = w[7] * (w[4] - Math.exp(w[5] * 2) + 1) + (1 - w[7]) * rawDiff;
    newDifficulty = clamp(meanReversionDiff, 1.0, 10.0);

    // 2. Stability Update
    if (grade === SRS_GRADES.AGAIN) {
      // Forgotten: Stability decay formula for FSRS
      const sForget =
        w[11] *
        Math.pow(newDifficulty, -w[12]) *
        (Math.pow(current.stability + 1, w[13]) - 1) *
        Math.exp(w[14] * (1 - retrievability));
      newStability = clamp(sForget, 0.1, current.stability);
      newState = FSRSState.Relearning;
    } else {
      // Recalled (HARD, GOOD, EASY)
      let hardEasyBonus = 1.0;
      if (grade === SRS_GRADES.HARD) hardEasyBonus = w[15];
      if (grade === SRS_GRADES.EASY) hardEasyBonus = w[16];

      const sRecall =
        current.stability *
        (1 +
          Math.exp(w[8]) *
            (11 - newDifficulty) *
            Math.pow(current.stability, -w[9]) *
            (Math.exp(w[10] * (1 - retrievability)) - 1) *
            hardEasyBonus);
      newStability = Math.max(0.1, sRecall);
      newState = FSRSState.Review;
    }
  }

  // 3. Next Review Interval Calculation (Days)
  if (grade === SRS_GRADES.AGAIN) {
    newInterval = 0; // Immediate review within session
  } else {
    // I = S * 9 * (1/R_target - 1) -> when R_target = 0.9, I = S * 1.0 = S
    const targetInterval = newStability * 9 * (1 / FSRS_DEFAULT_PARAMS.requestRetention - 1);
    newInterval = clamp(Math.round(targetInterval), 1, FSRS_DEFAULT_PARAMS.maximumInterval);
  }

  const repetitions = current.repetitions + 1;
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + newInterval);
  dueDate.setHours(0, 0, 0, 0);

  return {
    repetitions,
    interval: newInterval,
    easeFactor: parseFloat(current.easeFactor.toFixed(2)),
    dueDate: dueDate.toISOString(),
    lastReviewedDate: now.toISOString(),
    stability: parseFloat(newStability.toFixed(3)),
    difficulty: parseFloat(newDifficulty.toFixed(2)),
    state: newState,
  };
}

/**
 * Returns true if the card is due for review today or overdue.
 */
export function isDue(srsInput?: Partial<SRSState>): boolean {
  const srs = normalizeSRSState(srsInput);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(srs.dueDate);
  due.setHours(0, 0, 0, 0);
  return due <= today;
}

/**
 * Returns a human-readable next-interval label for SRS buttons/badges (e.g. "1 ngày", "Ôn lại ngay").
 */
export function getIntervalLabel(grade: SRSGrade, current?: Partial<SRSState>): string {
  const next = calculateSRS(grade, current);
  if (next.interval === 0) return "Ôn lại ngay";
  if (next.interval === 1) return "1 ngày";
  if (next.interval < 7) return `${next.interval} ngày`;
  if (next.interval < 30) return `${Math.round(next.interval / 7)} tuần`;
  if (next.interval < 365) return `${Math.round(next.interval / 30)} tháng`;
  return `${Math.round(next.interval / 365)} năm`;
}

export interface QuizMemoryEvaluation {
  newSRS: SRSState;
  grade: SRSGrade;
  speedCategory: "fast" | "normal" | "slow" | "wrong";
  feedbackLabel: string;
}

export type QuizInteractionMode = "choice" | "typing" | "speaking";

/**
 * Returns cognitive response time thresholds (in ms) tailored to the interaction mode:
 * - "choice" (Multiple Choice): Fast <= 3500ms, Normal <= 5000ms
 * - "typing" (Active Recall Typing / Dictation / Cloze): Fast <= 8000ms, Normal <= 15000ms
 * - "speaking" (Voice Recording & Pronunciation): Fast <= 10000ms, Normal <= 18000ms
 */
export function getModeResponseThresholds(interactionMode: QuizInteractionMode = "choice"): {
  fastMs: number;
  slowMs: number;
} {
  if (interactionMode === "typing") {
    return { fastMs: 8000, slowMs: 15000 };
  }
  if (interactionMode === "speaking") {
    return { fastMs: 10000, slowMs: 18000 };
  }
  return {
    fastMs: Math.round(APP_CONFIG.SLOW_RESPONSE_THRESHOLD_MS * 0.7),
    slowMs: APP_CONFIG.SLOW_RESPONSE_THRESHOLD_MS,
  };
}

/**
 * Evaluates memory retention & FSRS rating based on response speed, interaction mode, and correctness.
 * - Incorrect: AGAIN (1)
 * - Retry: HARD (2)
 * - Correct & <= fastMs: EASY (4) -> Reflex fast
 * - Correct & fastMs..slowMs: GOOD (3) -> Normal speed
 * - Correct & > slowMs: HARD (2) -> Hesitant / slow
 */
export function calculateQuizSRS(
  isCorrect: boolean,
  isRetry: boolean,
  responseTimeMs: number,
  currentInput?: Partial<SRSState>,
  interactionMode: QuizInteractionMode = "choice",
): QuizMemoryEvaluation {
  const current = normalizeSRSState(currentInput);
  let grade: SRSGrade;
  let speedCategory: "fast" | "normal" | "slow" | "wrong";
  let feedbackLabel: string;

  const { fastMs: FAST_THRESHOLD_MS, slowMs: SLOW_THRESHOLD_MS } =
    getModeResponseThresholds(interactionMode);

  if (!isCorrect) {
    grade = SRS_GRADES.AGAIN;
    speedCategory = "wrong";
    feedbackLabel = "Chưa chính xác (FSRS Again 🔄)";
  } else if (isRetry) {
    grade = SRS_GRADES.HARD;
    speedCategory = "slow";
    feedbackLabel = "Cần ôn thêm (FSRS Hard ⏳)";
  } else if (responseTimeMs <= FAST_THRESHOLD_MS) {
    grade = SRS_GRADES.EASY;
    speedCategory = "fast";
    feedbackLabel = "Phản xạ xuất sắc (FSRS Easy 🚀)";
  } else if (responseTimeMs <= SLOW_THRESHOLD_MS) {
    grade = SRS_GRADES.GOOD;
    speedCategory = "normal";
    feedbackLabel = "Tốc độ tốt (FSRS Good 👍)";
  } else {
    grade = SRS_GRADES.HARD;
    speedCategory = "slow";
    feedbackLabel = "Phản xạ chậm (FSRS Hard ⏳)";
  }

  const newSRS = calculateSRS(grade, current);
  return { newSRS, grade, speedCategory, feedbackLabel };
}

/**
 * Computes real-time Retrievability R(t, S) in [0, 1] for a card at the current moment.
 * Lower values mean higher risk of forgetting.
 */
export function getCardRetrievability(srsInput?: Partial<SRSState>): number {
  const srs = normalizeSRSState(srsInput);
  if (srs.state === FSRSState.New) return 0;

  const now = Date.now();
  let elapsedDays = 0;
  if (srs.lastReviewedDate) {
    const lastMs = new Date(srs.lastReviewedDate).getTime();
    if (!Number.isNaN(lastMs)) {
      elapsedDays = Math.max(0, (now - lastMs) / (1000 * 60 * 60 * 24));
    }
  } else if (srs.dueDate) {
    const dueMs = new Date(srs.dueDate).getTime();
    if (!Number.isNaN(dueMs)) {
      const daysUntilDue = (dueMs - now) / (1000 * 60 * 60 * 24);
      elapsedDays = Math.max(0, (srs.interval || 1) - daysUntilDue);
    }
  }

  return calculateRetrievability(elapsedDays, srs.stability);
}

/**
 * Prioritizes cards according to FSRS memory principles:
 * 1. Due or Relearning/Learning cards come first.
 * 2. Cards with lowest Retrievability R(t, S) and highest Difficulty D are prioritized.
 * 3. Adds slight jitter (0..0.04) so repeated practice sessions maintain variety among similarly urgent cards.
 */
export function selectCardsByFSRSPriority<T extends { srs?: Partial<SRSState> }>(
  cards: T[],
  limit?: number,
): T[] {
  if (!cards || cards.length === 0) return [];

  const scored = cards.map((card) => {
    const srs = normalizeSRSState(card.srs);
    const dueFlag = isDue(srs) ? 0 : 1; // 0 = Due (higher priority), 1 = Not due yet
    const r = getCardRetrievability(srs); // Lower R = closer to forgetting
    const diffWeight = (10 - srs.difficulty) * 0.015; // Higher difficulty -> smaller score -> higher priority
    const jitter = Math.random() * 0.04;
    const priorityScore = dueFlag * 10 + r + diffWeight + jitter;
    return { card, priorityScore };
  });

  scored.sort((a, b) => a.priorityScore - b.priorityScore);
  const sortedCards = scored.map((item) => item.card);
  return typeof limit === "number" && limit > 0 ? sortedCards.slice(0, limit) : sortedCards;
}

// ================================================================
// Backward Compatibility Aliases
// Ensures any existing imports for FSRSGrade / calculateFSRS work 100% seamlessly.
// ================================================================
export const FSRS_GRADES = SRS_GRADES;
export type FSRSGrade = SRSGrade;
export const createDefaultFSRSState = createDefaultSRSState;
export const normalizeFSRSState = normalizeSRSState;
export const calculateFSRS = calculateSRS;
export const calculateQuizFSRS = calculateQuizSRS;
