import { GoogleGenerativeAI } from "@google/generative-ai";
import { APP_CONFIG } from "../constants/config";

const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

const CANDIDATE_MODELS = [
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-2.5-flash",
  "gemini-1.5-flash",
];

/**
 * Sleep helper for retry backoff
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function generateWithModels(
  prompt: string,
  responseMimeType?: string,
  temperature = 0.1,
  inlineImage?: { data: string; mimeType: string } | { data: string; mimeType: string }[],
): Promise<string> {
  let lastError: unknown = null;

  for (const modelName of CANDIDATE_MODELS) {
    // Retry up to 2 times for transient errors or 429 rate limits
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        if (__DEV__)
          console.log(
            `[Gemini] Attempting generation with model: ${modelName} (attempt ${attempt + 1})`,
          );
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            ...(responseMimeType ? { responseMimeType } : {}),
            temperature,
          },
        });

        let parts: any[] = [prompt];
        if (inlineImage) {
          if (Array.isArray(inlineImage)) {
            parts = [
              ...inlineImage.map((img) => ({
                inlineData: {
                  data: img.data,
                  mimeType: img.mimeType,
                },
              })),
              prompt,
            ];
          } else {
            parts = [
              prompt,
              {
                inlineData: {
                  data: inlineImage.data,
                  mimeType: inlineImage.mimeType,
                },
              },
            ];
          }
        }

        const result = inlineImage ? await model.generateContent(parts) : await model.generateContent(prompt);
        const text = result.response.text();
        if (__DEV__) console.log(`[Gemini] Success using model: ${modelName}`);
        return text;
      } catch (err: unknown) {
        lastError = err;
        const msg = err instanceof Error ? err.message : String(err);
        const isRateLimit =
          msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota");

        console.warn(`[Gemini] Model ${modelName} attempt ${attempt + 1} failed: ${msg}`);

        if (isRateLimit && attempt === 0) {
          // Wait 1.5s before second attempt on same model
          await delay(1500);
          continue;
        }
        break; // Move to fallback model
      }
    }
  }

  throw lastError;
}

function generateWithFallback(prompt: string): Promise<string> {
  return generateWithModels(prompt, "application/json", 0.1);
}

function generateVisionWithFallback(
  prompt: string,
  base64Data: string,
  mimeType: string,
): Promise<string> {
  return generateWithModels(prompt, "application/json", 0.1, {
    data: base64Data,
    mimeType,
  });
}

function generateMultiVisionWithFallback(
  prompt: string,
  images: { data: string; mimeType: string }[],
): Promise<string> {
  return generateWithModels(prompt, "application/json", 0.1, images);
}

function generateWithFallbackText(prompt: string): Promise<string> {
  return generateWithModels(prompt, undefined, 0.3);
}

function sanitizeInput(input: string): string {
  return input
    .trim()
    .slice(0, 1000)
    .replace(/[`"'{}\\[\]\n\r]/g, " ")
    .replace(/\s+/g, " ");
}

/**
 * Debounce & queue helper for AI requests to prevent API spamming and concurrency stampedes
 */
let lastRequestTime = 0;
let rateLimitQueue = Promise.resolve();

async function enforceRateLimit(): Promise<void> {
  rateLimitQueue = rateLimitQueue.then(async () => {
    const now = Date.now();
    const elapsed = now - lastRequestTime;
    if (elapsed < APP_CONFIG.GEMINI_DEBOUNCE_MS) {
      await new Promise((resolve) => setTimeout(resolve, APP_CONFIG.GEMINI_DEBOUNCE_MS - elapsed));
    }
    lastRequestTime = Date.now();
  });
  return rateLimitQueue;
}

/**
 * Robust JSON extraction helper: strips markdown blocks, preamble/postscript text, and trailing commas.
 */
