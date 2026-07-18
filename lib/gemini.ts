import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

// List of models to try in order if free quota/rate-limits occur
const CANDIDATE_MODELS = ["gemini-3.5-flash"];

async function generateWithFallback(prompt: string): Promise<string> {
  let lastError: any = null;
  for (const modelName of CANDIDATE_MODELS) {
    try {
      console.log(`[Gemini] Attempting generation with model: ${modelName}`);
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: 'application/json',
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

export interface CardData {
  character: string;
  traditional?: string;
  pinyin: string;
  hanviet: string;
  translation: string;
  examples: Array<{
    chinese: string;
    pinyin: string;
    vietnamese: string;
  }>;
  radical?: string;
  strokeCount?: number;
  hskLevel?: number;
  tags?: string[];
}

/**
 * Uses Gemini to auto-fill vocabulary card details for a Chinese word.
 * Returns structured JSON with all fields needed for a flashcard.
 */
export async function generateCardData(input: string): Promise<CardData> {
  const prompt = `Bạn là chuyên gia Hán-Việt. Phân tích từ tiếng Trung: "${input}"
Trả về JSON (CHỈ JSON, không markdown):
{
  "character": "chữ giản thể",
  "traditional": "chữ phồn thể",
  "pinyin": "phiên âm có dấu",
  "hanviet": "âm Hán Việt",
  "translation": "nghĩa ngắn gọn (tối đa 3 nghĩa)",
  "examples": [
    {
      "chinese": "câu ví dụ ngắn",
      "pinyin": "phiên âm câu ví dụ",
      "vietnamese": "dịch nghĩa"
    }
  ],
  "radical": "bộ thủ",
  "strokeCount": 0,
  "hskLevel": 1,
  "tags": ["loại từ"]
}`;

  const text = (await generateWithFallback(prompt)).trim();
  // Strip markdown code fences if present
  const jsonText = text
    .replace(/^```json?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  return JSON.parse(jsonText) as CardData;
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
