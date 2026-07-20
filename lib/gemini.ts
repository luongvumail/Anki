import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

// gemini-3.5-flash: latest GA model, fast & capable (July 2026)
// gemini-3.1-flash-lite: cheapest fallback ($0.25/$1.50 per 1M tokens)
const CANDIDATE_MODELS = ["gemini-3.5-flash", "gemini-3.1-flash-lite"];

async function generateWithFallback(prompt: string): Promise<string> {
  let lastError: any = null;
  for (const modelName of CANDIDATE_MODELS) {
    try {
      console.log(`[Gemini] Attempting generation with model: ${modelName}`);
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      console.log(`[Gemini] Success using model: ${modelName}`);
      return text;
    } catch (err: any) {
      console.warn(
        `[Gemini] Model ${modelName} failed (${err.message || err}), trying fallback...`,
      );
      lastError = err;
    }
  }
  throw lastError;
}

function sanitizeInput(input: string): string {
  return input
    .trim()
    .slice(0, 50)
    .replace(/["'\\n\r]/g, " ");
}

export interface CardData {
  character: string;
  traditional?: string;
  pinyin: string;
  hanviet?: string;
  translation: string;
  examples: {
    chinese: string;
    pinyin: string;
    vietnamese: string;
  }[];
  radical?: string;
  strokeCount?: number;
  hskLevel?: number;
  tags?: string[];
}

/**
 * Uses Gemini to auto-fill vocabulary card details for a single Chinese word.
 */
export async function generateCardData(input: string): Promise<CardData> {
  const cleanInput = sanitizeInput(input);
  const prompt = `Bạn là chuyên gia Hán-Việt. Phân tích chi tiết từ tiếng Trung: "${cleanInput}"

LƯU Ý QUAN TRỌNG VỀ BỘ THỦ:
Trường "radical" phải phân tích rõ cấu tạo chữ từ các bộ thủ chính VÀ TÊN HÁN VIỆT CỦA CÁC BỘ THỦ ĐÓ.
Ví dụ:
- "休": "Gồm bộ Nhân (人/亻 - người) + bộ Mộc (木 - cây)"
- "语": "Gồm bộ Ngôn (言/讠 - lời nói) + bộ Ngũ (五) + bộ Khẩu (口 - miệng)"

Trả về JSON (CHỈ JSON, không markdown):
{
  "character": "chữ giản thể",
  "traditional": "chữ phồn thể",
  "pinyin": "phiên âm có dấu",
  "translation": "nghĩa tiếng Việt ngắn gọn (tối đa 3 nghĩa)",
  "examples": [
    {
      "chinese": "câu ví dụ ngắn",
      "pinyin": "phiên âm câu ví dụ",
      "vietnamese": "dịch nghĩa"
    }
  ],
  "radical": "tên bộ thủ và cấu tạo chữ đầy đủ",
  "strokeCount": 0,
  "hskLevel": 1,
  "tags": ["loại từ"]
}`;

  const text = (await generateWithFallback(prompt)).trim();
  const jsonText = text
    .replace(/^```json?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  return JSON.parse(jsonText) as CardData;
}

/**
 * Uses a SINGLE Gemini request to generate card data for multiple Chinese words at once.
 * Much faster and cheaper than calling generateCardData() separately for each word.
 * Falls back to parallel individual calls if the batch prompt fails.
 */
export async function generateCardDataBatch(inputs: string[]): Promise<CardData[]> {
  if (inputs.length === 0) return [];
  if (inputs.length === 1) return [await generateCardData(inputs[0])];

  const cleanInputs = inputs.map(sanitizeInput);
  const wordList = cleanInputs.map((w, i) => `${i + 1}. "${w}"`).join("\n");

  const prompt = `Bạn là chuyên gia Hán-Việt. Phân tích chi tiết các từ tiếng Trung sau đây:
${wordList}

LƯU Ý QUAN TRỌNG VỀ BỘ THỦ:
Trường "radical" phải phân tích rõ cấu tạo chữ từ các bộ thủ chính VÀ TÊN HÁN VIỆT CỦA CÁC BỘ THỦ ĐÓ.
Ví dụ:
- "休": "Gồm bộ Nhân (人/亻 - người) + bộ Mộc (木 - cây)"
- "语": "Gồm bộ Ngôn (言/讠 - lời nói) + bộ Ngũ (五) + bộ Khẩu (口 - miệng)"

Trả về JSON array (CHỈ JSON array, không markdown), với mỗi phần tử theo thứ tự tương ứng:
[
  {
    "character": "chữ giản thể",
    "traditional": "chữ phồn thể",
    "pinyin": "phiên âm có dấu",
    "translation": "nghĩa tiếng Việt ngắn gọn (tối đa 3 nghĩa)",
    "examples": [
      {
        "chinese": "câu ví dụ ngắn",
        "pinyin": "phiên âm câu ví dụ",
        "vietnamese": "dịch nghĩa"
      }
    ],
    "radical": "tên bộ thủ và cấu tạo chữ đầy đủ",
    "strokeCount": 0,
    "hskLevel": 1,
    "tags": ["loại từ"]
  }
]`;

  try {
    const text = (await generateWithFallback(prompt)).trim();
    const jsonText = text
      .replace(/^```json?\s*/i, "")
      .replace(/```\s*$/, "")
      .trim();
    const results = JSON.parse(jsonText) as CardData[];
    if (!Array.isArray(results) || results.length !== inputs.length) {
      throw new Error(`Expected ${inputs.length} results, got ${results.length}`);
    }
    return results;
  } catch (err) {
    // Fallback: parallel individual calls if batch fails
    console.warn("[Gemini] Batch failed, falling back to parallel individual calls:", err);
    return Promise.all(inputs.map((input) => generateCardData(input)));
  }
}

/**
 * Generates a fill-in-the-blank quiz sentence for a given word.
 */
export async function generateQuizSentence(
  character: string,
  translation: string,
): Promise<{
  sentence: string;
  pinyin: string;
  answer: string;
  vietnamese: string;
}> {
  const prompt = `Tạo 1 câu tiếng Trung có dùng từ "${character}" (nghĩa: ${translation}), trong đó thay thế từ đó bằng ___. 
Trả về JSON:
{
  "sentence": "câu có dấu ___",
  "pinyin": "phiên âm câu (thay ___ bằng ___)",  
  "answer": "${character}",
  "vietnamese": "dịch nghĩa tiếng Việt"
}`;

  const text = (await generateWithFallback(prompt)).trim();
  const jsonText = text
    .replace(/^```json?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  return JSON.parse(jsonText);
}
