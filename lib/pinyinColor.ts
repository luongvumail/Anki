// Pinyin Tone Soft Neon Color Mapping Helper for Anki
// Tone 1: Electric Cyan (#22D3EE)
// Tone 2: Emerald Green (#34D399)
// Tone 3: Soft Purple (#C084FC)
// Tone 4: Neon Coral (#FB7185)

export const TONE_NEON_COLORS = {
  cyan: "#22D3EE",
  emerald: "#34D399",
  purple: "#C084FC",
  coral: "#FB7185",
} as const;

const TONE1_REGEX = /[āēīōūǖ1]/i;
const TONE2_REGEX = /[áéíóúǘ2]/i;
const TONE3_REGEX = /[ǎěǐǒǔǚ3]/i;
const TONE4_REGEX = /[àèìòùǜ4]/i;

export function getPinyinToneColor(pinyin: string): string {
  if (!pinyin) return TONE_NEON_COLORS.cyan;

  if (TONE1_REGEX.test(pinyin)) return TONE_NEON_COLORS.cyan; // Tone 1 (Flat High) -> Electric Cyan
  if (TONE2_REGEX.test(pinyin)) return TONE_NEON_COLORS.emerald; // Tone 2 (Rising) -> Emerald Green
  if (TONE3_REGEX.test(pinyin)) return TONE_NEON_COLORS.purple; // Tone 3 (Falling-Rising) -> Soft Purple
  if (TONE4_REGEX.test(pinyin)) return TONE_NEON_COLORS.coral; // Tone 4 (Falling) -> Neon Coral

  return TONE_NEON_COLORS.cyan;
}

export function getToneLabel(pinyin: string): string {
  if (!pinyin) return "Thanh 1";
  if (TONE1_REGEX.test(pinyin)) return "Thanh 1 (Ngang)";
  if (TONE2_REGEX.test(pinyin)) return "Thanh 2 (Sắc)";
  if (TONE3_REGEX.test(pinyin)) return "Thanh 3 (Hỏi)";
  if (TONE4_REGEX.test(pinyin)) return "Thanh 4 (Huyền / Nặng)";
  return "Thanh nhẹ";
}
