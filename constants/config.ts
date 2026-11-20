/**
 * Global App Configurations & Magic Numbers
 */

export const APP_CONFIG = {
  // Splash & Auth transitions
  SPLASH_MIN_DISPLAY_MS: 1500,
  SPLASH_FADE_MS: 450,
  LOGOUT_FADE_MS: 400,
  LOGOUT_SPLASH_DELAY_MS: 250,

  // Pagination & Session limits
  PAGE_SIZE: 20,
  MAX_SESSION_CARDS: 10,

  // FSRS & Study Thresholds
  SLOW_RESPONSE_THRESHOLD_MS: 5000,
  REPAIR_SLOW_THRESHOLD_MS: 5000,
  DEFAULT_EASE_FACTOR: 2.5,
  MIN_EASE_FACTOR: 1.3,

  // Debounce & Timeout
  GEMINI_DEBOUNCE_MS: 150,
  FIRESTORE_TIMEOUT_MS: 10000,

  // Audio Speech
  SPEECH_RATE: 0.8,

  // User Levels (XP required per level step)
  XP_PER_LEVEL: 100,

  // Quiz Fallback Distractors
  QUIZ_FALLBACKS: {
    CHARACTERS: ["好", "你", "学", "中", "国", "人", "爱", "生", "水", "大", "小", "日"],
    PINYINS: ["hǎo", "nǐ", "xué", "zhōng", "guó", "rén", "ài", "shēng", "shuǐ", "dà"],
    TRANSLATIONS: [
      "Xin chào",
      "Tốt / Hảo",
      "Học sinh",
      "Cảm ơn",
      "Nước uống",
      "To lớn",
      "Tạm biệt",
      "Yêu thương",
      "Bạn bè",
      "Thức ăn",
    ],
  },
} as const;