function extractCleanJson(rawText: string): string {
  let cleaned = rawText.trim();
  cleaned = cleaned
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  const firstBracket = cleaned.indexOf("[");

  if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
    const lastBracket = cleaned.lastIndexOf("]");
    if (lastBracket !== -1) {
      cleaned = cleaned.slice(firstBracket, lastBracket + 1);
    }
  } else if (firstBrace !== -1) {
    const lastBrace = cleaned.lastIndexOf("}");
    if (lastBrace !== -1) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }
  }

  cleaned = cleaned.replace(/,\s*([\}\]])/g, "$1");
  return cleaned;
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
  await enforceRateLimit();
  const cleanInput = sanitizeInput(input);
  const prompt = `Bạn là chuyên gia Hán-Việt. Phân tích chi tiết từ tiếng Trung: "${cleanInput}"

TRƯỜNG "radical" — BẮT BUỘC, NGẮN GỌN TỐI ĐA 2 CÂU:
Câu 1: bộ thủ cấu thành (tên Hán-Việt + ký tự + nghĩa). Câu 2: mẹo nhớ hình ảnh.
Ví dụ: "好: bộ Nữ (女) + bộ Tử (子). Mẹ ôm con → tốt đẹp."
Ví dụ: "休: bộ Nhân (亻) + bộ Mộc (木). Người tựa cây nghỉ ngơi."

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
  "radical": "tối đa 2 câu: bộ thủ + mẹo nhớ",
  "strokeCount": 0,
  "hskLevel": 1,
  "tags": ["loại từ"]
}`;

  const text = await generateWithFallback(prompt);
  const jsonText = extractCleanJson(text);
  if (!jsonText) {
    throw new Error("AI không phản hồi dữ liệu JSON hợp lệ.");
  }
  const parsed = JSON.parse(jsonText);
  return validateSingleCardData(parsed);
}

/**
 * Runtime schema validator for CardData objects.
 */
export function validateSingleCardData(raw: unknown): CardData {
  if (!raw || typeof raw !== "object") {
    throw new Error("Dữ liệu AI trả về không hợp lệ.");
  }
  const item = raw as Record<string, unknown>;
  return {
    character: typeof item.character === "string" ? item.character : "",
    traditional: typeof item.traditional === "string" ? item.traditional : undefined,
    pinyin: typeof item.pinyin === "string" ? item.pinyin : "",
    hanviet: typeof item.hanviet === "string" ? item.hanviet : undefined,
    translation: typeof item.translation === "string" ? item.translation : "",
    examples: Array.isArray(item.examples)
      ? item.examples.map((ex: unknown) => {
          if (!ex || typeof ex !== "object") return { chinese: "", pinyin: "", vietnamese: "" };
          const e = ex as Record<string, unknown>;
          return {
            chinese: typeof e.chinese === "string" ? e.chinese : "",
            pinyin: typeof e.pinyin === "string" ? e.pinyin : "",
            vietnamese: typeof e.vietnamese === "string" ? e.vietnamese : "",
          };
        })
      : [],
    radical: typeof item.radical === "string" ? item.radical : undefined,
    strokeCount: typeof item.strokeCount === "number" ? item.strokeCount : undefined,
    hskLevel: typeof item.hskLevel === "number" ? item.hskLevel : undefined,
    tags: Array.isArray(item.tags)
      ? item.tags.filter((t): t is string => typeof t === "string")
      : [],
  };
}

async function generateSingleSubBatch(chunkInputs: string[]): Promise<CardData[]> {
  await enforceRateLimit();
  const cleanInputs = chunkInputs.map(sanitizeInput);
  const wordList = cleanInputs.map((w, i) => `${i + 1}. "${w}"`).join("\n");

  const prompt = `Bạn là chuyên gia Hán-Việt. Phân tích chi tiết các từ tiếng Trung sau đây:
${wordList}

BẮT BUỘC VỀ TRƯỜNG "radical":
Trường "radical" BẮT BUỘC phải phân tích rõ ràng từng chữ Hán được ghép từ các bộ thủ chính nào, tên Hán-Việt và ý nghĩa của từng bộ thủ. KHÔNG ĐƯỢC bỏ trống hoặc trả về chung chung.
Ví dụ:
- "休": "Gồm bộ Nhân (亻 - người) + bộ Mộc (木 - cây). Người tựa vào gốc cây nghỉ ngơi."
- "语": "Gồm bộ Ngôn (讠 - lời nói) + bộ Ngũ (五) + bộ Khẩu (口 - miệng). Lời nói phát ra từ miệng."
- "好": "Gồm bộ Nữ (女 - phụ nữ) + bộ Tử (子 - con). Mẹ ôm con tượng trưng cho sự tốt đẹp."

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
    "radical": "tên bộ thủ và cấu tạo chiết tự đầy đủ",
    "strokeCount": 0,
    "hskLevel": 1,
    "tags": ["loại từ"]
  }
]`;

  try {
    const text = await generateWithFallback(prompt);
    const jsonText = extractCleanJson(text);
    const rawResults = JSON.parse(jsonText);
    if (!Array.isArray(rawResults) || rawResults.length !== chunkInputs.length) {
      throw new Error(
        `Expected ${chunkInputs.length} results, got ${Array.isArray(rawResults) ? rawResults.length : "non-array"}`,
      );
    }
    return rawResults.map(validateSingleCardData);
  } catch (err) {
    console.warn("[Gemini] Sub-batch failed, falling back to sequential calls:", err);
    const results: CardData[] = [];
    for (const input of chunkInputs) {
      results.push(await generateCardData(input));
    }
    return results;
  }
}

