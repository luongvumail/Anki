import { Palette } from '../constants/theme';

// Spaced Repetition System (SRS) Utility utilizing SM-2 Variant logic

export interface SRSParams {
  repetitions: number; // Số lần trả lời đúng liên tiếp (repetitions)
  easeFactor: number; // Hệ số độ dễ của từ (ease_factor)
  intervalDays: number; // Khoảng thời gian chờ tính bằng ngày (interval_days)
}

export interface SRSResult extends SRSParams {
  nextReviewAt: Date;
  status: 'learning' | 'reviewing' | 'mastered';
}

/**
 * Calculates the next SRS interval, ease factor, and repetitions based on user input.
 *
 * @param grade 'easy' (Vuốt phải) | 'hard' (Vuốt lên) | 'forgot' (Vuốt trái)
 * @param current Current SRS parameters
 * @returns Updated SRS parameters and next review date
 */
export function calculateSRS(grade: 'easy' | 'hard' | 'forgot', current: SRSParams): SRSResult {
  let { repetitions, easeFactor, intervalDays } = current;

  // Set default values if uninitialized
  if (easeFactor === undefined || easeFactor < 1.3) easeFactor = 2.5;
  if (repetitions === undefined || repetitions < 0) repetitions = 0;
  if (intervalDays === undefined || intervalDays < 0) intervalDays = 0;

  if (grade === 'forgot') {
    // 1. Nếu người dùng chọn "Quên" (Vuốt trái):
    repetitions = 0;
    intervalDays = 1; // Khoảng thời gian chờ đặt về mặc định: 1 ngày
    easeFactor = Math.max(1.3, easeFactor - 0.2); // Hệ số độ dễ bị giảm đi 0.2, tối thiểu 1.3
  } else if (grade === 'hard') {
    // 2. Nếu người dùng chọn "Khó" (Vuốt lên):
    repetitions += 1;
    intervalDays = 2; // Khoảng thời gian chờ đặt cố định: 2 ngày để kiểm tra lại độ phản xạ sớm
    // Hệ số độ dễ được giữ nguyên
  } else {
    // 3. Nếu người dùng chọn "Dễ" (Vuốt phải):
    if (repetitions === 0) {
      intervalDays = 1; // Nếu là lần đúng đầu tiên: Khoảng thời gian chờ là 1 ngày
    } else if (repetitions === 1) {
      intervalDays = 4; // Nếu là lần đúng thứ hai liên tiếp: Khoảng thời gian chờ là 4 ngày
    } else {
      // Nếu từ lần đúng thứ ba trở đi: Khoảng thời gian chờ mới = Khoảng thời gian chờ cũ * Hệ số độ dễ
      intervalDays = Math.ceil(intervalDays * easeFactor);
    }
    repetitions += 1;
    easeFactor = Math.min(4.0, easeFactor + 0.15); // Cap at 4.0 to prevent unbounded interval growth
  }

  // Determine learning status
  let status: 'learning' | 'reviewing' | 'mastered' = 'learning';
  if (repetitions >= 5) {
    status = 'mastered';
  } else if (repetitions >= 2) {
    status = 'reviewing';
  }

  const nextReviewAt = new Date();
  nextReviewAt.setHours(0, 0, 0, 0); // Start of day review
  nextReviewAt.setDate(nextReviewAt.getDate() + intervalDays);

  return {
    repetitions,
    easeFactor,
    intervalDays,
    nextReviewAt,
    status,
  };
}

/**
 * Format color based on Pinyin tones for rich visual presentation.
 * Tone 1: Red (#FF3B30)
 * Tone 2: Yellow (#FFCC00)
 * Tone 3: Green (#34C759)
 * Tone 4: Blue (#007AFF)
 * Neutral/Tone 5: Gray (#8E8E93)
 */
export function getToneColor(pinyin: string): string {
  // Chinese tone matching logic
  // Tone 1: ā, ē, ī, ō, ū, ǖ, āo, ōu, etc.
  // Tone 2: á, é, í, ó, ú, ǘ
  // Tone 3: ǎ, ě, ǐ, ǒ, ǔ, ǚ
  // Tone 4: à, è, ì, ò, ù, ǜ
  const t1 = /[āēīōūǖ]/i;
  const t2 = /[áéíóúǘ]/i;
  const t3 = /[ǎěǐǒǔǚ]/i;
  const t4 = /[àèìòùǜ]/i;

  if (t1.test(pinyin)) return Palette.tone1;
  if (t2.test(pinyin)) return Palette.tone2;
  if (t3.test(pinyin)) return Palette.tone3;
  if (t4.test(pinyin)) return Palette.tone4;

  return Palette.toneNeutral; // Neutral tone
}
