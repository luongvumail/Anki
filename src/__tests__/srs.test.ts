import { calculateSRS, getToneColor, SRSParams, SRSResult } from '../utils/srs';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Run n consecutive 'easy' reviews starting from given state. */
function repeatEasy(n: number, initial: SRSParams): SRSResult {
  let state: SRSResult = calculateSRS('easy', initial);
  for (let i = 1; i < n; i++) {
    state = calculateSRS('easy', state);
  }
  return state;
}

const INIT: SRSParams = { repetitions: 0, easeFactor: 2.5, intervalDays: 0 };

// ─── calculateSRS ────────────────────────────────────────────────────────────

describe('calculateSRS — grading', () => {
  describe('easy', () => {
    it('first easy: interval = 1 day, reps = 1, ef increases', () => {
      const r = calculateSRS('easy', INIT);
      expect(r.repetitions).toBe(1);
      expect(r.intervalDays).toBe(1);
      expect(r.easeFactor).toBeCloseTo(2.65);
      expect(r.status).toBe('learning');
    });

    it('second easy: interval = 4 days, reps = 2', () => {
      const r = calculateSRS('easy', calculateSRS('easy', INIT));
      expect(r.repetitions).toBe(2);
      expect(r.intervalDays).toBe(4);
      expect(r.status).toBe('reviewing');
    });

    it('third easy: interval = ceil(4 * ef)', () => {
      const after2 = repeatEasy(2, INIT);
      const after3 = calculateSRS('easy', after2);
      expect(after3.intervalDays).toBe(Math.ceil(4 * after2.easeFactor));
    });

    it('easeFactor grows by 0.15 each easy', () => {
      const r1 = calculateSRS('easy', INIT);
      expect(r1.easeFactor).toBeCloseTo(INIT.easeFactor + 0.15);
    });

    it('easeFactor is capped at 4.0 after many easy reviews', () => {
      const r = repeatEasy(30, INIT);
      expect(r.easeFactor).toBeLessThanOrEqual(4.0);
      expect(r.easeFactor).toBeCloseTo(4.0);
    });
  });

  describe('hard', () => {
    it('hard: interval = 2 days, reps increments, ef unchanged', () => {
      const r = calculateSRS('hard', INIT);
      expect(r.repetitions).toBe(1);
      expect(r.intervalDays).toBe(2);
      expect(r.easeFactor).toBeCloseTo(INIT.easeFactor); // ef unchanged on hard
    });

    it('hard always sets interval to 2 regardless of previous interval', () => {
      const after5 = repeatEasy(5, INIT);
      const r = calculateSRS('hard', after5);
      expect(r.intervalDays).toBe(2);
    });
  });

  describe('forgot', () => {
    it('forgot: reps reset to 0, interval = 1, ef reduced by 0.2', () => {
      const state = repeatEasy(3, INIT); // reps = 3, ef = 2.95
      const r = calculateSRS('forgot', state);
      expect(r.repetitions).toBe(0);
      expect(r.intervalDays).toBe(1);
      expect(r.easeFactor).toBeCloseTo(state.easeFactor - 0.2);
      expect(r.status).toBe('learning');
    });

    it('easeFactor floors at 1.3 after forgot', () => {
      const r = calculateSRS('forgot', { ...INIT, easeFactor: 1.35 });
      expect(r.easeFactor).toBeCloseTo(1.3);
    });

    it('forgot at ef = 1.3 stays at 1.3', () => {
      const r = calculateSRS('forgot', { ...INIT, easeFactor: 1.3 });
      expect(r.easeFactor).toBeCloseTo(1.3);
    });
  });
});

// ─── Status thresholds ───────────────────────────────────────────────────────

describe('calculateSRS — status', () => {
  it('status = learning when reps < 2', () => {
    expect(calculateSRS('easy', INIT).status).toBe('learning');
  });

  it('status = reviewing when reps >= 2 and < 5', () => {
    expect(repeatEasy(2, INIT).status).toBe('reviewing');
    expect(repeatEasy(4, INIT).status).toBe('reviewing');
  });

  it('status = mastered when reps >= 5', () => {
    expect(repeatEasy(5, INIT).status).toBe('mastered');
    expect(repeatEasy(10, INIT).status).toBe('mastered');
  });
});

// ─── nextReviewAt ────────────────────────────────────────────────────────────