/**
 * Uses Gemini request batching with automatic sub-chunking (max 12 words per chunk) to generate card data for multiple words safely.
 * Handles rate-limiting and token limits gracefully.
 */
export async function generateCardDataBatch(inputs: string[]): Promise<CardData[]> {
  if (inputs.length === 0) return [];
  if (inputs.length === 1) return [await generateCardData(inputs[0])];

  const BATCH_CHUNK_SIZE = 12;
  const allResults: CardData[] = [];

  for (let i = 0; i < inputs.length; i += BATCH_CHUNK_SIZE) {
    const chunk = inputs.slice(i, i + BATCH_CHUNK_SIZE);
    const chunkResults = await generateSingleSubBatch(chunk);
    allResults.push(...chunkResults);
  }

  return allResults;
}

/**
 * Pure helper to filter out duplicate vocabulary cards:
 * 1. Deduplicates within the generated batch itself (e.g., if a word appears twice in an image/list).
 * 2. Deduplicates against all existing characters/traditional forms in the user's database.
 */
export function deduplicateCardsAgainstDatabase(
  generatedCards: CardData[],
  existingCharactersSet: Set<string>,
): {
  uniqueCards: CardData[];
  removedDuplicatesCount: number;
  removedDatabaseWords: string[];
} {
  const uniqueCards: CardData[] = [];
  const seenInBatch = new Set<string>();
  const removedDatabaseWords: string[] = [];
  let removedDuplicatesCount = 0;

  for (const card of generatedCards) {
    const cleanChar = (card.character || "").trim().toLowerCase();
    const cleanTrad = (card.traditional || "").trim().toLowerCase();
    if (!cleanChar) continue;

    // 1. Check if already in database (by simplified or traditional character)
    const isInDatabase =
      existingCharactersSet.has(cleanChar) ||
      (cleanTrad.length > 0 && existingCharactersSet.has(cleanTrad));

    if (isInDatabase) {
      removedDuplicatesCount++;
      if (!removedDatabaseWords.includes(card.character.trim())) {
        removedDatabaseWords.push(card.character.trim());
      }
      continue;
    }

    // 2. Check if already seen in the current batch
    if (seenInBatch.has(cleanChar) || (cleanTrad.length > 0 && seenInBatch.has(cleanTrad))) {
      continue;
    }

    seenInBatch.add(cleanChar);
    if (cleanTrad.length > 0) seenInBatch.add(cleanTrad);
    uniqueCards.push(card);
  }

  return {
    uniqueCards,
    removedDuplicatesCount,
    removedDatabaseWords,
  };
}

/**
 * Uses Gemini Multimodal Vision to analyze an image (textbook page, vocabulary list, handwritten notes,
 * menu, sign, screenshot, or real-world objects) and extract Chinese vocabulary cards.
 */
