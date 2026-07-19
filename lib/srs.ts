/**
 * SuperMemo-2 (SM-2) Spaced Repetition Algorithm
 * Ported to TypeScript for the Anki app.
 */

export const SRS_GRADES = {
  AGAIN: 1, // Quên hoàn toàn — ôn lại ngay
  HARD: 3, // Khó — nhớ nhưng rất mất công
  GOOD: 4, // Tốt — nhớ sau khi suy nghĩ nhẹ
  EASY: 5, // Dễ — nhớ ngay lập tức
} as const;

export type SRSGrade = (typeof SRS_GRADES)[keyof typeof SRS_GRADES];

export interface SRSState {
  repetitions: number;
  interval: number; // days
  easeFactor: number; // default 2.5
  dueDate: string; // ISO date string
}

export function createDefaultSRSState(): SRSState {
  return {
    repetitions: 0,
    interval: 0,
    easeFactor: 2.5,
    dueDate: new Date().toISOString(),
  };
}

export const DEFAULT_SRS_STATE: SRSState = {
  get repetitions() {
    return 0;
  },
  get interval() {
    return 0;
  },
  get easeFactor() {
    return 2.5;
  },
  get dueDate() {
    return new Date().toISOString();
  },
};

/**
 * Calculates the next SRS state based on the grade given.
 */
export function calculateSRS(grade: SRSGrade, current: SRSState): SRSState {
  let { repetitions, interval, easeFactor } = current;

  // Clamp ease factor minimum
  if (easeFactor < 1.3) easeFactor = 1.3;

  if (grade < 3) {
    // Failed — reset streak, ôn lại ngay trong buổi (interval = 0 = due now)
    repetitions = 0;
    interval = 0;
  } else {
    // Passed
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.ceil(interval * easeFactor);
    }
    repetitions += 1;
  }

  // Update ease factor using SM-2 formula
  easeFactor = easeFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + interval);
  dueDate.setHours(0, 0, 0, 0);

  return {
    repetitions,
    interval,
    easeFactor: parseFloat(easeFactor.toFixed(2)),
    dueDate: dueDate.toISOString(),
  };
}

/**
 * Returns true if the card is due for review today or overdue.
 */
export function isDue(srs: SRSState): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(srs.dueDate);
  due.setHours(0, 0, 0, 0);
  return due <= today;
}

/**
 * Returns a human-readable next-interval label for SRS buttons.
 */
export function getIntervalLabel(grade: SRSGrade, current: SRSState): string {
  const next = calculateSRS(grade, current);
  if (next.interval === 0) return "Ngay bây giờ";
  if (next.interval === 1) return "1 ngày";
  if (next.interval < 7) return `${next.interval} ngày`;
  if (next.interval < 30) return `${Math.round(next.interval / 7)} tuần`;
  if (next.interval < 365) return `${Math.round(next.interval / 30)} tháng`;
  return `${Math.round(next.interval / 365)} năm`;
}