describe('calculateSRS — nextReviewAt', () => {
  it('next review is in the future (intervalDays > 0)', () => {
    const r = calculateSRS('easy', INIT);
    expect(r.nextReviewAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('next review is exactly intervalDays from now (midnight local)', () => {
    const r = calculateSRS('easy', INIT); // intervalDays = 1
    const tomorrow = new Date();
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(r.nextReviewAt.getTime()).toBe(tomorrow.getTime());
  });

  it('forgot card review starts tomorrow (intervalDays = 1)', () => {
    const r = calculateSRS('forgot', INIT);
    const tomorrow = new Date();
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(r.nextReviewAt.getTime()).toBe(tomorrow.getTime());
  });
});

// ─── Default value handling ───────────────────────────────────────────────────

describe('calculateSRS — default/edge values', () => {
  it('handles easeFactor < 1.3 by defaulting to 2.5', () => {
    const r = calculateSRS('easy', { ...INIT, easeFactor: 0.5 });
    expect(r.easeFactor).toBeGreaterThan(1.3);
  });

  it('handles negative repetitions by defaulting to 0', () => {
    const r = calculateSRS('easy', { ...INIT, repetitions: -5 });
    expect(r.repetitions).toBe(1); // 0 + 1
    expect(r.intervalDays).toBe(1); // first review interval
  });
});

// ─── getToneColor ─────────────────────────────────────────────────────────────

describe('getToneColor', () => {
  it('Tone 1 (ā ē ī ō ū) → red #FF3B30', () => {
    expect(getToneColor('māo')).toBe('#FF3B30');
    expect(getToneColor('tī')).toBe('#FF3B30');
    expect(getToneColor('pīn')).toBe('#FF3B30');
  });

  it('Tone 2 (á é í ó ú) → yellow #FFCC00', () => {
    expect(getToneColor('máo')).toBe('#FFCC00');
    expect(getToneColor('nín')).toBe('#FFCC00');
  });

  it('Tone 3 (ǎ ě ǐ ǒ ǔ) → green #34C759', () => {
    expect(getToneColor('mǎo')).toBe('#34C759');
    expect(getToneColor('nǐ')).toBe('#34C759');
  });

  it('Tone 4 (à è ì ò ù) → blue #007AFF', () => {
    expect(getToneColor('mào')).toBe('#007AFF');
    expect(getToneColor('shì')).toBe('#007AFF');
  });

  it('Neutral (no tone mark) → gray #8E8E93', () => {
    expect(getToneColor('ma')).toBe('#8E8E93');
    expect(getToneColor('de')).toBe('#8E8E93');
    expect(getToneColor('le')).toBe('#8E8E93');
  });

  it('First tone match wins (tone 1 before tone 2 in same syllable is invalid pinyin, but regex is first-match)', () => {
    // Real pinyin will never have two tones, but ensure no crashes
    expect(getToneColor('āá')).toBe('#FF3B30'); // t1 matched first
  });
});

// ─── Integration: full study session simulation ───────────────────────────────

describe('SRS — full session simulation', () => {
  it('new word learned over 5 sessions reaches mastered', () => {
    let state: SRSResult = calculateSRS('easy', INIT);
    // Simulate: easy, easy, easy, easy (total 5)
    for (let i = 1; i < 5; i++) {
      state = calculateSRS('easy', state);
    }
    expect(state.status).toBe('mastered');
    expect(state.repetitions).toBe(5);
  });

  it('forgot recovery: reps reset but ef decreases', () => {
    const state3Easy = repeatEasy(3, INIT);
    const afterForgot = calculateSRS('forgot', state3Easy);
    expect(afterForgot.repetitions).toBe(0);
    expect(afterForgot.easeFactor).toBeLessThan(state3Easy.easeFactor);
  });

  it('hard does not reset repetitions', () => {
    const state = repeatEasy(3, INIT);
    const afterHard = calculateSRS('hard', state);
    expect(afterHard.repetitions).toBe(state.repetitions + 1);
  });

  it('intervals grow monotonically with consecutive easy reviews', () => {
    const intervals: number[] = [];
    let state = INIT;
    for (let i = 0; i < 6; i++) {
      state = calculateSRS('easy', state);
      intervals.push(state.intervalDays);
    }
    // From rep 3+ each interval should be >= previous
    for (let i = 2; i < intervals.length; i++) {
      expect(intervals[i]).toBeGreaterThanOrEqual(intervals[i - 1]);
    }
  });
});