export async function generateCardsFromImage(
  base64Image: string,
  mimeType = "image/jpeg",
  userHint?: string,
): Promise<CardData[]> {
  await enforceRateLimit();

  const cleanBase64 = base64Image.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, "").trim();
  if (!cleanBase64) {
    throw new Error("Dữ liệu hình ảnh không hợp lệ.");
  }

  const hintInstruction =
    userHint && userHint.trim().length > 0
      ? `\nGHI CHÚ / YÊU CẦU TỪ NGƯỜI DÙNG: "${sanitizeInput(userHint)}"\nHãy ưu tiên thực hiện theo yêu cầu này khi trích xuất từ vựng.`
      : "";

  const prompt = `Bạn là chuyên gia sư phạm Hán-Việt và nhận diện hình ảnh (OCR & Vision).
Hãy phân tích hình ảnh được đính kèm và trích xuất danh sách từ vựng tiếng Trung quan trọng nhất (tối đa 15 từ vựng):
1. Nếu ảnh là trang sách giáo khoa, bảng từ vựng, ghi chú viết tay, biển báo, thực đơn, phụ đề phim hoặc văn bản tiếng Trung: hãy trích xuất các từ vựng tiếng Trung xuất hiện trong ảnh (loại bỏ các từ trùng lặp trong cùng bức ảnh).
2. Nếu ảnh là danh sách từ tiếng Việt/tiếng Anh hoặc chụp đồ vật/khung cảnh đời thực: hãy nhận diện và chuyển sang các từ vựng tiếng Trung tương ứng phù hợp nhất.${hintInstruction}

BẮT BUỘC VỀ TRƯỜNG "radical":
Trường "radical" ngắn gọn tối đa 2 câu: Câu 1 liệt kê bộ thủ cấu thành (tên Hán-Việt + ký tự + nghĩa). Câu 2 nêu mẹo nhớ hình ảnh.
Ví dụ: "好: bộ Nữ (女) + bộ Tử (子). Mẹ ôm con → tốt đẹp."

Trả về JSON array (CHỈ JSON array hợp lệ, không dùng markdown):
[
  {
    "character": "chữ giản thể",
    "traditional": "chữ phồn thể",
    "pinyin": "phiên âm có dấu",
    "hanviet": "âm Hán-Việt",
    "translation": "nghĩa tiếng Việt ngắn gọn (tối đa 3 nghĩa)",
    "examples": [
      {
        "chinese": "câu ví dụ ngắn",
        "pinyin": "phiên âm câu ví dụ",
        "vietnamese": "dịch nghĩa"
      }
    ],
    "radical": "tối đa 2 câu: bộ thủ + mẹo nhớ",
    "strokeCount": 0,
    "hskLevel": 1,
    "tags": ["Quét từ ảnh"]
  }
]`;

  const text = await generateVisionWithFallback(prompt, cleanBase64, mimeType || "image/jpeg");
  const jsonText = extractCleanJson(text);
  if (!jsonText) {
    throw new Error("AI không tìm thấy từ vựng hợp lệ trong bức ảnh này.");
  }

  const rawResults = JSON.parse(jsonText);
  const itemsArray = Array.isArray(rawResults) ? rawResults : [rawResults];
  return itemsArray
    .map(validateSingleCardData)
    .filter((card) => card.character && card.character.trim().length > 0);
}

/**
 * Uses Gemini Multimodal Vision to analyze multiple images (up to 5 images) at once and extract Chinese vocabulary cards.
 */
