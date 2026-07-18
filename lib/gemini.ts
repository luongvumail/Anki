import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

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
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `Bạn là chuyên gia ngôn ngữ Hán-Việt. Hãy phân tích từ tiếng Trung: "${input}"

Trả về JSON (CHỈ JSON, không kèm markdown hay giải thích):
{
  "character": "chữ giản thể",
  "traditional": "chữ phồn thể (nếu khác giản thể)",
  "pinyin": "phiên âm đầy đủ có dấu thanh",
  "hanviet": "âm Hán Việt tương ứng",
  "translation": "nghĩa tiếng Việt ngắn gọn (tối đa 5 nghĩa, cách nhau bởi dấu phẩy)",
  "examples": [
    {
      "chinese": "câu ví dụ 1 tiếng Trung",
      "pinyin": "phiên âm câu ví dụ 1",
      "vietnamese": "dịch nghĩa tiếng Việt"
    },
    {
      "chinese": "câu ví dụ 2 tiếng Trung",
      "pinyin": "phiên âm câu ví dụ 2",
      "vietnamese": "dịch nghĩa tiếng Việt"
    }
  ],
  "radical": "bộ thủ (nếu biết)",
  "strokeCount": số nét (number),
  "hskLevel": cấp độ HSK 1-6 (number hoặc null),
  "tags": ["danh từ/động từ/tính từ/...", "chủ đề liên quan"]
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  // Strip markdown code fences if present
  const jsonText = text.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();

  const data = JSON.parse(jsonText) as CardData;
  return data;
}

/**
 * Generates a fill-in-the-blank quiz sentence for a given word.
 */
export async function generateQuizSentence(character: string, translation: string): Promise<{
  sentence: string;
  pinyin: string;
  answer: string;
  vietnamese: string;
}> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const prompt = `Tạo 1 câu tiếng Trung có dùng từ "${character}" (nghĩa: ${translation}), trong đó thay thế từ đó bằng ___. 
Trả về JSON:
{
  "sentence": "câu có dấu ___",
  "pinyin": "phiên âm câu (thay ___ bằng ___)",  
  "answer": "${character}",
  "vietnamese": "dịch nghĩa tiếng Việt"
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  const jsonText = text.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
  return JSON.parse(jsonText);
}