export async function generateCardsFromMultipleImages(
  images: { base64: string; mimeType: string }[],
  userHint?: string,
): Promise<CardData[]> {
  if (images.length === 0) return [];
  if (images.length === 1) {
    return generateCardsFromImage(images[0].base64, images[0].mimeType, userHint);
  }

  await enforceRateLimit();

  const formattedImages = images.map((img) => ({
    data: img.base64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, "").trim(),
    mimeType: img.mimeType || "image/jpeg",
  }));

  const hintInstruction =
    userHint && userHint.trim().length > 0
      ? `\nGHI CHÚ / YÊU CẦU TỪ NGƯỜI DÙNG: "${sanitizeInput(userHint)}"\nHãy ưu tiên thực hiện theo yêu cầu này khi trích xuất từ vựng.`
      : "";

  const prompt = `Bạn là chuyên gia sư phạm Hán-Việt và nhận diện hình ảnh (OCR & Vision).
Người dùng đã tải lên ${images.length} hình ảnh (tối đa 5 ảnh).
Hãy phân tích TẤT CẢ các bức ảnh được đính kèm và trích xuất danh sách từ vựng tiếng Trung quan trọng nhất (tối đa 25 từ vựng):
1. Nếu ảnh là trang sách giáo khoa, bảng từ vựng, ghi chú viết tay, biển báo, thực đơn, phụ đề phim hoặc văn bản tiếng Trung: hãy trích xuất các từ vựng tiếng Trung xuất hiện trong tất cả các ảnh (tự động loại bỏ các từ trùng lặp giữa các ảnh).
2. Nếu ảnh là danh sách từ tiếng Việt/tiếng Anh hoặc chụp đồ vật/khung cảnh đời thực: hãy nhận diện và chuyển sang các từ vựng tiếng Trung tương ứng phù hợp nhất.${hintInstruction}

BẮT BUỘC VỀ TRƯỜNG "radical":
Trường "radical" ngắn gọn tối đa 2 câu: Câu 1 liệt kê bộ thủ cấu thành (tên Hán-Việt + ký tự + nghĩa). Câu 2 nêu mẹo nhớ hình ảnh.
Ví dụ: "好: bộ Nữ (女) + bộ Tử (子). Mẹ ôm con → tốt đẹp."

Trả về JSON array (CHỈ JSON array hợp lệ, không dùng markdown):
[
  {
    "character": "chữ giản thể",
    "traditional": "chữ phồn thể",
    "pinyin": "phiên âm có dấu",
    "hanviet": "âm Hán-Việt",
    "translation": "nghĩa tiếng Việt ngắn gọn (tối đa 3 nghĩa)",
    "examples": [
      {
        "chinese": "câu ví dụ ngắn",
        "pinyin": "phiên âm câu ví dụ",
        "vietnamese": "dịch nghĩa"
      }
    ],
    "radical": "tối đa 2 câu: bộ thủ + mẹo nhớ",
    "strokeCount": 0,
    "hskLevel": 1,
    "tags": ["Quét từ ảnh"]
  }
]`;

  const text = await generateMultiVisionWithFallback(prompt, formattedImages);
  const jsonText = extractCleanJson(text);
  if (!jsonText) {
    throw new Error("AI không tìm thấy từ vựng hợp lệ trong các bức ảnh này.");
  }

  const rawResults = JSON.parse(jsonText);
  const itemsArray = Array.isArray(rawResults) ? rawResults : [rawResults];
  return itemsArray
    .map(validateSingleCardData)
    .filter((card) => card.character && card.character.trim().length > 0);
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

  const text = await generateWithFallback(prompt);
  const jsonText = extractCleanJson(text);
  if (!jsonText) {
    throw new Error("AI không phản hồi dữ liệu JSON hợp lệ.");
  }
  return JSON.parse(jsonText);
}

/**
 * Generates radical/component breakdown analysis for a single Chinese character or word via Gemini AI.
 * Returns clean plain-text Vietnamese — no markdown, no JSON.
 */
export async function generateRadical(character: string): Promise<string> {
  const clean = sanitizeInput(character);
  const prompt = `Phân tích chiết tự từ "${clean}" bằng tiếng Việt, ngắn gọn tối đa 2 câu.
Câu 1: liệt kê bộ thủ (tên Hán-Việt + ký tự + nghĩa). Câu 2: mẹo nhớ hình ảnh.
Không dùng markdown, không giải thích thêm, không chào hỏi.
Ví dụ tốt: "好: bộ Nữ (女) + bộ Tử (子). Mẹ ôm con → tốt đẹp."
Ví dụ tốt: "学: bộ Học (學) gồm 宀+子, trẻ con ngồi dưới mái học bài → học tập."
Phân tích từ: "${clean}"`;

  const raw = await generateWithFallbackText(prompt);
  return cleanRadicalText(raw);
}

/**
 * Strips all markdown and formatting artifacts from AI plain-text output.
 */
function cleanRadicalText(raw: string): string {
  return raw
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[*_]{1,3}(.*?)[*_]{1,3}/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[\-\*•]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/<[^>]+>/g, "")
    .replace(/^[\s\-=_]{3,}$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export interface AIQuizItem {
  character: string;
  prompt: string;
  clozeSentence: string;
  clozeTranslation: string;
  options: string[];
  correctAnswer: string;
}

/**
 * Uses Gemini to generate dynamic context-based quiz questions from a batch of user cards.
 */
export async function generateAIQuizBatch(cards: CardData[]): Promise<AIQuizItem[]> {
  if (!cards || cards.length === 0) return [];
  await enforceRateLimit();

  const cardList = cards
    .slice(0, 8)
    .map((c, i) => `${i + 1}. "${c.character}" (${c.pinyin}): ${c.translation}`)
    .join("\n");

  const prompt = `Bạn là chuyên gia sư phạm Tiếng Trung. Dưới đây là các từ vựng trong bộ thẻ của học viên:
${cardList}

Hãy tạo ra một bộ câu hỏi trắc nghiệm điền từ vào câu thực tế hoặc tình huống giao tiếp đời sống (mỗi từ tạo 1 câu, tối đa 6 câu).
Trong câu chữ Hán, hãy thay thế từ vựng đó bằng "（___）".
Options gồm 4 lựa chọn (chữ Hán), trong đó có 1 đáp án đúng và 3 phương án gây nhiễu hợp lý.

Trả về JSON array (CHỈ JSON array, không markdown):
[
  {
    "character": "từ vựng mục tiêu",
    "prompt": "Điền từ thích hợp vào ngữ cảnh câu:",
    "clozeSentence": "câu có chứa （___）",
    "clozeTranslation": "bản dịch tiếng Việt của cả câu",
    "options": ["đáp án 1", "đáp án 2", "đáp án 3", "đáp án 4"],
    "correctAnswer": "từ vựng mục tiêu"
  }
]`;

  try {
    const text = await generateWithFallback(prompt);
    const jsonText = extractCleanJson(text);
    const parsed = JSON.parse(jsonText);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => ({
        character: String(item.character || ""),
        prompt: String(item.prompt || "Điền từ thích hợp vào ngữ cảnh câu:"),
        clozeSentence: String(item.clozeSentence || ""),
        clozeTranslation: String(item.clozeTranslation || ""),
        options: Array.isArray(item.options) ? item.options.map(String) : [],
        correctAnswer: String(item.correctAnswer || item.character || ""),
      }));
    }
    return [];
  } catch (err) {
    console.warn("[Gemini] Failed to generate dynamic AI quiz batch:", err);
    return [];
  }
}

export interface SpeechEvaluationResult {
  transcript: string;
  errorDetail?: string;
  pronunciationTip?: string;
}

/**
 * Uses Gemini Multimodal Audio with automatic multi-model fallback to transcribe
 * and evaluate Chinese pronunciation from a base64 audio recording.
 */
export async function evaluateChineseSpeechAudio(
  base64Audio: string,
  targetHanzi: string,
  targetPinyin: string,
  targetMeaning?: string,
  mimeType = "audio/m4a",
): Promise<SpeechEvaluationResult> {
  await enforceRateLimit();

  const cleanAudio = base64Audio.trim();
  if (!cleanAudio) {
    return { transcript: "" };
  }

  const prompt = `Bạn là trợ lý AI chuyên gia phân tích và chấm điểm phát âm Tiếng Trung (Mandarin).
Nội dung chuẩn mục tiêu là:
- Hán tự: "${sanitizeInput(targetHanzi)}"
- Pinyin chuẩn: "${sanitizeInput(targetPinyin)}"${targetMeaning ? `\n- Nghĩa Tiếng Việt: "${sanitizeInput(targetMeaning)}"` : ""}

NHIỆM VỤ:
1. Nghe kỹ file âm thanh thu âm của người dùng.
2. Trích xuất chính xác văn bản Tiếng Trung hoặc Pinyin mà người dùng đã đọc (transcript).
3. Nếu người dùng đọc sai thanh điệu, sai âm đầu (initials) hoặc vận mẫu (finals), hãy chỉ rõ lỗi sai ngắn gọn trong "errorDetail".
4. Đưa ra 1 mẹo phát âm cực kỳ dễ hiểu bằng Tiếng Việt trong "pronunciationTip" giúp họ phát âm chuẩn "${sanitizeInput(targetHanzi)}" (${sanitizeInput(targetPinyin)}).

TRẢ VỀ DUY NHẤT FORMAT JSON SAU (Không thêm text thừa):
{
  "transcript": "<văn bản hoặc pinyin AI nghe được từ thu âm>",
  "errorDetail": "<phân tích lỗi sai cụ thể nếu có>",
  "pronunciationTip": "<mẹo phát âm ngắn gọn bằng Tiếng Việt>"
}`;

  const rawText = await generateWithModels(prompt, "application/json", 0.1, {
    data: cleanAudio,
    mimeType,
  });
  const jsonText = extractCleanJson(rawText);
  if (!jsonText) {
    return { transcript: "" };
  }
  const parsed = JSON.parse(jsonText) as Record<string, unknown>;
  return {
    transcript: typeof parsed.transcript === "string" ? parsed.transcript.trim() : "",
    errorDetail: typeof parsed.errorDetail === "string" ? parsed.errorDetail.trim() : undefined,
    pronunciationTip:
      typeof parsed.pronunciationTip === "string" ? parsed.pronunciationTip.trim() : undefined,
  };
}
